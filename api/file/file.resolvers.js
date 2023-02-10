const { logger } = require('@coko/server')
const map = require('lodash/map')
const { pubsubManager } = require('@coko/server')

const { FileTranslation, BookComponent } =
  require('../../data-model/src').models

const {
  useCaseUploadFile,
  useCaseUpdateFile,
  useCaseCreateFile,
  useCaseGetEntityFiles,
  useCaseGetSpecificFiles,
  useCaseGetFiles,
  useCaseGetFile,
  useCaseSignURL,
  useCaseDeleteDBFiles,
  // useCaseIsFileInUse,
} = require('../useCases')

const { imageFinder } = require('../helpers/utils')

const { FILES_UPLOADED, FILE_UPDATED, FILES_DELETED } = require('./consts')

const getEntityFiles = async (_, { input }, ctx) => {
  try {
    const { entityId, entityType, sortingParams, includeInUse = false } = input

    // return useCaseGetEntityFiles(entityId, entityType, sortingParams)
    const files = await useCaseGetEntityFiles(
      entityId,
      entityType,
      sortingParams,
    )

    if (includeInUse) {
      const bookComponentsOfBook = await BookComponent.query()
        .select('book_component.id', 'book_component_translation.content')
        .leftJoin(
          'book_component_translation',
          'book_component.id',
          'book_component_translation.book_component_id',
        )
        .where({
          'book_component.book_id': entityId,
          'book_component.deleted': false,
          languageIso: 'en',
        })

      files.forEach(file => {
        const foundIn = []
        bookComponentsOfBook.forEach(bookComponent => {
          const { content, id } = bookComponent

          if (imageFinder(content, file.id)) {
            foundIn.push(id)
          }
        })
        /* eslint-disable no-param-reassign */
        file.inUse = foundIn.length > 0
        /* eslint-enable no-param-reassign */
      })
    }

    return files
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const getSpecificFiles = async (_, { ids }, ctx) => {
  try {
    return useCaseGetSpecificFiles(ids)
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const getFiles = async (_, __, ctx) => {
  try {
    return useCaseGetFiles()
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const getFile = async (_, { id }, ctx) => {
  try {
    return useCaseGetFile(id)
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const uploadFiles = async (_, { files, entityType, entityId }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()

    const uploadedFiles = await Promise.all(
      map(files, async file => {
        const { createReadStream, filename, mimetype, encoding } = await file
        const fileStream = createReadStream()

        const { original } = await useCaseUploadFile(
          fileStream,
          filename,
          mimetype,
          encoding,
        )

        const { key, location, metadata, size, extension } = original
        return useCaseCreateFile(
          { name: filename, size, mimetype, metadata, extension },
          { location, key },
          entityType,
          entityId,
        )
      }),
    )

    pubsub.publish(FILES_UPLOADED, {
      filesUploaded: true,
    })
    return uploadedFiles
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const updateFile = async (_, { input }, ctx) => {
  try {
    const { id, name, alt } = input
    const pubsub = await pubsubManager.getPubsub()
    const updatedFile = await useCaseUpdateFile(id, { name, alt })
    pubsub.publish(FILE_UPDATED, {
      fileUpdated: updatedFile,
    })
    return updatedFile
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const deleteFiles = async (_, { ids, remoteToo }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    let deletedFiles

    if (remoteToo) {
      deletedFiles = await useCaseDeleteDBFiles(ids, remoteToo)
    } else {
      deletedFiles = await useCaseDeleteDBFiles(ids)
    }

    pubsub.publish(FILES_DELETED, {
      filesDeleted: true,
    })
    return deletedFiles
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getEntityFiles,
    getSpecificFiles,
    getFiles,
    getFile,
  },
  Mutation: {
    uploadFiles,
    updateFile,
    deleteFiles,
  },
  File: {
    async alt({ id }, _, ctx) {
      const translation = await FileTranslation.query().where({
        fileId: id,
        languageIso: 'en',
      })

      if (translation.length === 1) return translation[0].alt

      return null
    },
    async source({ objectKey, mimetype }, { size }, ctx) {
      if (mimetype.match(/^image\//)) {
        if (size && size !== 'original' && mimetype !== 'image/svg+xml') {
          const deconstructedKey = objectKey.split('.')
          return useCaseSignURL(
            'getObject',
            `${deconstructedKey[0]}_${size}.png`,
          )
        }

        if (size && size !== 'original' && mimetype === 'image/svg+xml') {
          const deconstructedKey = objectKey.split('.')
          return useCaseSignURL(
            'getObject',
            `${deconstructedKey[0]}_${size}.svg`,
          )
        }
      }

      return useCaseSignURL('getObject', objectKey)
    },
    async mimetype({ mimetype }, { target }, ctx) {
      if (mimetype.match(/^image\//)) {
        if (target && target === 'editor' && mimetype !== 'image/svg+xml') {
          return 'image/png'
        }

        if (target && target === 'editor' && mimetype === 'image/svg+xml') {
          return 'image/svg+xml'
        }
      }

      return mimetype
    },
    // ## for now in use will be computed in the parent query
    // ## as a workaround of the connection pool timeouts
    // ## this is not permanent
    // async inUse({ id, mimetype, bookId }, _, ctx) {
    //   let inUse = []
    //   if (mimetype.match(/^image\//)) {
    //     inUse = await useCaseIsFileInUse(bookId, id)
    //   }
    //   return inUse.length > 0
    // },
  },
  Subscription: {
    filesUploaded: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(FILES_UPLOADED)
      },
    },
    filesDeleted: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(FILES_DELETED)
      },
    },
    fileUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(FILE_UPDATED)
      },
    },
  },
}
