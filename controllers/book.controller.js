const { useTransaction, logger } = require('@coko/server')
const keys = require('lodash/keys')
const map = require('lodash/map')
const find = require('lodash/find')
const findIndex = require('lodash/findIndex')
const assign = require('lodash/assign')
const omitBy = require('lodash/omitBy')
const isNil = require('lodash/isNil')
const config = require('config')
const BPromise = require('bluebird')

const exporter = require('./utilities/exporter')
const { bookComponentCreator } = require('./utilities/createBookComponent')

const {
  bookComponentContentCreator,
} = require('./utilities/bookComponentContentCreator')

const {
  Book,
  BookTranslation,
  BookComponentState,
  BookComponent,
  Division,
  BookComponentTranslation,
  User,
  Team,
  TeamMember,
} = require('../models').models

const {
  getApplicationParameters,
} = require('./applicationParameter.controller')

const { createDivision } = require('./division.controller')
const { createTeam, getEntityTeams, deleteTeam } = require('./team.controller')

const toCamelCase = string =>
  string
    .split(/[^a-zA-Z0-9]/g)
    .map((x, index) => {
      if (index === 0) {
        return x.toLowerCase()
      }

      return x.substr(0, 1).toUpperCase() + x.substr(1).toLowerCase()
    })
    .join('')

const defaultLevelOneItem = {
  type: 'part',
  displayName: 'Part',
  contentStructure: [],
}

const defaultLevelTwoItem = {
  type: 'chapter',
  displayName: 'Chapter',
  contentStructure: [],
}

const defaultLevelThreeItem = {
  type: 'section',
  displayName: 'Section',
  contentStructure: [{ type: 'mainContent', displayName: 'Main Content' }],
}

const defaultLevelCloserItem = {
  type: 'chapterCloser',
  displayName: 'Chapter Closer',
  contentStructure: [],
}

const defaultBookStructure = {
  levels: [],
  outline: [],
  finalized: false,
}

const getBook = async (id, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching book with id ${id}`)

    const book = await useTransaction(
      async tr => Book.query(tr).where({ id, deleted: false }),
      { trx, passedTrxOnly: true },
    )

    if (book.length === 0) {
      throw new Error(`book with id: ${id} does not exist`)
    }

    return book[0]
  } catch (e) {
    throw new Error(e)
  }
}

const getBooks = async (collectionId, archived, userId, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching books for collection with id ${collectionId}`)
    return useTransaction(
      async tr => {
        const user = await User.query(tr).findById(userId)

        const globalProductionEditorsTeam = await Team.query(tr).where({
          global: true,
          role: 'productionEditor',
        })

        const teamMembers = await TeamMember.query(tr).where({
          teamId: globalProductionEditorsTeam[0].id,
          deleted: false,
        })

        const isGlobalProductionEditor = find(teamMembers, { userId })
        const isAdmin = user.admin

        if (isAdmin || isGlobalProductionEditor) {
          if (!archived) {
            return Book.query(tr).where({
              collectionId,
              deleted: false,
              archived: false,
            })
          }

          return Book.query(tr).where({
            collectionId,
            deleted: false,
          })
        }

        if (!archived) {
          return Book.query(tr)
            .leftJoin('teams', 'book.id', 'teams.object_id')
            .leftJoin('team_members', 'teams.id', 'team_members.team_id')
            .leftJoin('users', 'team_members.user_id', 'users.id')
            .distinctOn('book.id')
            .where({
              'book.collection_id': collectionId,
              'book.deleted': false,
              'book.archived': false,
              'users.id': userId,
            })
        }

        return Book.query(tr)
          .leftJoin('teams', 'book.id', 'teams.object_id')
          .leftJoin('team_members', 'teams.id', 'team_members.team_id')
          .leftJoin('users', 'team_members.user_id', 'users.id')
          .distinctOn('book.id')
          .where({
            'book.collection_id': collectionId,
            'book.deleted': false,
            'users.id': userId,
          })
          .andWhere({ 'users.id': userId })
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const createBook = async (collectionId, title, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const newBookData = { collectionId }

        if (
          config.has('featureBookStructure') &&
          ((config.get('featureBookStructure') &&
            JSON.parse(config.get('featureBookStructure'))) ||
            false)
        ) {
          logger.info(`>>> creating default book structure for the new book`)

          newBookData.bookStructure = defaultBookStructure
        }

        const newBook = await Book.query(tr).insert(newBookData)

        const { id: bookId } = newBook

        logger.info(`>>> new book created with id ${bookId}`)

        await BookTranslation.query(tr).insert({
          bookId,
          title,
          languageIso: 'en',
        })

        logger.info(
          `>>> new book translation (title: ${title}) created for the book with id ${bookId}`,
        )

        const { config: divisions } = await getApplicationParameters(
          'bookBuilder',
          'divisions',
          {
            trx: tr,
          },
        )

        let createdDivisionIds
        let divisionData

        if (divisions.length === 0) {
          divisionData = {
            bookId,
            bookComponents: [],
            label: 'Body',
          }

          const division = await createDivision(divisionData, {
            trx: tr,
          })

          createdDivisionIds = [division.id]
        } else {
          const createdDivisions = await Promise.all(
            divisions.map(async division => {
              divisionData = {
                bookId,
                bookComponents: [],
                label: division.name,
              }
              return createDivision(divisionData, {
                trx: tr,
              })
            }),
          )

          createdDivisionIds = createdDivisions.map(d => d.id)
        }

        await Book.query(tr)
          .patch({ divisions: createdDivisionIds })
          .where({ id: bookId })

        logger.info(`>>> book with id ${bookId} patched with the new divisions`)

        logger.info(`>>> creating teams for book with id ${bookId}`)

        const roles = keys(config.authsome.teams)
        await Promise.all(
          map(roles, async role =>
            createTeam(
              config.authsome.teams[role].name,
              bookId,
              'book',
              role,
              false,
              {
                trx: tr,
              },
            ),
          ),
        )

        logger.info(`>>> creating TOC component for the book with id ${bookId}`)

        const workflowConfig = await getApplicationParameters(
          'bookBuilder',
          'stages',
          {
            trx: tr,
          },
        )

        const { config: workflowStages } = workflowConfig

        let bookComponentWorkflowStages

        const division = await Division.query(tr)
          .where({ bookId, label: 'Frontmatter' })
          .andWhere({ deleted: false })

        logger.info(
          `>>> division which will hold the TOC found with id ${division[0].id}`,
        )

        const newBookComponent = {
          bookId,
          componentType: 'toc',
          divisionId: division[0].id,
          pagination: {
            left: false,
            right: true,
          },
          archived: false,
          deleted: false,
        }

        const createdBookComponent = await BookComponent.query(tr).insert(
          newBookComponent,
        )

        logger.info(
          `>>> new book component (TOC) created with id ${createdBookComponent.id}`,
        )

        const translation = await BookComponentTranslation.query(tr).insert({
          bookComponentId: createdBookComponent.id,
          languageIso: 'en',
          title: 'Table of Contents',
        })

        logger.info(
          `>>> new book component translation for TOC created with id ${translation.id}`,
        )

        const newBookComponents = division[0].bookComponents

        newBookComponents.push(createdBookComponent.id)

        const updatedDivision = await Division.query(tr).patchAndFetchById(
          division[0].id,
          {
            bookComponents: newBookComponents,
          },
        )

        logger.info(
          `>>> book component TOC pushed to the array of division's book components [${updatedDivision.bookComponents}]`,
        )

        if (workflowStages) {
          bookComponentWorkflowStages = {
            workflowStages: map(workflowStages, stage => ({
              type: stage.type,
              label: stage.title,
              value: -1,
            })),
          }
        }

        await BookComponentState.query(tr).insert(
          assign(
            {},
            {
              bookComponentId: createdBookComponent.id,
              trackChangesEnabled: false,
              uploading: false,
              includeInToc: false,
            },
            bookComponentWorkflowStages,
          ),
        )

        return newBook
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const renameBook = async (bookId, title, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const bookTranslation = await BookTranslation.query(tr)
          .where('bookId', bookId)
          .andWhere('languageIso', 'en')

        await BookTranslation.query(tr)
          .patch({ title })
          .where({ id: bookTranslation[0].id })

        logger.info(`>>> title updated for book with id ${bookId}`)
        const book = await Book.query(tr).where({ id: bookId, deleted: false })
        return book[0]
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const deleteBook = async (bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const deletedBook = await Book.query(tr).patchAndFetchById(bookId, {
          deleted: true,
        })

        logger.info(`>>> book with id ${bookId} deleted`)

        const associatedBookComponents = await BookComponent.query(tr).where(
          'bookId',
          bookId,
        )

        if (associatedBookComponents.length > 0) {
          await Promise.all(
            map(associatedBookComponents, async bookComponent => {
              await BookComponent.query(tr).patchAndFetchById(
                bookComponent.id,
                {
                  deleted: true,
                },
              )
              logger.info(
                `>>> associated book component with id ${bookComponent.id} deleted`,
              )
            }),
          )
        }

        const associatedDivisions = await Division.query(tr).where(
          'bookId',
          deletedBook.id,
        )

        await Promise.all(
          map(associatedDivisions, async division => {
            const updatedDivision = await Division.query(tr).patchAndFetchById(
              division.id,
              {
                bookComponents: [],
                deleted: true,
              },
            )

            logger.info(
              `>>> associated division with id ${division.id} deleted`,
            )
            logger.info(
              `>>> corresponding division's book components [${updatedDivision.bookComponents}] cleaned`,
            )
          }),
        )

        const associatedTeams = await getEntityTeams(bookId, 'book', false, {
          trx: tr,
        })

        if (associatedTeams.length > 0) {
          await Promise.all(
            map(associatedTeams, async team =>
              deleteTeam(team.id, { trx: tr }),
            ),
          )
        }

        return deletedBook
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const archiveBook = async (bookId, archive, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const archivedBook = await Book.query(tr).patchAndFetchById(bookId, {
          archived: archive,
        })

        logger.info(`>>> book with id ${archivedBook.id} archived`)

        const associatedBookComponents = await BookComponent.query(tr).where(
          'bookId',
          bookId,
        )

        if (associatedBookComponents.length > 0) {
          await Promise.all(
            map(associatedBookComponents, async bookComponent => {
              await BookComponent.query(tr).patchAndFetchById(
                bookComponent.id,
                {
                  archived: archive,
                },
              )
              logger.info(
                `>>> associated book component with id ${bookComponent.id} archived`,
              )
            }),
          )
        }

        return archivedBook
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateMetadata = async (metadata, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const clean = omitBy(metadata, isNil)

        const { id, ...rest } = clean

        const updatedBook = await Book.query(tr).patchAndFetchById(id, {
          ...rest,
        })

        logger.info(`>>> book with id ${updatedBook.id} has new metadata`)

        return updatedBook
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const exportBook = async (
  bookId,
  mode,
  templateId,
  previewer,
  fileExtension,
  icmlNotes,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr =>
        exporter(bookId, mode, templateId, previewer, fileExtension, icmlNotes),
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateRunningHeaders = async (bookComponents, bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        await Promise.all(
          map(bookComponents, async bookComponent => {
            const { id } = bookComponent

            const bookComponentState = await BookComponentState.query(tr).where(
              'bookComponentId',
              id,
            )

            return BookComponentState.query(tr).patchAndFetchById(
              bookComponentState[0].id,
              {
                runningHeadersRight: bookComponent.runningHeadersRight,
                runningHeadersLeft: bookComponent.runningHeadersLeft,
              },
            )
          }),
        )

        logger.info(`>>> running headers updated for book with id ${bookId}`)

        const book = await Book.query(tr).where({ id: bookId, deleted: false })

        return book[0]
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

// should be removed as functionality omitted
const changeLevelLabel = async (bookId, levelId, label, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.query(tr).findById(bookId)
        const clonedBookStructure = { ...book.bookStructure }

        const levelIndex = findIndex(clonedBookStructure.levels, {
          id: levelId,
        })

        clonedBookStructure.levels[levelIndex].displayName = label
        clonedBookStructure.levels[levelIndex].type = toCamelCase(label)

        // For the case of level two closers
        if (clonedBookStructure.levels.length === 4) {
          if (levelIndex === 1) {
            clonedBookStructure.levels[3].displayName = `${label} Closer`
            clonedBookStructure.levels[3].type = `${toCamelCase(label)}Closer`
          }
        }

        // if existing outline info then update the type based on changed label
        if (clonedBookStructure.outline.length > 0) {
          clonedBookStructure.outline.forEach(levelOneComponent => {
            /* eslint-disable no-param-reassign */
            if (levelIndex === 0) {
              levelOneComponent.type = toCamelCase(label)
            } else {
              levelOneComponent.children.forEach(levelTwoComponent => {
                if (levelIndex === 1) {
                  levelTwoComponent.type = toCamelCase(label)
                } else {
                  levelTwoComponent.children.forEach(levelThreeComponent => {
                    if (levelIndex === 2) {
                      levelThreeComponent.type = toCamelCase(label)
                    }
                  })
                  /* eslint-enable no-param-reassign */
                }
              })
            }
          })
        }

        await Book.query(tr).patchAndFetchById(bookId, {
          bookStructure: clonedBookStructure,
        })

        logger.info(`>>> level label changed for book with id ${bookId}`)

        return clonedBookStructure.levels[levelIndex]
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const changeNumberOfLevels = async (bookId, levelsNumber, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.query(tr).findById(bookId)
        const clonedBookStructure = { ...book.bookStructure }

        const currentBookLevels =
          clonedBookStructure.levels.length === 0
            ? 0
            : clonedBookStructure.levels.length - 2 // minus 2 because section will always be present as well as closers

        if (currentBookLevels === levelsNumber) {
          return clonedBookStructure.levels
        }

        if (levelsNumber === 1) {
          clonedBookStructure.levels = []
          clonedBookStructure.levels.push(
            defaultLevelTwoItem,
            defaultLevelThreeItem,
            defaultLevelCloserItem,
          )

          clonedBookStructure.outline = [
            {
              title: undefined,
              type: 'chapter',
              children: [{ title: undefined, type: 'section', children: [] }],
            },
          ]
        }

        if (levelsNumber === 2) {
          clonedBookStructure.levels = []
          clonedBookStructure.levels.push(
            defaultLevelOneItem,
            defaultLevelTwoItem,
            defaultLevelThreeItem,
            defaultLevelCloserItem,
          )

          // ADD LEVEL THREE OUTLINE ITEMS
          clonedBookStructure.outline = [
            {
              title: undefined,
              type: 'part',
              children: [
                {
                  title: undefined,
                  type: 'chapter',
                  children: [
                    { title: undefined, type: 'section', children: [] },
                  ],
                },
              ],
            },
          ]
        }

        await Book.query(tr).patchAndFetchById(bookId, {
          bookStructure: clonedBookStructure,
        })

        logger.info(`>>> number of levels changed for book with id ${bookId}`)
        return clonedBookStructure.levels
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateBookOutline = async (bookId, outline, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.query(tr).findById(bookId)

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        clonedBookStructure.outline = outline

        const updatedBook = await Book.query(tr).patchAndFetchById(bookId, {
          bookStructure: clonedBookStructure,
        })

        logger.info(`>>> outline changed for book with id ${bookId}`)

        return updatedBook.bookStructure
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateLevelContentStructure = async (bookId, levels, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.query(tr).findById(bookId)

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        clonedBookStructure.levels = levels

        const updatedBook = await Book.query(tr).patchAndFetchById(bookId, {
          bookStructure: clonedBookStructure,
        })

        logger.info(`>>> level changed for book with id ${bookId}`)

        return updatedBook.bookStructure.levels
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const finalizeBookStructure = async (bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.query(tr).findById(bookId)

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        const workflowConfig = await getApplicationParameters(
          'bookBuilder',
          'stages',
          {
            trx: tr,
          },
        )

        const { config: workflowStages } = workflowConfig

        // find book's body division to append book components declared in bookStructure outline
        const bodyDivision = await Division.query(tr).findOne({
          bookId,
          label: 'Body',
          deleted: false,
        })

        const newDivisionBookComponents = JSON.parse(
          JSON.stringify(bodyDivision.bookComponents),
        )

        await BPromise.mapSeries(
          clonedBookStructure.outline,
          async (outlineItem, levelOneIndex) => {
            if (clonedBookStructure.levels.length === 3) {
              newDivisionBookComponents.push(outlineItem.id)

              const bookComponentLevelOne = await bookComponentCreator(
                book.id,
                outlineItem.type,
                bodyDivision.id,
                outlineItem.title,
                workflowStages,
                { trx: tr, bookComponentId: outlineItem.id },
              )

              return bookComponentContentCreator(
                bookComponentLevelOne,
                outlineItem.title,
                book.bookStructure,
                0,
                { levelOneIndex },
                { trx: tr },
              )
            }

            if (clonedBookStructure.levels.length === 4) {
              newDivisionBookComponents.push(outlineItem.id)

              const bookComponentLevelOne = await bookComponentCreator(
                book.id,
                outlineItem.type,
                bodyDivision.id,
                outlineItem.title,
                workflowStages,
                { trx: tr, bookComponentId: outlineItem.id },
              )

              await bookComponentContentCreator(
                bookComponentLevelOne,
                outlineItem.title,
                book.bookStructure,
                0,
                {},
                { trx: tr },
              )

              return BPromise.mapSeries(
                outlineItem.children,
                async (levelTwoItem, levelTwoIndex) => {
                  newDivisionBookComponents.push(levelTwoItem.id)

                  const bookComponentLevelTwo = await bookComponentCreator(
                    book.id,
                    levelTwoItem.type,
                    bodyDivision.id,
                    levelTwoItem.title,
                    workflowStages,
                    { trx: tr, bookComponentId: levelTwoItem.id },
                  )

                  return bookComponentContentCreator(
                    bookComponentLevelTwo,
                    levelTwoItem.title,
                    book.bookStructure,
                    1,
                    { levelOneIndex, levelTwoIndex },
                    { trx: tr },
                  )
                },
              )
              // }
            }

            return false
          },
        )

        await Division.query(tr).patchAndFetchById(bodyDivision.id, {
          bookComponents: newDivisionBookComponents,
        })

        clonedBookStructure.finalized = true

        const updatedBook = await Book.query(tr).patchAndFetchById(bookId, {
          bookStructure: clonedBookStructure,
        })

        logger.info(`>>> book structure finalized  for book with id ${bookId}`)

        return updatedBook
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateShowWelcome = async (bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.query(tr).findById(bookId)

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        clonedBookStructure.showWelcome = false

        const updatedBook = await Book.query(tr).patchAndFetchById(bookId, {
          bookStructure: clonedBookStructure,
        })

        logger.info(
          `>>> book structure initialized and set show welcome to false for book with id ${bookId}`,
        )

        return updatedBook
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  getBook,
  getBooks,
  archiveBook,
  createBook,
  renameBook,
  deleteBook,
  exportBook,
  updateMetadata,
  updateRunningHeaders,
  changeLevelLabel,
  changeNumberOfLevels,
  updateBookOutline,
  updateLevelContentStructure,
  updateShowWelcome,
  finalizeBookStructure,
}
