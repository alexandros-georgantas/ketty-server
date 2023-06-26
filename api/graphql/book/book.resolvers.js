const { withFilter } = require('graphql-subscriptions')
const { pubsubManager, logger, fileStorage } = require('@coko/server')
const { getUser } = require('@coko/server/src/models/user/user.controller')
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

const { getURL } = fileStorage

const {
  pagedPreviewerLink,
} = require('../../../controllers/microServices.controller')

const File = require('../../../models/file/file.model')

const {
  getBook,
  getBooks,
  archiveBook,
  createBook,
  renameBook,
  updateSubtitle,
  deleteBook,
  exportBook,
  updateMetadata,
  updatePODMetadata,
  updateRunningHeaders,
  changeLevelLabel,
  changeNumberOfLevels,
  updateBookOutline,
  updateLevelContentStructure,
  updateShowWelcome,
  finalizeBookStructure,
  getBookTitle,
  updateAssociatedTemplates,
  updateBookStatus,
  getBookSubtitle,
  uploadBookThumbnail,
} = require('../../../controllers/book.controller')

const updateAssociatedTemplateHandler = async (
  _,
  { bookId, associatedTemplates },
  ctx,
) => {
  try {
    logger.info('book resolver: executing updateAssociatedTemplate use case')

    const pubsub = await pubsubManager.getPubsub()

    const updatedBook = await updateAssociatedTemplates(
      bookId,
      associatedTemplates,
    )

    pubsub.publish(BOOK_UPDATED, {
      bookUpdated: updatedBook,
    })

    return updatedBook
  } catch (e) {
    throw new Error(e)
  }
}

const updateBookStatusHandler = async (_, { bookId, status }, ctx) => {
  try {
    logger.info('book resolver: executing updateBookStatus use case')

    const pubsub = await pubsubManager.getPubsub()

    const updatedBook = await updateBookStatus(bookId, status)

    logger.info('book resolver: broadcasting updated book to clients')

    pubsub.publish(BOOK_UPDATED, { bookUpdated: updatedBook.id })

    return updatedBook
  } catch (e) {
    throw new Error(e)
  }
}

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

      const updatedUser = await getUser(ctx.user)

      pubsub.publish('USER_UPDATED', { userUpdated: updatedUser })
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

const updateSubtitleHandler = async (_, { id, subtitle }, ctx) => {
  try {
    logger.info('book resolver: executing updateSubtitle use case')

    const pubsub = await pubsubManager.getPubsub()

    const updatedBook = await updateSubtitle(id, subtitle)

    logger.info('book resolver: broadcasting updated book subtitle to clients')

    pubsub.publish(BOOK_UPDATED, {
      bookUpdated: updatedBook,
    })

    return updatedBook
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

const updatePODMetadataHandler = async (_, { bookId, metadata }, ctx) => {
  try {
    logger.info('book resolver: executing updatePODMetadata use case')
    const pubsub = await pubsubManager.getPubsub()

    const updatedBook = await updatePODMetadata(bookId, metadata)

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
  const {
    bookId,
    previewer,
    templateId,
    fileExtension,
    icmlNotes,
    additionalExportOptions = {},
  } = input

  try {
    logger.info('book resolver: executing exportBook use case')
    return exportBook(
      bookId,
      templateId,
      previewer,
      fileExtension,
      icmlNotes,
      additionalExportOptions,
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

const getPagedPreviewerLinkHandler = async (
  _,
  { hash, previewerOptions },
  ctx,
) => {
  try {
    logger.info('book resolver: executing getPreviewerLink use case')
    return pagedPreviewerLink(hash, previewerOptions)
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

const uploadBookThumbnailHandler = async (_, { bookId, file }, cx) => {
  try {
    logger.info('book resolver: uploading book thumbnail')

    const pubsub = await pubsubManager.getPubsub()

    const updatedBook = await uploadBookThumbnail(bookId, file)

    pubsub.publish(BOOK_UPDATED, {
      bookUpdated: updatedBook,
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
    updateSubtitle: updateSubtitleHandler,
    deleteBook: deleteBookHandler,
    exportBook: exportBookHandler,
    updateMetadata: updateMetadataHandler,
    updatePODMetadata: updatePODMetadataHandler,
    updateRunningHeaders: updateRunningHeadersHandler,
    changeLevelLabel: changeLevelLabelHandler,
    changeNumberOfLevels: changeNumberOfLevelsHandler,
    updateBookOutline: updateBookOutlineHandler,
    updateLevelContentStructure: updateLevelContentStructureHandler,
    updateShowWelcome: updateShowWelcomeHandler,
    finalizeBookStructure: finalizeBookStructureHandler,
    updateAssociatedTemplates: updateAssociatedTemplateHandler,
    updateBookStatus: updateBookStatusHandler,
    uploadBookThumbnail: uploadBookThumbnailHandler,
  },
  Book: {
    async title(book, _, ctx) {
      const { title } = book

      if (!title) {
        return getBookTitle(book.id)
      }

      return title
    },
    async subtitle(book, _, ctx) {
      const { subtitle } = book

      if (!subtitle) {
        return getBookSubtitle(book.id)
      }

      return subtitle
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
    async thumbnailURL(book, _, ctx) {
      if (book.thumbnailId) {
        const thumbnailFile = await File.findById(book.thumbnailId)

        if (thumbnailFile) {
          const thumbnailURL = getURL(
            thumbnailFile.getStoredObjectBasedOnType('small').key,
          )

          return thumbnailURL
        }
      }

      return null
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