const { logger, useTransaction } = require('@coko/server')
const BookCollection = require('../../models/bookCollection/bookCollection.model')
const BookCollectionTranslation = require('../../models/bookCollectionTranslation/bookCollectionTranslation.model')

const createBookCollection = async trx => {
  logger.info('>>> creating a new books collection')
  const createdBookCollection = await BookCollection.query(trx).insert({})
  logger.info(`books collection created with id: ${createdBookCollection.id}`)
  logger.info('>>> creating a new books collection translation')

  const createdBookCollectionTranslation =
    await BookCollectionTranslation.query(trx).insert({
      collectionId: createdBookCollection.id,
      languageIso: 'en',
      title: 'Books',
    })

  logger.info(
    `books collection translation created with id: ${createdBookCollectionTranslation.id}`,
  )
  return true
}

const createBookCollectionHandler = async () => {
  try {
    logger.info('>>> checking if books collection already exists...')

    const collection = await BookCollection.query()

    if (collection.length !== 0) {
      logger.warn('>>> collection already exists')
      return false
    }

    return useTransaction(createBookCollection)
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

module.exports = createBookCollectionHandler
