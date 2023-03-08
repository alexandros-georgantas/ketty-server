const { logger, useTransaction } = require('@coko/server')
const { raw } = require('objection')
const config = require('config')
const findIndex = require('lodash/findIndex')
const find = require('lodash/find')
const pullAll = require('lodash/pullAll')
const map = require('lodash/map')
const clone = require('lodash/clone')
const assign = require('lodash/assign')

const {
  ApplicationParameter,
  BookComponentState,
  BookComponent,
  BookComponentTranslation,
  Division,
  Book,
  Lock,
} = require('../models').models

const bookComponentContentCreator = require('./helpers/bookComponentContentCreator')

const { isEmptyString } = require('../utilities/generic')
const { isAdmin } = require('./user.controller')

const getBookComponent = async (bookComponentId, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching book component with id ${bookComponentId}`)

    const bookComponent = await useTransaction(
      async tr =>
        BookComponent.findOne(
          { id: bookComponentId, deleted: false },
          { trx: tr },
        ),
      { trx, passedTrxOnly: true },
    )

    if (!bookComponent) {
      throw new Error(
        `book component with id: ${bookComponentId} does not exist`,
      )
    }

    return bookComponent
  } catch (e) {
    throw new Error(e)
  }
}

const getBookComponentAndAcquireLock = async (
  bookComponentId,
  userId,
  tabId,
  options = {},
) => {
  try {
    const { trx } = options
    const serverIdentifier = config.get('serverIdentifier')

    logger.info(`>>> fetching book component with id ${bookComponentId}`)

    const bookComponent = await useTransaction(
      async tr => {
        const bc = await BookComponent.findOne(
          {
            id: bookComponentId,
            deleted: false,
          },
          { trx: tr },
        )

        const { result: locks } = await Lock.find({
          foreignId: bookComponentId,
        })

        if (locks.length === 0) {
          await Lock.insert({
            foreignId: bookComponentId,
            foreignType: 'bookComponent',
            tabId,
            userId,
            serverIdentifier,
          })

          logger.info(
            `lock acquired for book component with id ${bookComponentId} for the user with id ${userId} and tabId ${tabId}`,
          )
        }

        return bc
      },
      { trx },
    )

    if (!bookComponent) {
      throw new Error(
        `book component with id: ${bookComponentId} does not exist`,
      )
    }

    return bookComponent
  } catch (e) {
    throw new Error(e)
  }
}

const updateBookComponent = async (bookComponentId, patch, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> updating book component with id ${bookComponentId}`)

    return useTransaction(
      async tr =>
        BookComponent.patchAndFetchById(bookComponentId, patch, { trx: tr }),
      {
        trx,
      },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const addBookComponent = async (
  divisionId,
  bookId,
  componentType,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const applicationParameters = await ApplicationParameter.query(
          tr,
        ).findOne({
          context: 'bookBuilder',
          area: 'stages',
        })

        if (!applicationParameters) {
          throw new Error(`application parameters do not exist`)
        }

        const { config: workflowStages } = applicationParameters

        let bookComponentWorkflowStages

        const newBookComponent = {
          bookId,
          componentType,
          divisionId,
          archived: false,
          pagination: {
            left: false,
            right: false,
          },
          deleted: false,
        }

        const createdBookComponent = await BookComponent.insert(
          newBookComponent,
          { trx: tr },
        )

        logger.info(
          `new book component created with id ${createdBookComponent.id}`,
        )

        const translationData = {
          bookComponentId: createdBookComponent.id,
          languageIso: 'en',
        }

        if (componentType === 'endnotes') {
          translationData.title = 'Notes'
        }

        const translation = await BookComponentTranslation.insert(
          translationData,
          { trx: tr },
        )

        logger.info(
          `new book component translation created with id ${translation.id}`,
        )

        await Division.query(tr)
          .where('id', divisionId)
          .patch({
            book_components: raw(
              `book_components || '"${createdBookComponent.id}"'`,
            ),
          })

        if (workflowStages) {
          bookComponentWorkflowStages = {
            workflowStages: map(workflowStages, stage => {
              if (
                config.has('featureBookStructure') &&
                ((config.get('featureBookStructure') &&
                  JSON.parse(config.get('featureBookStructure'))) ||
                  false)
              ) {
                if (stage.type === 'upload') {
                  return {
                    type: stage.type,
                    label: stage.title,
                    value: 1,
                  }
                }

                if (stage.type === 'file_prep') {
                  return {
                    type: stage.type,
                    label: stage.title,
                    value: 0,
                  }
                }
              }

              return {
                type: stage.type,
                label: stage.title,
                value: -1,
              }
            }),
          }
        }

        const bookComponentState = await BookComponentState.insert(
          assign(
            {},
            {
              bookComponentId: createdBookComponent.id,
              trackChangesEnabled: false,
              includeInToc: true,
              uploading: false,
            },
            bookComponentWorkflowStages,
          ),
          { trx: tr },
        )

        logger.info(
          `new state created with id ${bookComponentState.id} for the book component with id ${createdBookComponent.id}`,
        )

        if (
          config.has('featureBookStructure') &&
          ((config.get('featureBookStructure') &&
            JSON.parse(config.get('featureBookStructure'))) ||
            false)
        ) {
          const book = await Book.findById(bookId, { trx: tr })

          const levelIndex = findIndex(book.bookStructure.levels, {
            type: componentType,
          })

          if (levelIndex !== -1) {
            await bookComponentContentCreator(
              createdBookComponent,
              undefined,
              book.bookStructure,
              levelIndex,
              {},
              { trx: tr },
            )
          }
        }

        return createdBookComponent
      },
      {
        trx,
      },
    )
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateContent = async (bookComponentId, content, languageIso) => {
  try {
    const bookComponentTranslation = await BookComponentTranslation.findOne({
      bookComponentId,
      languageIso,
    })

    const { id: translationId } = bookComponentTranslation

    logger.info(
      `The translation entry found for the book component with id ${bookComponentId}. The entry's id is ${translationId}`,
    )

    const updatedContent = await BookComponentTranslation.patchAndFetchById(
      translationId,
      {
        content,
      },
    )

    logger.info(
      `The translation entry updated for the book component with id ${bookComponentId} and entry's id ${translationId}`,
    )

    let shouldNotifyWorkflowChange = false

    if (
      isEmptyString(bookComponentTranslation.content) &&
      !isEmptyString(content)
    ) {
      const hasWorkflowConfig = await ApplicationParameter.findOne({
        context: 'bookBuilder',
        area: 'stages',
      })

      if (hasWorkflowConfig) {
        logger.info(`should update also workflow`)

        const bookComponentState = await BookComponentState.findOne({
          bookComponentId,
        })

        if (!bookComponentState) {
          throw new Error(
            `state does not exist for the book component with id ${bookComponentId}`,
          )
        }

        const { id, workflowStages } = bookComponentState

        const uploadStepIndex = findIndex(workflowStages, { type: 'upload' })

        const filePrepStepIndex = findIndex(workflowStages, {
          type: 'file_prep',
        })

        workflowStages[uploadStepIndex].value = 1
        workflowStages[filePrepStepIndex].value = 0

        const updatedState = await BookComponentState.patchAndFetchById(id, {
          workflowStages,
        })

        if (!updatedState) {
          throw new Error(
            `workflow was not updated for the book component with id ${bookComponentId}`,
          )
        }

        shouldNotifyWorkflowChange = true
      }
    }

    return { updatedContent, shouldNotifyWorkflowChange }
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const toggleIncludeInTOC = async bookComponentId => {
  try {
    const currentSate = await BookComponentState.findOne({
      bookComponentId,
    })

    if (!currentSate) {
      throw new Error(
        `no state info exists for the book component with id ${bookComponentId}`,
      )
    }

    const { id, includeInToc: currentTOC } = currentSate
    logger.info(
      `Current state for the book component with id ${bookComponentId} found with id ${id}`,
    )

    const updatedState = await BookComponentState.patchAndFetchById(id, {
      includeInToc: !currentTOC,
    })

    logger.info(
      `Include in TOC value changed from ${currentTOC} to ${updatedState.includeInToc} for the book component with id ${bookComponentId}`,
    )
    return updatedState
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateComponentType = async (bookComponentId, componentType) => {
  try {
    const currentBookComponent = await BookComponent.findById(bookComponentId)

    if (!currentBookComponent) {
      throw new Error(
        `book component with id ${bookComponentId} does not exists`,
      )
    }

    logger.info(`book component with id ${bookComponentId} found`)

    if (currentBookComponent.componentType === 'toc') {
      throw new Error(
        'You cannot change the component type of the Table of Contents',
      )
    }

    const updatedBookComponent = await BookComponent.patchAndFetchById(
      bookComponentId,
      {
        componentType,
      },
    )

    logger.info(
      `component type changed from ${currentBookComponent.componentType} to ${updatedBookComponent.componentType} for book component with id ${bookComponentId}`,
    )
    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateUploading = async (bookComponentId, uploading) => {
  try {
    const currentState = await BookComponentState.findOne({
      bookComponentId,
    })

    if (!currentState) {
      throw new Error(
        `no state info exists for the book component with id ${bookComponentId}`,
      )
    }

    const { id } = currentState

    logger.info(
      `Current state for the book component with id ${bookComponentId} found with id ${id}`,
    )

    const updatedState = await BookComponentState.patchAndFetchById(id, {
      uploading,
    })

    logger.info(
      `book component uploading state changed from ${currentState.uploading} to ${updatedState.uploading} for book component with id ${bookComponentId}`,
    )

    return updatedState
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateTrackChanges = async (bookComponentId, trackChangesEnabled) => {
  try {
    const currentState = await BookComponentState.findOne({
      bookComponentId,
    })

    if (!currentState) {
      throw new Error(
        `no state info exists for the book component with id ${bookComponentId}`,
      )
    }

    const { id } = currentState

    logger.info(
      `Current state for the book component with id ${bookComponentId} found with id ${id}`,
    )

    const updatedState = await BookComponentState.patchAndFetchById(id, {
      trackChangesEnabled,
    })

    logger.info(
      `book component track changes state changed from ${currentState.trackChangesEnabled} to ${updatedState.trackChangesEnabled} for book component with id ${bookComponentId}`,
    )

    return updatedState
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updatePagination = async (bookComponentId, pagination) => {
  try {
    return BookComponent.patchAndFetchById(bookComponentId, {
      pagination,
    })
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const unlockBookComponent = async (
  bookComponentId,
  actingUserId = undefined,
) => {
  try {
    const serverIdentifier = config.get('serverIdentifier')

    return useTransaction(async tr => {
      let status = 101

      const { result: locks } = await Lock.find(
        {
          foreignId: bookComponentId,
          foreignType: 'bookComponent',
          serverIdentifier,
        },
        { trx: tr },
      )

      if (locks.length > 1) {
        status = 103
        logger.info(
          `multiple locks found for book component with id ${bookComponentId} and deleted `,
        )
        await BookComponentState.query(tr)
          .patch({ status })
          .where({ bookComponentId })

        return Lock.query(tr).delete().where({
          foreignId: bookComponentId,
          foreignType: 'bookComponent',
          serverIdentifier,
        })
      }

      logger.info(`lock for book component with id ${bookComponentId} deleted `)

      if (actingUserId) {
        const adminUser = await isAdmin(actingUserId)

        if (adminUser && locks[0].userId !== actingUserId) {
          status = 100
        }
      }

      await BookComponentState.query(tr)
        .patch({ status })
        .where({ bookComponentId })

      return Lock.query(tr).delete().where({
        foreignId: bookComponentId,
        foreignType: 'bookComponent',
        serverIdentifier,
      })
    }, {})
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const lockBookComponent = async (bookComponentId, tabId, userAgent, userId) => {
  try {
    const serverIdentifier = config.get('serverIdentifier')

    const { result: locks } = await Lock.find({ foreignId: bookComponentId })

    if (locks.length > 1) {
      logger.error(
        `multiple locks found for the book component with id ${bookComponentId}`,
      )

      await Lock.deleteByIds(map(locks, lock => lock.id))
      // .query()
      //   .delete()
      //   .whereIn(
      //     'id',
      //     map(locks, lock => lock.id),
      //   )
      //   .andWhere(serverIdentifier)

      throw new Error(
        `corrupted lock for the book component with id ${bookComponentId}, all locks deleted`,
      )
    }

    if (locks.length === 1) {
      if (locks[0].userId !== userId) {
        const errorMsg = `There is a lock already for this book component for the user with id ${locks[0].userId}`
        logger.error(errorMsg)
        // throw new Error(errorMsg)
      }

      logger.info(
        `lock exists for book component with id ${bookComponentId} for the user with id ${userId}`,
      )

      return locks[0]
    }

    logger.info(
      `no existing lock found for book component with id ${bookComponentId}`,
    )

    const lock = await Lock.insert({
      foreignId: bookComponentId,
      foreignType: 'bookComponent',
      userAgent,
      tabId,
      userId,
      serverIdentifier,
    })

    const status = 200

    await BookComponentState.query()
      .patch({ status })
      .where({ bookComponentId })

    logger.info(
      `lock acquired for book component with id ${bookComponentId} for the user with id ${userId}`,
    )

    return lock
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const updateWorkflowState = async (bookComponentId, workflowStages, ctx) => {
  try {
    const applicationParameters = await ApplicationParameter.findOne({
      context: 'bookBuilder',
      area: 'lockTrackChangesWhenReviewing',
    })

    if (!applicationParameters) {
      throw new Error(`application parameters do not exist`)
    }

    const { config: lockTrackChanges } = applicationParameters

    logger.info(
      `searching of book component state for the book component with id ${bookComponentId}`,
    )

    const bookComponentState = await BookComponentState.findOne({
      bookComponentId,
    })

    if (!bookComponentState) {
      throw new Error(
        `book component state does not exists for the book component with id ${bookComponentId}`,
      )
    }

    logger.info(`found book component state with id ${bookComponentState.id}`)

    const update = {}

    let isReviewing = false

    if (lockTrackChanges) {
      isReviewing = find(workflowStages, { type: 'review' }).value === 0

      if (isReviewing) {
        update.trackChangesEnabled = true
        update.workflowStages = workflowStages
      } else {
        update.workflowStages = workflowStages
      }
    }

    const { result: locks } = await Lock.find({
      foreignId: bookComponentId,
      foreignType: 'bookComponent',
    })

    // case book component is locked but permissions changed for that user
    if (locks.length > 0) {
      const currentBookComponent = await BookComponent.findById(bookComponentId)
      currentBookComponent.workflowStages = update.workflowStages

      ctx.helpers
        .can(locks[0].userId, 'can view fragmentEdit', currentBookComponent)
        .then(param => true)
        .catch(async e => {
          // this means that the user no longer has edit permission
          await Lock.query().delete().where({
            foreignId: bookComponentId,
            foreignType: 'bookComponent',
          })
          return BookComponentState.query()
            .patch({ status: 105 })
            .where({ bookComponentId })
        })
    }

    const updatedBookComponentState =
      await BookComponentState.patchAndFetchById(bookComponentState.id, {
        ...update,
      })

    logger.info(`book component state with id ${bookComponentState.id} updated`)

    return updatedBookComponentState
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const deleteBookComponent = async bookComponent => {
  try {
    const { id, componentType, divisionId } = bookComponent

    if (componentType === 'toc') {
      throw new Error(
        'you cannot delete a component with type Table of Contents',
      )
    }

    const deletedBookComponent = await BookComponent.patchAndFetchById(id, {
      deleted: true,
    })

    await BookComponentState.query()
      .patch({
        deleted: true,
      })
      .where('bookComponentId', id)
    await BookComponentTranslation.query()
      .patch({
        deleted: true,
      })
      .where('bookComponentId', id)

    logger.info(`book component with id ${deletedBookComponent.id} deleted`)

    const componentDivision = await Division.findById(divisionId)

    if (!componentDivision) {
      throw new Error(
        `division does not exists for the book component with id ${id}`,
      )
    }

    const clonedBookComponents = clone(componentDivision.bookComponents)

    pullAll(clonedBookComponents, [id])

    const updatedDivision = await Division.patchAndFetchById(
      componentDivision.id,
      {
        bookComponents: clonedBookComponents,
      },
    )

    logger.info(
      `division's book component array before [${componentDivision.bookComponents}]`,
    )
    logger.info(
      `division's book component array after cleaned [${updatedDivision.bookComponents}]`,
    )

    return deletedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const renameBookComponent = async (bookComponentId, title, languageIso) => {
  try {
    const bookComponentTranslation = await BookComponentTranslation.findOne({
      bookComponentId,
      languageIso,
    })

    if (!bookComponentTranslation) {
      throw new Error(
        `translation entry does not exists for the book component with id ${bookComponentId}`,
      )
    }

    const previousTitle = bookComponentTranslation.title

    const updatedTranslation = await BookComponentTranslation.patchAndFetchById(
      bookComponentTranslation.id,
      { title },
    )

    logger.info(
      `the title of the book component with id ${bookComponentId} changed`,
    )

    const bookComponentState = await BookComponentState.findOne({
      bookComponentId,
    })

    if (!bookComponentState) {
      throw new Error(
        `book component state does not exists for the book component with id ${bookComponentId}, thus running headers will not be able to update with the new title`,
      )
    }

    const {
      runningHeadersRight: previousRunningHeadersRight,
      runningHeadersLeft: previousRunningHeadersLeft,
    } = bookComponentState

    await BookComponentState.patchAndFetchById(bookComponentState.id, {
      runningHeadersRight:
        previousRunningHeadersRight === previousTitle
          ? title
          : previousRunningHeadersRight,
      runningHeadersLeft:
        previousRunningHeadersLeft === previousTitle
          ? title
          : previousRunningHeadersLeft,
    })

    logger.info(
      `running headers updated for the book component with id ${bookComponentId}`,
    )

    return updatedTranslation
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

module.exports = {
  getBookComponent,
  getBookComponentAndAcquireLock,
  updateBookComponent,
  addBookComponent,
  updateContent,
  toggleIncludeInTOC,
  updateComponentType,
  updateUploading,
  updateTrackChanges,
  updatePagination,
  unlockBookComponent,
  lockBookComponent,
  updateWorkflowState,
  deleteBookComponent,
  renameBookComponent,
}
