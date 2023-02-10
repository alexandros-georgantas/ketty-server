const { logger, useTransaction } = require('@coko/server')

const {
  BookCollectionTranslation,
  BookCollection,
} = require('../../data-model/src').models

const getBookCollection = async (id, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching book collection with id ${id}`)

    const bookCollection = await useTransaction(
      async tr =>
        BookCollection.query(tr).where({
          id,
          deleted: false,
        }),
      { trx, passedTrxOnly: true },
    )

    if (bookCollection.length === 0) {
      throw Error(`book collection with id ${id} does not exist`)
    }

    return bookCollection[0]
  } catch (e) {
    throw new Error(e)
  }
}

const getBookCollections = async (options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching all book collections`)

    return useTransaction(
      async tr => BookCollection.query(tr).where({ deleted: false }),
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const createBookCollection = async (
  title,
  languageIso = 'en',
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        logger.info('>>> creating a new books collection')

        const createdBookCollection = await BookCollection.query(tr).insert({})

        logger.info(
          `>>> books collection created with id: ${createdBookCollection.id}`,
        )

        logger.info('>>> creating a new books collection translation')

        const createdBookCollectionTranslation = await BookCollectionTranslation.query(
          tr,
        ).insert({
          collectionId: createdBookCollection.id,
          languageIso,
          title,
        })

        logger.info(
          `>>> books collection translation created with id: ${createdBookCollectionTranslation.id}`,
        )

        return createdBookCollection
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  getBookCollection,
  getBookCollections,
  createBookCollection,
}
