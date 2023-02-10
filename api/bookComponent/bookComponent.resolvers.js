const findIndex = require('lodash/findIndex')
const find = require('lodash/find')
const groupBy = require('lodash/groupBy')
const pullAll = require('lodash/pullAll')
const path = require('path')
const BPromise = require('bluebird')

const { withFilter } = require('graphql-subscriptions')

const fs = require('fs-extra')

const { logger } = require('@coko/server')
const { pubsubManager } = require('@coko/server')
const crypto = require('crypto')
const { writeLocallyFromReadStream } = require('../helpers/utils')
const { extractFragmentProperties, replaceImageSrc } = require('./util')

const {
  BookComponentState,
  BookComponent,
  BookComponentTranslation,
  Division,
  Book,
  BookTranslation,
  Lock,
  User,
} = require('../../data-model/src').models

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
} = require('./consts')

const {
  useCaseAddBookComponent,
  useCaseUpdateBookComponentContent,
  useCaseUpdateUploading,
  useCaseToggleIncludeInTOC,
  useCaseUpdateComponentType,
  useCaseUpdateTrackChanges,
  useCaseUpdatePagination,
  useCaseLockBookComponent,
  useCaseUnlockBookComponent,
  useCaseUpdateWorkflowState,
  useCaseDeleteBookComponent,
  useCaseRenameBookComponent,
  useCaseGetBookComponentAndAcquireLock,
  useCaseXSweet,
} = require('../useCases')

const getBookComponent = async (_, { id }, ctx) => {
  const bookComponent = await BookComponent.findById(id)

  if (!bookComponent) {
    throw new Error(`Book Component with id: ${id} does not exist`)
  }

  return bookComponent
}

const getBookComponentAndAcquireLock = async (_, { id, tabId }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()

    const bookComponent = await useCaseGetBookComponentAndAcquireLock(
      id,
      ctx.user,
      tabId,
    )

    pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
      bookComponentLockUpdated: bookComponent,
    })

    return bookComponent
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const ingestWordFile = async (_, { bookComponentFiles }, ctx) => {
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
        const { componentType, label } = extractFragmentProperties(name)

        const division = await Division.query().findOne({
          bookId,
          label,
        })

        if (!division) {
          throw new Error(
            `division with label ${label} does not exist for the book with id ${bookId}`,
          )
        }

        const newBookComponent = await useCaseAddBookComponent(
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

      const currentComponentState = await BookComponentState.query().findOne({
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

      await useCaseUpdateUploading(componentId, uploading)

      await useCaseRenameBookComponent(componentId, title, 'en')

      const updatedBookComponent = await BookComponent.findById(componentId)
      bookComponents.push(updatedBookComponent)
      pubsub.publish(BOOK_COMPONENT_UPLOADING_UPDATED, {
        bookComponentUploadingUpdated: updatedBookComponent,
      })
      pubsub.publish(BOOK_COMPONENT_UPDATED, {
        bookComponentUpdated: updatedBookComponent,
      })

      // await useCaseXSweet(componentId, `${tempFilePath}/${randomFilename}`)
      return useCaseXSweet(componentId, `${tempFilePath}/${randomFilename}`)
    })
    return bookComponents
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

const addBookComponent = async (_, { input }, ctx, info) => {
  try {
    const { divisionId, bookId, componentType, title } = input
    const pubsub = await pubsubManager.getPubsub()

    const newBookComponent = await useCaseAddBookComponent(
      divisionId,
      bookId,
      componentType,
      title,
    )

    const updatedBook = await Book.findById(bookId)

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

const renameBookComponent = async (_, { input }, ctx) => {
  try {
    const { id, title } = input
    const pubsub = await pubsubManager.getPubsub()

    await useCaseRenameBookComponent(id, title, 'en')

    const updatedBookComponent = await BookComponent.findById(id)

    const updatedBook = await Book.findById(updatedBookComponent.bookId)

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

const deleteBookComponent = async (_, { input }, ctx) => {
  try {
    const { id, deleted } = input
    const pubsub = await pubsubManager.getPubsub()
    const bookComponent = await BookComponent.findById(id)

    if (!bookComponent) {
      throw new Error(`book component with id ${id} does not exists`)
    }

    const currentAndUpdate = {
      current: bookComponent,
      update: { deleted },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    const deletedBookComponent = await useCaseDeleteBookComponent(bookComponent)

    const updatedBook = await Book.findById(bookComponent.bookId)

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

// Could be implemented in the future
const archiveBookComponent = async (_, args, ctx) => {}

const updateWorkflowState = async (_, { input }, ctx) => {
  try {
    const { id, workflowStages } = input
    const pubsub = await pubsubManager.getPubsub()

    const bookComponentState = await BookComponentState.query().findOne({
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

    await useCaseUpdateWorkflowState(id, workflowStages, ctx)

    const isReviewing = find(workflowStages, { type: 'review' }).value === 0
    const updatedBookComponent = await BookComponent.findById(id)

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

const unlockBookComponent = async (_, { input }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const { id: bookComponentId } = input

    await useCaseUnlockBookComponent(bookComponentId, ctx.user)

    const updatedBookComponent = await BookComponent.findById(bookComponentId)

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

const lockBookComponent = async (_, { id, tabId, userAgent }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    await useCaseLockBookComponent(id, tabId, userAgent, ctx.user)

    const bookComponent = await BookComponent.findById(id)

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

const updateContent = async (_, { input }, ctx) => {
  try {
    const { id, content } = input
    const pubsub = await pubsubManager.getPubsub()

    const { shouldNotifyWorkflowChange } =
      await useCaseUpdateBookComponentContent(id, content, 'en')

    const updatedBookComponent = await BookComponent.findById(id)

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

const updatePagination = async (_, { input }, ctx) => {
  try {
    const { id, pagination } = input
    const pubsub = await pubsubManager.getPubsub()

    const currentBookComponent = await BookComponent.findById(id)

    if (!currentBookComponent) {
      throw new Error(`book component with id ${id} does not exists`)
    }

    const currentAndUpdate = {
      current: currentBookComponent,
      update: { pagination },
    }

    await ctx.helpers.can(ctx.user, 'update', currentAndUpdate)

    const updatedBookComponent = await useCaseUpdatePagination(id, pagination)

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

const updateTrackChanges = async (_, { input }, ctx) => {
  try {
    const { id, trackChangesEnabled } = input
    const pubsub = await pubsubManager.getPubsub()

    const currentState = await BookComponentState.query().findOne({
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

    await useCaseUpdateTrackChanges(id, trackChangesEnabled)

    const updatedBookComponent = await BookComponent.findById(id)

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

const updateUploading = async (_, { input }, ctx) => {
  try {
    const { id, uploading } = input
    const pubsub = await pubsubManager.getPubsub()

    const currentState = await BookComponentState.query().findOne({
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

    await useCaseUpdateUploading(id, uploading)

    const updatedBookComponent = await BookComponent.findById(id)

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

const updateComponentType = async (_, { input }, ctx) => {
  try {
    const { id, componentType } = input
    const pubsub = await pubsubManager.getPubsub()

    const updatedBookComponent = await useCaseUpdateComponentType(
      id,
      componentType,
    )

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

const toggleIncludeInTOC = async (_, { input }, ctx) => {
  try {
    const { id } = input
    const pubsub = await pubsubManager.getPubsub()

    await useCaseToggleIncludeInTOC(id)

    const updatedBookComponent = await BookComponent.query().findOne({ id })

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
    getBookComponent,
    getBookComponentAndAcquireLock,
  },
  Mutation: {
    ingestWordFile,
    addBookComponent,
    renameBookComponent,
    deleteBookComponent,
    archiveBookComponent,
    updateWorkflowState,
    updatePagination,
    unlockBookComponent,
    lockBookComponent,
    updateContent,
    updateUploading,
    updateTrackChanges,
    updateComponentType,
    toggleIncludeInTOC,
  },
  BookComponent: {
    async title(bookComponent, _, ctx) {
      let { title } = bookComponent

      if (!title) {
        const bookComponentTranslation = await BookComponentTranslation.query()
          .where('bookComponentId', bookComponent.id)
          .andWhere('languageIso', 'en')

        title = bookComponentTranslation[0].title
      }

      return title
    },
    async bookId(bookComponent, _, ctx) {
      return bookComponent.bookId
    },
    async status(bookComponent, _, ctx) {
      const bookComponentState = await BookComponentState.query().findOne({
        bookComponentId: bookComponent.id,
      })

      return bookComponentState.status
    },
    async bookTitle(bookComponent, _, ctx) {
      const book = await Book.findById(bookComponent.bookId)

      const bookTranslation = await BookTranslation.query()
        .where('bookId', book.id)
        .andWhere('languageIso', 'en')

      return bookTranslation[0].title
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
      const bookComponentTranslation = await BookComponentTranslation.query()
        .where('bookComponentId', bookComponent.id)
        .andWhere('languageIso', 'en')

      const content = bookComponentTranslation[0].content || ''
      const hasContent = content.trim().length > 0

      if (hasContent) {
        return replaceImageSrc(bookComponentTranslation[0].content)
      }

      return bookComponentTranslation[0].content
    },
    async trackChangesEnabled(bookComponent, _, ctx) {
      const bookComponentState = await BookComponentState.query().where(
        'bookComponentId',
        bookComponent.id,
      )

      return bookComponentState[0].trackChangesEnabled
    },
    async hasContent(bookComponent, _, ctx) {
      const bookComponentTranslation = await BookComponentTranslation.query()
        .where('bookComponentId', bookComponent.id)
        .andWhere('languageIso', 'en')

      const content = bookComponentTranslation[0].content || ''
      const hasContent = content.trim().length > 0
      return hasContent
    },
    async lock(bookComponent, _, ctx) {
      let locked = null

      const lock = await Lock.query().findOne('foreignId', bookComponent.id)

      if (lock) {
        const user = await User.findById(lock.userId)
        locked = {
          created: lock.created,
          tabId: lock.tabId,
          username: user.username,
          givenName: user.givenName,
          surname: user.surname,
          isAdmin: user.admin,
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
      ctx.connectors.BookComponentStateLoader.model.state.clear()

      const bookComponentState =
        await ctx.connectors.BookComponentStateLoader.model.state.load(
          bookComponent.id,
        )

      return bookComponentState[0].uploading
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

      return bookComponentState[0].workflowStages || null
    },

    async includeInToc(bookComponent, _, ctx) {
      const state = await bookComponent.getBookComponentState()
      return state.includeInToc
    },
    async bookStructureElements(bookComponent, _, ctx) {
      // const book = await Book.findById(bookComponent.bookId)

      const book = await Book.findById(bookComponent.bookId)

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

    //   const hasThreeLevels = book.bookStructure.levels.length > 2
    //   let bookStructureElements

    //   if (!hasThreeLevels) {
    //     bookStructureElements = [
    //       {
    //         groupHeader: 'Core Elements',
    //         items: [
    //           {
    //             displayName: 'Section',
    //             className: 'section',
    //             headingLevel: 2,
    //             nestedHeadingLevel: undefined,
    //             isSection: true,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Openers',
    //         items: [
    //           {
    //             displayName: 'Introduction',
    //             className: 'introduction',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Outline',
    //             className: 'outline',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Learning Objectives',
    //             className: 'learning-objectives',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Focus Questions',
    //             className: 'focus-questions',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Content Opener Image',
    //             className: 'content-opener-image',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Openers and Closers',
    //         items: [
    //           {
    //             displayName: 'Key Terms List',
    //             className: 'key-terms',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Self-reflection Activities',
    //             className: 'self-reflection-activities',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Closers',
    //         items: [
    //           {
    //             displayName: 'Review Activity',
    //             className: 'review-activity',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Summary',
    //             className: 'summary',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'References',
    //             className: 'references',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Bibliography',
    //             className: 'bibliography',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Further Reading',
    //             className: 'further-reading',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //     ]
    //   } else if (
    //     findIndex(book.bookStructure.levels, {
    //       type: bookComponent.componentType,
    //     }) > 0
    //   ) {
    //     bookStructureElements = [
    //       {
    //         groupHeader: 'Core Elements',
    //         items: [
    //           {
    //             displayName:
    //               book.bookStructure.levels[
    //                 book.bookStructure.levels.length - 2
    //               ].displayName,
    //             className:
    //               book.bookStructure.levels[
    //                 book.bookStructure.levels.length - 2
    //               ].type,
    //             headingLevel: 2,
    //             nestedHeadingLevel: undefined,
    //             isSection: true,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Openers',
    //         items: [
    //           {
    //             displayName: 'Introduction',
    //             className: 'introduction',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Outline',
    //             className: 'outline',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Learning Objectives',
    //             className: 'learning-objectives',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Focus Questions',
    //             className: 'focus-questions',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Content Opener Image',
    //             className: 'content-opener-image',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Openers and Closers',
    //         items: [
    //           {
    //             displayName: 'Key Terms List',
    //             className: 'key-terms',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Self-reflection Activities',
    //             className: 'self-reflection-activities',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Closers',
    //         items: [
    //           {
    //             displayName: 'Review Activity',
    //             className: 'review-activity',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Summary',
    //             className: 'summary',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'References',
    //             className: 'references',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Bibliography',
    //             className: 'bibliography',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Further Reading',
    //             className: 'further-reading',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //     ]
    //   } else {
    //     bookStructureElements = [
    //       {
    //         groupHeader: 'Openers',
    //         items: [
    //           {
    //             displayName: 'Introduction',
    //             className: 'introduction',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Outline',
    //             className: 'outline',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Learning Objectives',
    //             className: 'learning-objectives',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Focus Questions',
    //             className: 'focus-questions',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Content Opener Image',
    //             className: 'content-opener-image',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Openers and Closers',
    //         items: [
    //           {
    //             displayName: 'Key Terms List',
    //             className: 'key-terms',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Self-reflection Activities',
    //             className: 'self-reflection-activities',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //       {
    //         groupHeader: 'Closers',
    //         items: [
    //           {
    //             displayName: 'Review Activity',
    //             className: 'review-activity',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Summary',
    //             className: 'summary',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'References',
    //             className: 'references',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Bibliography',
    //             className: 'bibliography',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //           {
    //             displayName: 'Further Reading',
    //             className: 'further-reading',
    //             headingLevel: 2,
    //             nestedHeadingLevel: hasThreeLevels ? 3 : undefined,
    //             isSection: false,
    //           },
    //         ],
    //       },
    //     ]
    //   }

    //   return bookStructureElements
    // },
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
