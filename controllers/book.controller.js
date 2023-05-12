const { useTransaction, logger } = require('@coko/server')
const map = require('lodash/map')
const findIndex = require('lodash/findIndex')
const assign = require('lodash/assign')
const omitBy = require('lodash/omitBy')
const isNil = require('lodash/isNil')
const config = require('config')
const BPromise = require('bluebird')

const {
  getObjectTeams,
  updateTeamMembership,
} = require('@coko/server/src/models/team/team.controller')

const { Team, TeamMember } = require('@coko/server/src/models')

const {
  labels: { BOOK_CONTROLLER },
} = require('./constants')

const exporter = require('./helpers/exporter')
const bookComponentCreator = require('./helpers/createBookComponent')
const bookComponentContentCreator = require('./helpers/bookComponentContentCreator')

const {
  Book,
  BookTranslation,
  BookComponentState,
  BookComponent,
  Division,
  BookComponentTranslation,
} = require('../models').models

const {
  getApplicationParameters,
} = require('./applicationParameter.controller')

const { createDivision } = require('./division.controller')

const { createTeam, getObjectTeam, deleteTeam } = require('./team.controller')

const { isGlobal, isAdmin } = require('./user.controller')
const { find } = require('lodash')

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
    logger.info(`${BOOK_CONTROLLER} getBook: fetching book with id ${id}`)

    const book = await useTransaction(
      async tr => Book.findOne({ id, deleted: false }, { trx: tr }),
      { trx, passedTrxOnly: true },
    )

    if (!book) {
      throw new Error(`book with id: ${id} does not exist`)
    }

    return book
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} getBook: ${e.message}`)
    throw new Error(e)
  }
}

const getBooks = async (collectionId, archived, userId, options = {}) => {
  try {
    const { pageSize, page, orderBy, ascending, trx } = options
    logger.info(
      `${BOOK_CONTROLLER} getBooks: fetching books for user with id ${userId}`,
    )
    return useTransaction(
      async tr => {
        const globalProductionEditorsTeam = await Team.findGlobalTeamByRole(
          'productionEditor',
          { trx: tr },
        )

        const { result: teamMembers } = await TeamMember.find(
          {
            teamId: globalProductionEditorsTeam.id,
          },
          { trx: tr },
        )

        const isGlobalProductionEditor = find(teamMembers, { userId })
        const isUserAdmin = await isAdmin(userId)

        if (isUserAdmin || isGlobalProductionEditor) {
          if (!archived) {
            const { result } = await Book.find(
              {
                collectionId,
                deleted: false,
                archived: false,
              },
              { trx: tr },
            )

            return result
          }

          const { result } = await Book.find(
            {
              collectionId,
              deleted: false,
            },
            { trx: tr },
          )

          return result
        }

        return Book.filterBooks(collectionId, archived, userId, {
          orderBy,
          ascending,
          page,
          pageSize,
          trx: tr,
        })
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} getBooks: ${e.message}`)
    throw new Error(e)
  }
}

const createBook = async (data = {}) => {
  try {
    const { collectionId, title, options } = data

    let trx
    let addUserToBookTeams
    let userId

    if (options) {
      trx = options.trx
      addUserToBookTeams = options.addUserToBookTeams
      userId = options.userId
    }

    return useTransaction(
      async tr => {
        const newBookData = {}

        if (collectionId) {
          newBookData.collectionId = collectionId
        }

        if (
          config.has('featureBookStructure') &&
          ((config.get('featureBookStructure') &&
            JSON.parse(config.get('featureBookStructure'))) ||
            false)
        ) {
          logger.info(
            `${BOOK_CONTROLLER} createBook: creating default book structure for the new book`,
          )

          newBookData.bookStructure = defaultBookStructure
        }

        const newBook = await Book.insert(newBookData, { trx: tr })

        const { id: bookId } = newBook

        logger.info(
          `${BOOK_CONTROLLER} createBook: new book created with id ${bookId}`,
        )

        if (title) {
          await BookTranslation.insert(
            {
              bookId,
              title,
              languageIso: 'en',
            },
            { trx: tr },
          )

          logger.info(
            `${BOOK_CONTROLLER} createBook: new book translation (title: ${title}) created for the book with id ${bookId}`,
          )
        } else {
          await BookTranslation.insert(
            {
              bookId,
              languageIso: 'en',
            },
            { trx: tr },
          )

          logger.info(
            `${BOOK_CONTROLLER} createBook: new book translation placeholder created for the book with id ${bookId}`,
          )
        }

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

        logger.info(
          `${BOOK_CONTROLLER} createBook: book with id ${bookId} patched with the new divisions`,
        )

        if (!config.has('teams.nonGlobal')) {
          logger.info(
            `${BOOK_CONTROLLER} createBook: You haven't declared any teams  in config`,
          )
        } else {
          logger.info(
            `${BOOK_CONTROLLER} createBook: creating teams for book with id ${bookId}`,
          )
          const configNonGlobalTeams = config.get('teams.nonGlobal')

          await Promise.all(
            Object.keys(configNonGlobalTeams).map(async k => {
              const teamData = configNonGlobalTeams[k]

              const exists = await getObjectTeam(teamData.role, bookId, false, {
                trx: tr,
              })

              if (exists) {
                logger.info(
                  `${BOOK_CONTROLLER} createBook: Team "${teamData.role}" already exists for book with id ${bookId}`,
                )
                return
              }

              const createdTeam = await createTeam(
                teamData.displayName,
                bookId,
                'book',
                teamData.role,
                false,
                {
                  trx: tr,
                },
              )

              logger.info(
                `${BOOK_CONTROLLER} createBook: Added team "${teamData.role}" for book with id ${bookId}`,
              )

              if (findIndex(addUserToBookTeams, createTeam.role) !== -1) {
                if (!userId) {
                  throw new Error(
                    'userId should be provided if addUserToBookTeams is used',
                  )
                }

                logger.info(
                  `${BOOK_CONTROLLER} createBook: Adding book creator as member of team "${createdTeam.displayName}" for book with id ${bookId}`,
                )
                await updateTeamMembership(createdTeam.id, [userId], {
                  trx: tr,
                })
              }
            }),
          )
        }

        logger.info(
          `${BOOK_CONTROLLER} createBook: creating TOC component for the book with id ${bookId}`,
        )

        const workflowConfig = await getApplicationParameters(
          'bookBuilder',
          'stages',
          {
            trx: tr,
          },
        )

        const { config: workflowStages } = workflowConfig

        let bookComponentWorkflowStages

        const division = await Division.findOne(
          { bookId, label: 'Frontmatter', deleted: false },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} createBook: division which will hold the TOC found with id ${division.id}`,
        )

        const newBookComponent = {
          bookId,
          componentType: 'toc',
          divisionId: division.id,
          pagination: {
            left: false,
            right: true,
          },
          archived: false,
          deleted: false,
        }

        const createdBookComponent = await BookComponent.insert(
          newBookComponent,
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} createBook: new book component (TOC) created with id ${createdBookComponent.id}`,
        )

        const translation = await BookComponentTranslation.insert(
          {
            bookComponentId: createdBookComponent.id,
            languageIso: 'en',
            title: 'Table of Contents',
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} createBook: new book component translation for TOC created with id ${translation.id}`,
        )

        const newBookComponents = division.bookComponents

        newBookComponents.push(createdBookComponent.id)

        const updatedDivision = await Division.patchAndFetchById(
          division.id,
          {
            bookComponents: newBookComponents,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} createBook: book component TOC pushed to the array of division's book components [${updatedDivision.bookComponents}]`,
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

        await BookComponentState.insert(
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
          { trx: tr },
        )

        return newBook
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} createBook: ${e.message}`)
    throw new Error(e)
  }
}

const renameBook = async (bookId, title, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const bookTranslation = await BookTranslation.findOne(
          { bookId, languageIso: 'en' },
          { trx: tr },
        )

        await BookTranslation.query(tr)
          .patch({ title })
          .where({ id: bookTranslation.id })

        logger.info(
          `${BOOK_CONTROLLER} renameBook: title updated for book with id ${bookId}`,
        )

        const book = await Book.findOne(
          { id: bookId, deleted: false },
          { trx: tr },
        )

        return book
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} renameBook: ${e.message}`)
    throw new Error(e)
  }
}

const deleteBook = async (bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const deletedBook = await Book.patchAndFetchById(
          bookId,
          {
            deleted: true,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} deleteBook: book with id ${bookId} deleted`,
        )

        const { result: associatedBookComponents } = await BookComponent.find(
          { bookId },
          { trx: tr },
        )

        if (associatedBookComponents.length > 0) {
          await Promise.all(
            map(associatedBookComponents, async bookComponent => {
              await BookComponent.patchAndFetchById(
                bookComponent.id,
                {
                  deleted: true,
                },
                { trx: tr },
              )

              logger.info(
                `${BOOK_CONTROLLER} deleteBook: associated book component with id ${bookComponent.id} deleted`,
              )
            }),
          )
        }

        const { result: associatedDivisions } = await Division.find(
          { bookId: deletedBook.id },
          { trx: tr },
        )

        await Promise.all(
          map(associatedDivisions, async division => {
            const updatedDivision = await Division.patchAndFetchById(
              division.id,
              {
                bookComponents: [],
                deleted: true,
              },
              { trx: tr },
            )

            logger.info(
              `${BOOK_CONTROLLER} deleteBook: associated division with id ${division.id} deleted`,
            )

            logger.info(
              `${BOOK_CONTROLLER} deleteBook: corresponding division's book components [${updatedDivision.bookComponents}] cleaned`,
            )
          }),
        )

        const { result: associatedTeams } = await getObjectTeams(
          bookId,
          'book',
          {
            trx: tr,
          },
        )

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
    logger.error(`${BOOK_CONTROLLER} deleteBook: ${e.message}`)
    throw new Error(e)
  }
}

const archiveBook = async (bookId, archive, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const archivedBook = await Book.patchAndFetchById(
          bookId,
          {
            archived: archive,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} archiveBook: book with id ${archivedBook.id} archived`,
        )

        const { result: associatedBookComponents } = await BookComponent.find(
          { bookId },
          { trx: tr },
        )

        if (associatedBookComponents.length > 0) {
          await Promise.all(
            map(associatedBookComponents, async bookComponent => {
              await BookComponent.patchAndFetchById(
                bookComponent.id,
                {
                  archived: archive,
                },
                { trx: tr },
              )
              logger.info(
                `${BOOK_CONTROLLER} archiveBook: associated book component with id ${bookComponent.id} archived`,
              )
            }),
          )
        }

        return archivedBook
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} archiveBook: ${e.message}`)
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

        const updatedBook = await Book.patchAndFetchById(
          id,
          {
            ...rest,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} updateMetadata: book with id ${updatedBook.id} has new metadata`,
        )

        return updatedBook
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} updateMetadata: ${e.message}`)
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
    logger.error(`${BOOK_CONTROLLER} exportBook: ${e.message}`)
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

            const bookComponentState = await BookComponentState.query(
              tr,
            ).findOne({ bookComponentId: id }, { trx: tr })

            return BookComponentState.patchAndFetchById(
              bookComponentState.id,
              {
                runningHeadersRight: bookComponent.runningHeadersRight,
                runningHeadersLeft: bookComponent.runningHeadersLeft,
              },
              { trx: tr },
            )
          }),
        )

        logger.info(
          `${BOOK_CONTROLLER} updateRunningHeaders: running headers updated for book with id ${bookId}`,
        )

        return Book.findOne({ id: bookId, deleted: false }, { trx: tr })
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} updateRunningHeaders: ${e.message}`)
    throw new Error(e)
  }
}

// should be removed as functionality omitted
const changeLevelLabel = async (bookId, levelId, label, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.findById(bookId, { trx: tr })
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

        await Book.patchAndFetchById(
          bookId,
          {
            bookStructure: clonedBookStructure,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} changeLevelLabel: level label changed for book with id ${bookId}`,
        )

        return clonedBookStructure.levels[levelIndex]
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} changeLevelLabel: ${e.message}`)
    throw new Error(e)
  }
}

const changeNumberOfLevels = async (bookId, levelsNumber, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.findById(bookId, { trx: tr })
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

        await Book.patchAndFetchById(
          bookId,
          {
            bookStructure: clonedBookStructure,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} changeNumberOfLevels: number of levels changed for book with id ${bookId}`,
        )

        return clonedBookStructure.levels
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} changeNumberOfLevels: ${e.message}`)
    throw new Error(e)
  }
}

const updateBookOutline = async (bookId, outline, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.findById(bookId, { trx: tr })

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        clonedBookStructure.outline = outline

        const updatedBook = await Book.patchAndFetchById(
          bookId,
          {
            bookStructure: clonedBookStructure,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} updateBookOutline: outline changed for book with id ${bookId}`,
        )

        return updatedBook.bookStructure
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} updateBookOutline: ${e.message}`)
    throw new Error(e)
  }
}

const updateLevelContentStructure = async (bookId, levels, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.findById(bookId, { trx: tr })

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        clonedBookStructure.levels = levels

        const updatedBook = await Book.patchAndFetchById(
          bookId,
          {
            bookStructure: clonedBookStructure,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} updateLevelContentStructure: level changed for book with id ${bookId}`,
        )

        return updatedBook.bookStructure.levels
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} updateLevelContentStructure: ${e.message}`)
    throw new Error(e)
  }
}

const finalizeBookStructure = async (bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.findById(bookId, { trx: tr })

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
        const bodyDivision = await Division.findOne(
          {
            bookId,
            label: 'Body',
            deleted: false,
          },
          { trx: tr },
        )

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

        await Division.patchAndFetchById(
          bodyDivision.id,
          {
            bookComponents: newDivisionBookComponents,
          },
          { trx: tr },
        )
        // set finalized flag to true
        clonedBookStructure.finalized = true

        const updatedBook = await Book.patchAndFetchById(
          bookId,
          {
            bookStructure: clonedBookStructure,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} finalizeBookStructure: book structure finalized  for book with id ${bookId}`,
        )

        return updatedBook
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} finalizeBookStructure: ${e.message}`)
    throw new Error(e)
  }
}

const updateShowWelcome = async (bookId, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const book = await Book.findById(bookId, { trx: tr })

        const clonedBookStructure = JSON.parse(
          JSON.stringify(book.bookStructure),
        )

        clonedBookStructure.showWelcome = false

        const updatedBook = await Book.patchAndFetchById(
          bookId,
          {
            bookStructure: clonedBookStructure,
          },
          { trx: tr },
        )

        logger.info(
          `${BOOK_CONTROLLER} updateShowWelcome: book structure initialized and set show welcome to false for book with id ${bookId}`,
        )

        return updatedBook
      },
      { trx },
    )
  } catch (e) {
    logger.error(`${BOOK_CONTROLLER} updateShowWelcome: ${e.message}`)
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
