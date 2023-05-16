const { withFilter } = require('graphql-subscriptions')
const { pubsubManager, logger } = require('@coko/server')
const map = require('lodash/map')
const isEmpty = require('lodash/isEmpty')

const {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  BOOK_RENAMED,
  BOOK_ARCHIVED,
  BOOK_METADATA_UPDATED,
  BOOK_RUNNING_HEADERS_UPDATED,
} = require('./constants')

const { getObjectTeam } = require('../../../controllers/team.controller')

const {
  pagedPreviewerLink,
} = require('../../../controllers/microServices.controller')

const {
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
  getBookTitle,
} = require('../../../controllers/book.controller')

const getBookHandler = async (_, { id }, ctx, info) => {
  try {
    logger.info('book resolver: executing getBook use case')
    return getBook(id)
  } catch (e) {
    throw new Error(e)
  }
}

const getBooksHandler = async (_, { options }, ctx) => {
  try {
    const { archived, orderBy, page, pageSize } = options
    logger.info('book resolver: executing getBooks use case')
    return getBooks({
      userId: ctx.user,
      options: { showArchived: archived, orderBy, page, pageSize },
    })
  } catch (e) {
    throw new Error(e)
  }
}

const createBookHandler = async (_, { input }, ctx) => {
  try {
    logger.info('book resolver: executing createBook use case')

    const { collectionId, title, addUserToBookTeams } = input
    const pubsub = await pubsubManager.getPubsub()
    let newBook

    if (addUserToBookTeams && !isEmpty(addUserToBookTeams)) {
      newBook = await createBook({
        collectionId,
        title,
        options: {
          addUserToBookTeams,
          userId: ctx.user,
        },
      })
    } else {
      newBook = await createBook({ collectionId, title })
    }

    logger.info('book resolver: broadcasting new book to clients')

    pubsub.publish(BOOK_CREATED, { bookCreated: newBook.id })

    return newBook
  } catch (e) {
    throw new Error(e)
  }
}

const renameBookHandler = async (_, { id, title }, ctx) => {
  try {
    logger.info('book resolver: executing renameBook use case')

    const pubsub = await pubsubManager.getPubsub()

    const renamedBook = await renameBook(id, title)

    logger.info('book resolver: broadcasting renamed book to clients')

    pubsub.publish(BOOK_UPDATED, {
      bookUpdated: renamedBook,
    })

    pubsub.publish(BOOK_RENAMED, {
      bookRenamed: renamedBook.id,
    })

    return renamedBook
  } catch (e) {
    throw new Error(e)
  }
}

const deleteBookHandler = async (_, args, ctx) => {
  try {
    logger.info('book resolver: executing deleteBook use case')
    const pubsub = await pubsubManager.getPubsub()

    const deletedBook = await deleteBook(args.id)

    logger.info('book resolver: broadcasting deleted book to clients')

    pubsub.publish(BOOK_DELETED, {
      bookDeleted: deletedBook.id,
    })

    return deletedBook
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const archiveBookHandler = async (_, { id, archive }, ctx) => {
  try {
    logger.info('book resolver: executing archiveBook use case')
    const pubsub = await pubsubManager.getPubsub()

    const archivedBook = await archiveBook(id, archive)

    logger.info('book resolver: broadcasting archived book to clients')

    pubsub.publish(BOOK_ARCHIVED, {
      bookArchived: archivedBook.id,
    })
    return archivedBook
  } catch (e) {
    throw new Error(e)
  }
}

const updateMetadataHandler = async (_, { input }, ctx) => {
  try {
    logger.info('book resolver: executing updateMetadata use case')
    const pubsub = await pubsubManager.getPubsub()

    const updatedBook = await updateMetadata(input)

    logger.info('book resolver: broadcasting updated book to clients')

    pubsub.publish(BOOK_METADATA_UPDATED, {
      bookMetadataUpdated: updatedBook.id,
    })
    return updatedBook
  } catch (e) {
    throw new Error(e)
  }
}

const exportBookHandler = async (_, { input }, ctx) => {
  const { bookId, mode, previewer, templateId, fileExtension, icmlNotes } =
    input

  try {
    logger.info('book resolver: executing exportBook use case')
    return exportBook(
      bookId,
      mode,
      templateId,
      previewer,
      fileExtension,
      icmlNotes,
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateRunningHeadersHandler = async (_, { input, bookId }, ctx) => {
  try {
    logger.info('book resolver: executing updateRunningHeaders use case')
    const pubsub = await pubsubManager.getPubsub()
    const updatedBook = await updateRunningHeaders(input, bookId)

    logger.info('book resolver: broadcasting updated book to clients')

    pubsub.publish(BOOK_RUNNING_HEADERS_UPDATED, {
      bookRunningHeadersUpdated: updatedBook.id,
    })

    return updatedBook
  } catch (e) {
    throw new Error(e)
  }
}

const changeLevelLabelHandler = async (_, { bookId, levelId, label }, ctx) => {
  try {
    logger.info('book resolver: executing changeLevelLabel use case')
    // const pubsub = await pubsubManager.getPubsub()
    const updatedLevel = await changeLevelLabel(bookId, levelId, label)

    // logger.info('book resolver: broadcasting updated book to clients')

    // pubsub.publish(BOOK_RUNNING_HEADERS_UPDATED, {
    //   bookRunningHeadersUpdated: updatedBook,
    // })

    return updatedLevel
  } catch (e) {
    throw new Error(e)
  }
}

const changeNumberOfLevelsHandler = async (
  _,
  { bookId, levelsNumber },
  ctx,
) => {
  try {
    logger.info(
      'book resolver: executing changeBookStructureLevelNumber use case',
    )

    // const pubsub = await pubsubManager.getPubsub()
    const updatedBookStructure = await changeNumberOfLevels(
      bookId,
      levelsNumber,
    )

    // logger.info('book resolver: broadcasting updated book to clients')

    // pubsub.publish(BOOK_RUNNING_HEADERS_UPDATED, {
    //   bookRunningHeadersUpdated: updatedBook,
    // })

    return updatedBookStructure
  } catch (e) {
    throw new Error(e)
  }
}

const updateBookOutlineHandler = async (_, { bookId, outline }, ctx) => {
  try {
    logger.info('book resolver: executing updateBookOutline use case')
    // const pubsub = await pubsubManager.getPubsub()
    const updatedOutline = await updateBookOutline(bookId, outline)

    // logger.info('book resolver: broadcasting updated book to clients')

    // pubsub.publish(BOOK_RUNNING_HEADERS_UPDATED, {
    //   bookRunningHeadersUpdated: updatedBook,
    // })

    return updatedOutline
  } catch (e) {
    throw new Error(e)
  }
}

const getPagedPreviewerLinkHandler = async (_, { hash }, ctx) => {
  try {
    logger.info('book resolver: executing getPreviewerLink use case')
    return pagedPreviewerLink(hash)
  } catch (e) {
    throw new Error(e)
  }
}

const updateLevelContentStructureHandler = async (
  _,
  { bookId, levels },
  cx,
) => {
  try {
    logger.info('book resolver: executing updateLevelContentStructure use case')

    const updatedLevelsStructure = await updateLevelContentStructure(
      bookId,
      levels,
    )

    return updatedLevelsStructure
  } catch (e) {
    throw new Error(e)
  }
}

const finalizeBookStructureHandler = async (_, { bookId }, cx) => {
  try {
    logger.info('book resolver: executing finalizeBookStructure use case')
    const pubsub = await pubsubManager.getPubsub()
    const updatedBook = await finalizeBookStructure(bookId)
    // should add a specific event for the case of finalized
    pubsub.publish(BOOK_ARCHIVED, {
      bookArchived: updatedBook.id,
    })
    return updatedBook.id
  } catch (e) {
    throw new Error(e)
  }
}

const updateShowWelcomeHandler = async (_, { bookId }, cx) => {
  try {
    logger.info('book resolver: executing updateShowWelcome use case')
    const pubsub = await pubsubManager.getPubsub()
    const updatedBook = await updateShowWelcome(bookId)
    // should add a specific event for the case of finalized
    pubsub.publish(BOOK_ARCHIVED, {
      bookArchived: updatedBook.id,
    })
    return updatedBook
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getBook: getBookHandler,
    getPagedPreviewerLink: getPagedPreviewerLinkHandler,
    getBooks: getBooksHandler,
  },
  Mutation: {
    archiveBook: archiveBookHandler,
    createBook: createBookHandler,
    renameBook: renameBookHandler,
    deleteBook: deleteBookHandler,
    exportBook: exportBookHandler,
    updateMetadata: updateMetadataHandler,
    updateRunningHeaders: updateRunningHeadersHandler,
    changeLevelLabel: changeLevelLabelHandler,
    changeNumberOfLevels: changeNumberOfLevelsHandler,
    updateBookOutline: updateBookOutlineHandler,
    updateLevelContentStructure: updateLevelContentStructureHandler,
    updateShowWelcome: updateShowWelcomeHandler,
    finalizeBookStructure: finalizeBookStructureHandler,
  },
  Book: {
    async title(book, _, ctx) {
      let { title } = book

      /* eslint-disable no-prototype-builtins */
      if (!book.hasOwnProperty('title')) {
        title = await getBookTitle(book.id)
      }
      /* eslint-enable no-prototype-builtins */

      return title
    },
    divisions(book, _, ctx) {
      return book.divisions
    },
    archived(book, _, ctx) {
      return book.archived
    },
    async authors(book, args, ctx, info) {
      const authorsTeam = await getObjectTeam('author', book.id, true)

      let authors = []

      if (authorsTeam && authorsTeam.users.length > 0) {
        authors = authorsTeam.users
      }

      return authors
    },
    async isPublished(book, args, ctx, info) {
      let isPublished = false

      if (book.publicationDate) {
        const date = book.publicationDate
        const inTimestamp = new Date(date).getTime()
        const nowDate = new Date()
        const nowTimestamp = nowDate.getTime()

        if (inTimestamp <= nowTimestamp) {
          isPublished = true
        } else {
          isPublished = false
        }
      }

      return isPublished
    },
    async productionEditors(book, _, ctx) {
      const productionEditorsTeam = await getObjectTeam(
        'productionEditor',
        book.id,
        true,
      )

      let productionEditors = []

      if (productionEditorsTeam && productionEditorsTeam.users.length > 0) {
        productionEditors = map(productionEditorsTeam.users, teamMember => {
          const { givenNames, surname } = teamMember
          return `${givenNames} ${surname}`
        })
      }

      return productionEditors
    },
  },
  Subscription: {
    bookCreated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_CREATED)
      },
    },
    bookUpdated: {
      subscribe: async (...args) => {
        const pubsub = await pubsubManager.getPubsub()

        return withFilter(
          () => {
            return pubsub.asyncIterator(BOOK_UPDATED)
          },
          (payload, variables) => {
            const { id: bookId } = variables
            const { bookUpdated } = payload
            const { id } = bookUpdated
            return bookId === id
          },
        )(...args)
      },
    },
    bookArchived: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_ARCHIVED)
      },
    },
    bookDeleted: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_DELETED)
      },
    },
    bookRenamed: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_RENAMED)
      },
    },
    bookMetadataUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_METADATA_UPDATED)
      },
    },
    bookRunningHeadersUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_RUNNING_HEADERS_UPDATED)
      },
    },
  },
}
