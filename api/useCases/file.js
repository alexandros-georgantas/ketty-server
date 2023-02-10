const { logger, useTransaction } = require('@coko/server')
const path = require('path')
const pickBy = require('lodash/pickBy')
const map = require('lodash/map')
const forEach = require('lodash/forEach')

const { File, FileTranslation, BookComponent } =
  require('../../data-model/src').models

const { deleteFiles: deleteRemoteFiles, signURL } = require('./objectStorage')
const { imageFinder } = require('../helpers/utils')

const createFile = async (
  { name, size, mimetype, tags, metadata, extension },
  { location, key },
  entityType,
  entityId,
  options = {},
) => {
  try {
    const tempFile = {
      // name: name.replace(/\.[^/.]+$/, ''), // strip the extension from the filename
      name: path.parse(name).name,
      source: location,
      objectKey: key,
      size,
      metadata,
      extension,
      tags,
      mimetype,
      bookId: entityType === 'book' ? entityId : undefined,
      templateId: entityType === 'template' ? entityId : undefined,
      bookComponentId: entityType === 'bookComponent' ? entityId : undefined,
    }

    const cleanedObject = pickBy(tempFile, v => v !== undefined)
    const { trx } = options
    logger.info(
      `>>> creating file representation for the file with name ${cleanedObject.name}`,
    )
    return useTransaction(async tr => File.query(tr).insert(cleanedObject), {
      trx,
    })
  } catch (e) {
    throw new Error(e)
  }
}

const updateFile = async (id, data, options = {}) => {
  try {
    const { trx } = options
    const { name, alt } = data
    return useTransaction(
      async tr => {
        logger.info(`>>> updating file with id ${id}`)

        if (alt) {
          const fileTranslation = await FileTranslation.query(tr).findOne({
            fileId: id,
            languageIso: 'en',
          })

          if (fileTranslation) {
            await FileTranslation.query(tr).patchAndFetchById(
              fileTranslation.id,
              {
                alt,
              },
            )
          } else {
            await FileTranslation.query(tr).insert({
              fileId: id,
              languageIso: 'en',
              alt,
            })
          }

          return File.query(tr).findById(id)
        }

        return File.query(tr).patchAndFetchById(id, { name })
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateFiles = async (ids, data, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        logger.info(`>>> updating files with ids ${ids}`)
        return File.query(tr).patch(data).whereIn(ids)
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const deleteFile = async (id, remoteToo = false, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        logger.info(
          `>>> deleting file representation from db with file id ${id}`,
        )

        const deletedFile = await File.query(tr).patchAndFetchById(id, {
          deleted: true,
        })

        const { id: deletedId, mimetype, objectKey } = deletedFile

        if (remoteToo) {
          const keys = []
          keys.push(objectKey)

          if (mimetype.match(/^image\//) && mimetype !== 'image/svg+xml') {
            const keyDeconstructed = objectKey.split('.')[0]
            logger.info(
              `>>> deleting actual file from file server with object key ${keyDeconstructed}`,
            )
            keys.push(
              `${keyDeconstructed}_small.png`,
              `${keyDeconstructed}_medium.png`,
            )
          }

          if (mimetype.match(/^image\//) && mimetype === 'image/svg+xml') {
            const keyDeconstructed = objectKey.split('.')[0]
            logger.info(
              `>>> deleting actual file from file server with object key ${keyDeconstructed}`,
            )
            keys.push(
              `${keyDeconstructed}_small.svg`,
              `${keyDeconstructed}_medium.svg`,
            )
          }

          await deleteRemoteFiles(keys)
        }

        return deletedId
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const deleteFiles = async (ids, remoteToo = false, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `>>> deleting file representations from db with file ids ${ids}`,
    )
    return useTransaction(
      async tr => {
        await File.query(tr).patch({ deleted: true }).whereIn('id', ids)
        const deletedFiles = await File.query(tr).whereIn('id', ids)

        if (remoteToo) {
          await Promise.all(
            map(deletedFiles, async deletedFile => {
              const { mimetype, objectKey } = deletedFile
              const keys = []
              keys.push(objectKey)

              if (mimetype.match(/^image\//) && mimetype !== 'image/svg+xml') {
                const keyDeconstructed = objectKey.split('.')[0]
                logger.info(
                  `>>> deleting actual file from file server with object key ${keyDeconstructed}`,
                )
                keys.push(
                  `${keyDeconstructed}_small.png`,
                  `${keyDeconstructed}_medium.png`,
                )
              }

              if (mimetype.match(/^image\//) && mimetype === 'image/svg+xml') {
                const keyDeconstructed = objectKey.split('.')[0]
                logger.info(
                  `>>> deleting actual file from file server with object key ${keyDeconstructed}`,
                )
                keys.push(
                  `${keyDeconstructed}_small.svg`,
                  `${keyDeconstructed}_medium.svg`,
                )
              }

              await deleteRemoteFiles(keys)
            }),
          )
        }

        return map(deletedFiles, file => file.id)
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getEntityFiles = async (
  entityId,
  entityType,
  orderParams = undefined,
  options = {},
) => {
  try {
    const { trx } = options
    logger.info(
      `>>> fetching files for entity ${entityType} with  id ${entityId}`,
    )
    return useTransaction(
      async tr => {
        if (orderParams) {
          const orderByParams = orderParams.map(option => {
            const { key, order } = option
            return { column: key, order }
          })

          logger.info(`>>> constructing orderBy params: ${orderByParams}`)

          return File.query(tr)
            .where({ [`${entityType}Id`]: entityId })
            .andWhere({ deleted: false })
            .orderBy(orderByParams)
        }

        return File.query(tr)
          .where({ [`${entityType}Id`]: entityId })
          .andWhere({ deleted: false })
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getFiles = async (options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching all files`)
    return useTransaction(
      async tr => File.query(tr).where({ deleted: false }),
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getSpecificFiles = async (ids, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching the files with ids ${ids}`)
    return useTransaction(
      async tr =>
        File.query(tr).whereIn('id', ids).andWhere({ deleted: false }),
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getFile = async (id, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching the file with id ${id}`)

    const file = await useTransaction(
      async tr => {
        const item = await File.query(tr).findById(id)

        if (item.deleted) {
          throw new Error('this file is deleted')
        }

        return item
      },
      { trx, passedTrxOnly: true },
    )

    return file
  } catch (e) {
    throw new Error(e)
  }
}

const getFileURL = async (id, size = undefined, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching the file with id ${id}`)

    const file = await useTransaction(
      async tr => {
        const item = await File.query(tr).findById(id)

        if (item.deleted) {
          throw new Error('this file is deleted')
        }

        return item
      },
      { trx, passedTrxOnly: true },
    )

    logger.info(`>>> signing url `)
    const { mimetype, objectKey } = file

    if (mimetype.match(/^image\//)) {
      if (size && size !== 'original' && mimetype !== 'image/svg+xml') {
        const deconstructedKey = objectKey.split('.')
        return signURL('getObject', `${deconstructedKey[0]}_${size}.png`)
      }

      if (size && size !== 'original' && mimetype === 'image/svg+xml') {
        const deconstructedKey = objectKey.split('.')
        return signURL('getObject', `${deconstructedKey[0]}_${size}.svg`)
      }
    }

    return signURL('getObject', objectKey)
  } catch (e) {
    throw new Error(e)
  }
}

const getContentFiles = async (fileIds, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> gathering image files with ids ${fileIds} from content`)
    return useTransaction(
      async tr => {
        const files = await getSpecificFiles(fileIds, { trx })
        return Promise.all(
          map(files, async file => {
            const { id, mimetype, objectKey } = file

            const translation = await FileTranslation.query(tr).where({
              fileId: id,
              languageIso: 'en',
            })

            /* eslint-disable no-param-reassign */
            file.alt = translation.length === 1 ? translation[0].alt : null

            if (mimetype.match(/^image\//)) {
              if (mimetype !== 'image/svg+xml') {
                file.mimetype = 'image/png'
                const deconstructedKey = objectKey.split('.')
                file.source = await signURL(
                  'getObject',
                  `${deconstructedKey[0]}_medium.png`,
                )
              } else {
                const deconstructedKey = objectKey.split('.')
                file.source = await signURL(
                  'getObject',
                  `${deconstructedKey[0]}_medium.svg`,
                )
              }

              return file
            }

            file.source = await signURL('getObject', objectKey)
            /* eslint-enable no-param-reassign */

            return file
          }),
        )
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const isFileInUse = async (bookId, fileId, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `>>> checking if the image with id ${fileId} is in use inside the book with id ${bookId}`,
    )
    return useTransaction(
      async tr => {
        const foundIn = []

        const bookComponentsOfBook = await BookComponent.query(tr)
          .select('book_component.id', 'book_component_translation.content')
          .leftJoin(
            'book_component_translation',
            'book_component.id',
            'book_component_translation.book_component_id',
          )
          .where({
            'book_component.book_id': bookId,
            'book_component.deleted': false,
            languageIso: 'en',
          })

        forEach(bookComponentsOfBook, bookComponent => {
          const { content, id } = bookComponent

          if (imageFinder(content, fileId)) {
            foundIn.push(id)
          }
        })
        logger.info(`>>> found in book components ${foundIn}`)
        return foundIn
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  createFile,
  updateFile,
  updateFiles,
  deleteFile,
  deleteFiles,
  getEntityFiles,
  getFiles,
  getSpecificFiles,
  getFile,
  getFileURL,
  getContentFiles,
  isFileInUse,
}
