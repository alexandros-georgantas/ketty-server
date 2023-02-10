/* eslint-disable no-param-reassign */
const config = require('config')
const { logger } = require('@coko/server')
const { isAuthenticatedUser } = require('./wsAuthentication')

const {
  unlockOrphanLocks,
  cleanUpLocks,
} = require('../services/bookComponentLock.service')

const establishConnection = async (ws, req) => {
  try {
    const serverURL = config.has('pubsweet-server.publicURL')
      ? config.get('pubsweet-server.publicURL')
      : config.get('pubsweet-server.baseUrl')

    const url = new URL(req.url, serverURL)

    const token = url.searchParams.get('token')
    const bookComponentId = url.searchParams.get('bookComponentId')
    const tabId = url.searchParams.get('tabId')
    const user = await isAuthenticatedUser(token)

    if (!user) {
      ws.close()
    }

    ws.userId = user.id
    ws.bookComponentId = bookComponentId
    ws.tabId = tabId
  } catch (e) {
    ws.close()
  }
}

const heartbeat = ws => (ws.isAlive = true)

const initializeHeartbeat = async WSServer => {
  try {
    return setInterval(async () => {
      logger.info(`############ WS HEARTBEAT ############`)
      logger.info(
        `current connected clients via WS are ${WSServer.clients.size}`,
      )

      WSServer.clients.forEach(ws => {
        if (ws.isAlive === false) {
          logger.info(`########### BROKEN CONNECTION DETECTED ###########`)
          logger.info(
            `ws connection is broken for book component with id ${ws.bookComponentId} and userId ${ws.userId}`,
          )
          return ws.terminate()
        }

        ws.isAlive = false

        return ws.ping()
      })
      logger.info(`########## WS HEARTBEAT END ##########`)
    }, config['pubsweet-server'].wsHeartbeatInterval || 5000)
  } catch (e) {
    throw new Error(e)
  }
}

const initializeFailSafeUnlocking = async WSServer => {
  try {
    return setInterval(async () => {
      logger.info(`########### LOCK FAIL-SAFE ###########`)
      logger.info(
        `current connected clients via WS are ${WSServer.clients.size}`,
      )
      const lockedBookComponentIds = []
      WSServer.clients.forEach(ws => {
        lockedBookComponentIds.push(ws.bookComponentId)
      })

      if (lockedBookComponentIds.length === 0) {
        await cleanUpLocks(true)
      }

      if (lockedBookComponentIds.length > 0) {
        await unlockOrphanLocks(lockedBookComponentIds)
      }

      logger.info(`######### LOCK FAIL-SAFE END #########`)
      return true
    }, config['pubsweet-server'].failSafeUnlockingInterval || 7000)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  establishConnection,
  heartbeat,
  initializeHeartbeat,
  initializeFailSafeUnlocking,
}
