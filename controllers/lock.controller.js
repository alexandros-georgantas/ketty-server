const { logger, useTransaction } = require('@coko/server')
const moment = require('moment')
const config = require('config')

const { Lock } = require('../models').models

const timePadding = 0.3

const heartbeatIntervalInSeconds =
  (config['pubsweet-server'].wsHeartbeatInterval || 5000) / 1000

const inactiveLockTimeFactor = heartbeatIntervalInSeconds + timePadding

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

const getOrphanLocks = async (
  bookComponentIdsWithActiveConnection,
  options = {},
) => {
  try {
    const { trx } = options
    return Lock.query(trx)
      .whereNotIn('foreignId', bookComponentIdsWithActiveConnection)
      .whereRaw(
        `TIMEZONE('UTC',is_active_at) < TIMEZONE('UTC',NOW()) - INTERVAL '${inactiveLockTimeFactor} SECONDS'`,
      )
  } catch (e) {
    throw new Error(e)
  }
}

const getInactiveLocks = async (options = {}) => {
  try {
    const { trx } = options
    return Lock.query(trx).whereRaw(
      `TIMEZONE('UTC',is_active_at) < TIMEZONE('UTC',NOW()) - INTERVAL '${inactiveLockTimeFactor} SECONDS'`,
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  updateIsActiveAt,
  getOrphanLocks,
  getInactiveLocks,
}
