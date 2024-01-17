const { logger, useTransaction } = require('@coko/server')
const moment = require('moment')

const { Lock } = require('../models').models

const updateIsActiveAt = async (
  bookComponentId,
  tabId,
  userId,
  options = {},
) => {
  try {
    const { trx } = options

    logger.info(
      `>>> updating isActiveAt for lock of the book component with id ${bookComponentId}, tabId ${tabId} for user with id ${userId}`,
    )

    if (!bookComponentId || !tabId || !userId) {
      throw new Error(
        'bookComponentId, tabId and userId are required in order to update isActiveAt property',
      )
    }

    return useTransaction(
      async tr =>
        Lock.query(tr).patch({ isActiveAt: moment().utc().toDate() }).where({
          foreignId: bookComponentId,
          userId,
          tabId,
        }),
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  updateIsActiveAt,
}
