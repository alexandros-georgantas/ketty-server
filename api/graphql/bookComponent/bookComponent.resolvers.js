const { logger } = require('@coko/server')
const { pubsubManager } = require('@coko/server')
const { withFilter } = require('graphql-subscriptions')
const fs = require('fs-extra')
const crypto = require('crypto')
const path = require('path')
const BPromise = require('bluebird')

const findIndex = require('lodash/findIndex')
const find = require('lodash/find')
const groupBy = require('lodash/groupBy')
const pullAll = require('lodash/pullAll')

const { writeLocallyFromReadStream } = require('../../../utilities/filesystem')
const { replaceImageSource } = require('../../../utilities/image')
const DOCXFilenameParser = require('../../../controllers/helpers/DOCXFilenameParser')

const {
  BookComponentState,
  BookComponentTranslation,
  Division,
  BookTranslation,
  Lock,
  User,
} = require('../../../models').models

const {
  BOOK_COMPONENT_ADDED,
  BOOK_COMPONENT_DELETED,
  BOOK_COMPONENT_PAGINATION_UPDATED,
  BOOK_COMPONENT_WORKFLOW_UPDATED,
  BOOK_COMPONENT_TRACK_CHANGES_UPDATED,
  BOOK_COMPONENT_TITLE_UPDATED,
  BOOK_COMPONENT_CONTENT_UPDATED,
  BOOK_COMPONENT_UPLOADING_UPDATED,
  BOOK_COMPONENT_LOCK_UPDATED,
  BOOK_COMPONENTS_LOCK_UPDATED,
  BOOK_COMPONENT_TYPE_UPDATED,
  BOOK_COMPONENT_TOC_UPDATED,
  BOOK_COMPONENT_UPDATED,
} = require('./constants')

const {
  xsweetHandler,
} = require('../../../controllers/microServices.controller')

const {
  getBookComponent,
  // getBookComponentAndAcquireLock,
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
} = require('../../../controllers/bookComponent.controller')

const { getContentFiles } = require('../../../controllers/file.controller')

const { getBook } = require('../../../controllers/book.controller')
const { isAdmin } = require('../../../controllers/user.controller')

const getBookComponentHandler = async (_, { id }, ctx) => {
  const bookComponent = await getBookComponent(id)

  if (!bookComponent) {
    throw new Error(`Book Component with id: ${id} does not exist`)
  }

  return bookComponent
}

// const getBookComponentAndAcquireLock = async (_, { id, tabId }, ctx) => {
//   try {
//     const pubsub = await pubsubManager.getPubsub()

//     const bookComponent = await useCaseGetBookComponentAndAcquireLock(
//       id,
//       ctx.user,
//       tabId,
//     )

//     pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
//       bookComponentLockUpdated: bookComponent,
//     })

//     return bookComponent
//   } catch (e) {
//     logger.error(e.message)
//     throw new Error(e)
//   }
// }

const ingestWordFileHandler = async (_, { bookComponentFiles }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const bookComponents = []
    await BPromise.mapSeries(bookComponentFiles, async bookComponentFile => {
      const { file, bookComponentId, bookId } = await bookComponentFile
      const { createReadStream, filename } = await file
      const title = filename.split('.')[0]
      const readerStream = createReadStream()

      const tempFilePath = path.join(`${process.cwd()}`, 'uploads', 'temp')
      const randomFilename = `${crypto.randomBytes(32).toString('hex')}.docx`
      await fs.ensureDir(tempFilePath)

      await writeLocallyFromReadStream(
        tempFilePath,
        randomFilename,
        readerStream,
        'utf-8',
      )
      let componentId = bookComponentId

      if (!bookComponentId) {
        const name = filename.replace(/\.[^/.]+$/, '')
        const { componentType, label } = DOCXFilenameParser(name)

        const division = await Division.findOne({
          bookId,
          label,
        })

        if (!division) {
          throw new Error(
            `division with label ${label} does not exist for the book with id ${bookId}`,
          )
        }

        const newBookComponent = await addBookComponent(
          division.id,
          bookId,
          componentType,
        )

        pubsub.publish(BOOK_COMPONENT_ADDED, {
          bookComponentAdded: newBookComponent,
        })

        componentId = newBookComponent.id
      }

      const uploading = true

      const currentComponentState = await BookComponentState.findOne({
        bookComponentId: componentId,
      })

      if (!currentComponentState) {
        throw new Error(
          `component state for the book component with id ${componentId} does not exist`,
        )
      }

      const currentAndUpdate = {
        current: currentComponentState,
        update: { uploading },
      }

      await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

      await updateUploading(componentId, uploading)

      await renameBookComponent(componentId, title, 'en')

      const updatedBookComponent = await getBookComponent(componentId)
      bookComponents.push(updatedBookComponent)
      pubsub.publish(BOOK_COMPONENT_UPLOADING_UPDATED, {
        bookComponentUploadingUpdated: updatedBookComponent,
      })
      pubsub.publish(BOOK_COMPONENT_UPDATED, {
        bookComponentUpdated: updatedBookComponent,
      })

      // await useCaseXSweet(componentId, `${tempFilePath}/${randomFilename}`)
      return xsweetHandler(componentId, `${tempFilePath}/${randomFilename}`)
    })
    return bookComponents
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const addBookComponentHandler = async (_, { input }, ctx, info) => {
  try {
    const { divisionId, bookId, componentType, title } = input
    const pubsub = await pubsubManager.getPubsub()

    const newBookComponent = await addBookComponent(
      divisionId,
      bookId,
      componentType,
      title,
    )

    const updatedBook = await getBook(bookId)

    pubsub.publish(`BOOK_UPDATED`, {
      bookUpdated: updatedBook,
    })

    pubsub.publish(BOOK_COMPONENT_ADDED, {
      bookComponentAdded: newBookComponent,
    })

    return newBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const renameBookComponentHandler = async (_, { input }, ctx) => {
  try {
    const { id, title } = input
    const pubsub = await pubsubManager.getPubsub()

    await renameBookComponent(id, title, 'en')

    const updatedBookComponent = await getBookComponent(id)

    const updatedBook = await getBook(updatedBookComponent.bookId)

    pubsub.publish(`BOOK_UPDATED`, {
      bookUpdated: updatedBook,
    })

    pubsub.publish(BOOK_COMPONENT_TITLE_UPDATED, {
      bookComponentTitleUpdated: updatedBookComponent,
    })
    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    logger.info('message BOOK_COMPONENT_TITLE_UPDATED broadcasted')

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const deleteBookComponentHandler = async (_, { input }, ctx) => {
  try {
    const { id, deleted } = input
    const pubsub = await pubsubManager.getPubsub()
    const bookComponent = await getBookComponent(id)

    if (!bookComponent) {
      throw new Error(`book component with id ${id} does not exists`)
    }

    const currentAndUpdate = {
      current: bookComponent,
      update: { deleted },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    const deletedBookComponent = await deleteBookComponent(bookComponent)

    const updatedBook = await getBook(bookComponent.bookId)

    pubsub.publish(`BOOK_UPDATED`, {
      bookUpdated: updatedBook,
    })

    pubsub.publish(BOOK_COMPONENT_DELETED, {
      bookComponentDeleted: deletedBookComponent,
    })
    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: deletedBookComponent,
    })

    logger.info('message BOOK_COMPONENT_DELETED broadcasted')

    return deletedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateWorkflowStateHandler = async (_, { input }, ctx) => {
  try {
    const { id, workflowStages } = input
    const pubsub = await pubsubManager.getPubsub()

    const bookComponentState = await BookComponentState.findOne({
      bookComponentId: id,
    })

    if (!bookComponentState) {
      throw new Error(
        `book component state does not exists for the book component with id ${id}`,
      )
    }

    const currentAndUpdate = {
      current: bookComponentState,
      update: { workflowStages },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    await updateWorkflowState(id, workflowStages, ctx)

    const isReviewing = find(workflowStages, { type: 'review' }).value === 0
    const updatedBookComponent = await getBookComponent(id)

    pubsub.publish(BOOK_COMPONENT_WORKFLOW_UPDATED, {
      bookComponentWorkflowUpdated: updatedBookComponent,
    })

    if (isReviewing) {
      pubsub.publish(BOOK_COMPONENT_TRACK_CHANGES_UPDATED, {
        bookComponentTrackChangesUpdated: updatedBookComponent,
      })
    }

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const unlockBookComponentHandler = async (_, { input }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const { id: bookComponentId } = input

    await unlockBookComponent(bookComponentId, ctx.user)

    const updatedBookComponent = await getBookComponent(bookComponentId)

    // This should be replaced with book component updated, when refactor Book Builder
    pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
      bookComponentLockUpdated: updatedBookComponent,
    })
    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const lockBookComponentHandler = async (_, { id, tabId, userAgent }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    await lockBookComponent(id, tabId, userAgent, ctx.user)

    const bookComponent = await getBookComponent(id)

    // This should be replaced with book component updated, when refactor Book Builder
    pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
      bookComponentLockUpdated: bookComponent,
    })

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: bookComponent,
    })

    return bookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateContentHandler = async (_, { input }, ctx) => {
  try {
    const { id, content } = input
    const pubsub = await pubsubManager.getPubsub()

    const { shouldNotifyWorkflowChange } = await updateContent(
      id,
      content,
      'en',
    )

    const updatedBookComponent = await getBookComponent(id)

    pubsub.publish(BOOK_COMPONENT_CONTENT_UPDATED, {
      bookComponentContentUpdated: updatedBookComponent,
    })

    logger.info('message BOOK_COMPONENT_CONTENT_UPDATED broadcasted')

    if (shouldNotifyWorkflowChange) {
      pubsub.publish(BOOK_COMPONENT_WORKFLOW_UPDATED, {
        bookComponentWorkflowUpdated: updatedBookComponent,
      })
      logger.info('message BOOK_COMPONENT_WORKFLOW_UPDATED broadcasted')
    }

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updatePaginationHandler = async (_, { input }, ctx) => {
  try {
    const { id, pagination } = input
    const pubsub = await pubsubManager.getPubsub()

    const currentBookComponent = await getBookComponent(id)

    if (!currentBookComponent) {
      throw new Error(`book component with id ${id} does not exists`)
    }

    const currentAndUpdate = {
      current: currentBookComponent,
      update: { pagination },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    const updatedBookComponent = await updatePagination(id, pagination)

    pubsub.publish(BOOK_COMPONENT_PAGINATION_UPDATED, {
      bookComponentPaginationUpdated: updatedBookComponent,
    })

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateTrackChangesHandler = async (_, { input }, ctx) => {
  try {
    const { id, trackChangesEnabled } = input
    const pubsub = await pubsubManager.getPubsub()

    const currentState = await BookComponentState.findOne({
      bookComponentId: id,
    })

    if (!currentState) {
      throw new Error(
        `no state info exists for the book component with id ${id}`,
      )
    }

    const currentAndUpdate = {
      current: currentState,
      update: { trackChangesEnabled },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    await updateTrackChanges(id, trackChangesEnabled)

    const updatedBookComponent = await getBookComponent(id)

    pubsub.publish(BOOK_COMPONENT_TRACK_CHANGES_UPDATED, {
      bookComponentTrackChangesUpdated: updatedBookComponent,
    })

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateUploadingHandler = async (_, { input }, ctx) => {
  try {
    const { id, uploading } = input
    const pubsub = await pubsubManager.getPubsub()

    const currentState = await BookComponentState.findOne({
      bookComponentId: id,
    })

    if (!currentState) {
      throw new Error(
        `no state info exists for the book component with id ${id}`,
      )
    }

    const currentAndUpdate = {
      current: currentState,
      update: { uploading },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    await updateUploading(id, uploading)

    const updatedBookComponent = await getBookComponent(id)

    pubsub.publish(BOOK_COMPONENT_UPLOADING_UPDATED, {
      bookComponentUploadingUpdated: updatedBookComponent,
    })

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const updateComponentTypeHandler = async (_, { input }, ctx) => {
  try {
    const { id, componentType } = input
    const pubsub = await pubsubManager.getPubsub()

    const updatedBookComponent = await updateComponentType(id, componentType)

    pubsub.publish(BOOK_COMPONENT_TYPE_UPDATED, {
      bookComponentTypeUpdated: updatedBookComponent,
    })
    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const toggleIncludeInTOCHandler = async (_, { input }, ctx) => {
  try {
    const { id } = input
    const pubsub = await pubsubManager.getPubsub()

    await toggleIncludeInTOC(id)

    const updatedBookComponent = await getBookComponent(id)

    pubsub.publish(BOOK_COMPONENT_TOC_UPDATED, {
      bookComponentTOCToggled: updatedBookComponent,
    })
    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent,
    })

    return updatedBookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getBookComponent: getBookComponentHandler,
    // getBookComponentAndAcquireLock,
  },
  Mutation: {
    ingestWordFile: ingestWordFileHandler,
    addBookComponent: addBookComponentHandler,
    renameBookComponent: renameBookComponentHandler,
    deleteBookComponent: deleteBookComponentHandler,
    updateWorkflowState: updateWorkflowStateHandler,
    updatePagination: updatePaginationHandler,
    unlockBookComponent: unlockBookComponentHandler,
    lockBookComponent: lockBookComponentHandler,
    updateContent: updateContentHandler,
    updateUploading: updateUploadingHandler,
    updateTrackChanges: updateTrackChangesHandler,
    updateComponentType: updateComponentTypeHandler,
    toggleIncludeInTOC: toggleIncludeInTOCHandler,
  },
  BookComponent: {
    async title(bookComponent, _, ctx) {
      let { title } = bookComponent

      if (!title) {
        const bookComponentTranslation = await BookComponentTranslation.findOne(
          { bookComponentId: bookComponent.id, languageIso: 'en' },
        )

        title = bookComponentTranslation.title
      }

      return title
    },
    async bookId(bookComponent, _, ctx) {
      return bookComponent.bookId
    },
    async status(bookComponent, _, ctx) {
      const bookComponentState = await BookComponentState.findOne({
        bookComponentId: bookComponent.id,
      })

      return bookComponentState.status
    },
    async bookTitle(bookComponent, _, ctx) {
      const book = await getBook(bookComponent.bookId)

      const bookTranslation = await BookTranslation.findOne({
        bookId: book.id,
        languageIso: 'en',
      })

      return bookTranslation.title
    },
    async runningHeadersRight(bookComponent, _, ctx) {
      const bookComponentState = await bookComponent.getBookComponentState()
      return bookComponentState.runningHeadersRight
    },
    async runningHeadersLeft(bookComponent, _, ctx) {
      const bookComponentState = await bookComponent.getBookComponentState()
      return bookComponentState.runningHeadersLeft
    },
    async divisionType(bookComponent, _, ctx) {
      const division = await Division.findById(bookComponent.divisionId)
      return division.label
    },
    async divisionId(bookComponent, _, ctx) {
      return bookComponent.divisionId
    },
    async content(bookComponent, _, ctx) {
      const bookComponentTranslation = await BookComponentTranslation.findOne({
        bookComponentId: bookComponent.id,
        languageIso: 'en',
      })

      const content = bookComponentTranslation.content || ''
      const hasContent = content.trim().length > 0

      if (hasContent) {
        return replaceImageSource(
          bookComponentTranslation.content,
          getContentFiles,
        )
      }

      return bookComponentTranslation.content
    },
    async trackChangesEnabled(bookComponent, _, ctx) {
      const bookComponentState = await BookComponentState.findOne({
        bookComponentId: bookComponent.id,
      })

      return bookComponentState.trackChangesEnabled
    },
    async hasContent(bookComponent, _, ctx) {
      const bookComponentTranslation = await BookComponentTranslation.findOne({
        bookComponentId: bookComponent.id,
        languageIso: 'en',
      })

      const content = bookComponentTranslation.content || ''
      const hasContent = content.trim().length > 0
      return hasContent
    },
    async lock(bookComponent, _, ctx) {
      let locked = null

      const lock = await Lock.findOne({ foreignId: bookComponent.id })

      if (lock) {
        const user = await User.findById(lock.userId)
        const adminUser = await isAdmin(user.id)

        locked = {
          created: lock.created,
          tabId: lock.tabId,
          username: user.username,
          givenNames: user.givenNames,
          surname: user.surname,
          isAdmin: adminUser,
          userId: lock.userId,
          foreignId: bookComponent.id,
          id: lock.id,
        }
      }

      return locked
    },
    async componentTypeOrder(bookComponent, _, ctx) {
      const { componentType } = bookComponent

      const sortedPerDivision =
        await ctx.connectors.DivisionLoader.model.bookComponents.load(
          bookComponent.divisionId,
        )

      const groupedByType = groupBy(
        pullAll(sortedPerDivision, [undefined]),
        'componentType',
      )

      return (
        findIndex(
          groupedByType[componentType],
          item => item.id === bookComponent.id,
        ) + 1
      )
    },
    async uploading(bookComponent, _, ctx) {
      await ctx.connectors.BookComponentStateLoader.model.state.clear()

      const bookComponentState =
        await ctx.connectors.BookComponentStateLoader.model.state.load(
          bookComponent.id,
        )

      return bookComponentState.uploading
    },
    async pagination(bookComponent, _, ctx) {
      return bookComponent.pagination
    },
    async workflowStages(bookComponent, _, ctx) {
      ctx.connectors.BookComponentStateLoader.model.state.clear()

      const bookComponentState =
        await ctx.connectors.BookComponentStateLoader.model.state.load(
          bookComponent.id,
        )

      return bookComponentState.workflowStages || null
    },

    async includeInToc(bookComponent, _, ctx) {
      const state = await bookComponent.getBookComponentState()
      return state.includeInToc
    },
    async bookStructureElements(bookComponent, _, ctx) {
      const book = await getBook(bookComponent.bookId)

      const hasThreeLevels = book.bookStructure.levels.length > 2

      const bookStructureElements = [
        {
          groupHeader: 'Openers',
          items: [
            {
              displayName: 'Introduction',
              className: 'introduction',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Outline',
              className: 'outline',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Learning Objectives',
              className: 'learning-objectives',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Focus Questions',
              className: 'focus-questions',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Content Opener Image',
              className: 'content-opener-image',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
          ],
        },
        {
          groupHeader: 'Openers and Closers',
          items: [
            {
              displayName: 'Key Terms List',
              className: 'key-terms',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Self-reflection Activities',
              className: 'self-reflection-activities',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
          ],
        },
        {
          groupHeader: 'Closers',
          items: [
            {
              displayName: 'Review Activity',
              className: 'review-activity',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Summary',
              className: 'summary',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'References',
              className: 'references',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Bibliography',
              className: 'bibliography',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
            {
              displayName: 'Further Reading',
              className: 'further-reading',
              headingLevel: 2,
              nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
              isSection: false,
            },
          ],
        },
      ]

      if (bookComponent.componentType === 'chapter') {
        bookStructureElements.unshift({
          groupHeader: 'Core Elements',
          items: [
            {
              displayName: 'Section',
              className: 'section',
              headingLevel: 2,
              nestedHeadingLevel: 3,
              isSection: true,
            },
          ],
        })
      }

      return bookStructureElements
    },
  },
  Subscription: {
    bookComponentAdded: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_ADDED)
      },
    },
    bookComponentDeleted: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_DELETED)
      },
    },
    bookComponentPaginationUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_PAGINATION_UPDATED)
      },
    },
    bookComponentWorkflowUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_WORKFLOW_UPDATED)
      },
    },
    bookComponentTrackChangesUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_TRACK_CHANGES_UPDATED)
      },
    },
    bookComponentTitleUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_TITLE_UPDATED)
      },
    },
    bookComponentContentUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_CONTENT_UPDATED)
      },
    },
    bookComponentUploadingUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_UPLOADING_UPDATED)
      },
    },
    bookComponentLockUpdated: {
      subscribe: async (payload, variables, context, info) => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_LOCK_UPDATED)
      },
    },
    bookComponentsLockUpdated: {
      subscribe: async (payload, variables, context, info) => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENTS_LOCK_UPDATED)
      },
    },
    bookComponentTypeUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_TYPE_UPDATED)
      },
    },
    bookComponentTOCToggled: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_TOC_UPDATED)
      },
    },
    bookComponentUpdated: {
      subscribe: async (...args) => {
        const pubsub = await pubsubManager.getPubsub()

        return withFilter(
          () => {
            return pubsub.asyncIterator(BOOK_COMPONENT_UPDATED)
          },
          (payload, variables) => {
            const { id: clientBCId } = variables
            const { bookComponentUpdated } = payload
            const { id } = bookComponentUpdated
            return clientBCId === id
          },
        )(...args)
      },
    },
  },
}
