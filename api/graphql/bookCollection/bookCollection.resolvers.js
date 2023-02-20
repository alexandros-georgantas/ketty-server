const { logger, pubsubManager } = require('@coko/server')
const orderBy = require('lodash/orderBy')
const map = require('lodash/map')
const find = require('lodash/find')

const { BookCollectionTranslation, BookTranslation } =
  require('../../../models').models

const { getEntityTeam } = require('../../../controllers/team.controller')

const {
  getBookCollection,
  getBookCollections,
  createBookCollection,
} = require('../../../controllers/bookCollection.controller')

const { getBooks } = require('../../../controllers/book.controller')

const { COLLECTION_ADDED } = require('./constants')

const getBookCollectionHandler = async (_, { input }, ctx) => {
  try {
    const { id } = input

    logger.info(
      'book collection resolver: executing getBookCollection use case',
    )

    return getBookCollection(id)
  } catch (e) {
    throw new Error(e)
  }
}

const getBookCollectionsHandler = async (_, __, ctx) => {
  try {
    logger.info(
      'book collection resolver: executing getBookCollections use case',
    )

    return getBookCollections()
  } catch (e) {
    throw new Error(e)
  }
}

const createBookCollectionHandler = async (_, { input }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const { title, languageIso } = input

    logger.info(
      'book collection resolver: executing createBookCollection use case',
    )

    const createdBookCollection = await createBookCollection(title, languageIso)

    logger.info(
      'book collection resolver: broadcasting new book collection to clients',
    )

    pubsub.publish(COLLECTION_ADDED, { collectionAdded: createdBookCollection })

    return createdBookCollection
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getBookCollection: getBookCollectionHandler,
    getBookCollections: getBookCollectionsHandler,
  },
  Mutation: {
    createBookCollection: createBookCollectionHandler,
  },
  BookCollection: {
    async title(bookCollection, _, ctx) {
      const bookCollectionTranslation = await BookCollectionTranslation.findOne(
        { collectionId: bookCollection.id, languageIso: 'en' },
      )

      return bookCollectionTranslation.title
    },
    async books(bookCollection, { ascending, sortKey, archived }, ctx, info) {
      const books = await getBooks(bookCollection.id, archived, ctx.user)

      const sortable = await Promise.all(
        map(books, async book => {
          const translation = await BookTranslation.findOne({
            bookId: book.id,
            languageIso: 'en',
          })

          const { title } = translation

          const authorsTeam = await getEntityTeam(
            book.id,
            'book',
            'author',
            true,
          )

          let auth = 'z'

          if (authorsTeam && authorsTeam.members.length > 0) {
            auth = authorsTeam.members[0].surname
          }

          let status = 0

          if (book.publicationDate !== null) {
            const date = book.publicationDate
            const inTimestamp = new Date(date).getTime()
            const nowDate = new Date()
            const nowTimestamp = nowDate.getTime()

            if (inTimestamp <= nowTimestamp) {
              status = 1
            } else {
              status = 0
            }
          }

          return {
            id: book.id,
            title: title.toLowerCase().trim(),
            status,
            author: auth,
          }
        }),
      )

      const order = ascending ? 'asc' : 'desc'
      const sorter = []

      if (sortKey === 'title') {
        sorter.push(sortKey)
      } else {
        sorter.push(sortKey)
        sorter.push('title')
      }

      const sorted = orderBy(sortable, sorter, [order])
      const result = map(sorted, item => find(books, { id: item.id }))
      return result
    },
  },
  Subscription: {
    collectionAdded: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(COLLECTION_ADDED)
      },
    },
  },
}
