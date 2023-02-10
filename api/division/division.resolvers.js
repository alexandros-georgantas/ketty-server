const { pubsubManager, logger } = require('@coko/server')

const { BOOK_COMPONENT_ORDER_UPDATED } = require('./constants')

const {
  useCaseUpdateDivisionBookComponentOrder,
  useCaseGetDivision,
} = require('../useCases')

const updateBookComponentOrder = async (
  _,
  { targetDivisionId, bookComponentId, index },
  ctx,
) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    logger.info(
      'division resolver: executing updateBookComponentOrder use case',
    )

    const book = await useCaseUpdateDivisionBookComponentOrder(
      targetDivisionId,
      bookComponentId,
      index,
    )

    pubsub.publish(`BOOK_UPDATED`, {
      bookUpdated: book,
    })

    pubsub.publish(BOOK_COMPONENT_ORDER_UPDATED, {
      bookComponentOrderUpdated: book,
    })

    logger.info(
      'custom tags resolver: broadcasting new book components order to clients',
    )
    return book
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Mutation: {
    updateBookComponentOrder,
  },
  Division: {
    async bookComponents(divisionId, _, ctx) {
      ctx.connectors.DivisionLoader.model.bookComponents.clear()
      return ctx.connectors.DivisionLoader.model.bookComponents.load(divisionId)
    },
    async label(divisionId, _, ctx) {
      const dbDivision = await useCaseGetDivision(divisionId)
      return dbDivision.label
    },
    async id(divisionId, _, ctx) {
      return divisionId
    },
  },
  Subscription: {
    bookComponentOrderUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_COMPONENT_ORDER_UPDATED)
      },
    },
  },
}
