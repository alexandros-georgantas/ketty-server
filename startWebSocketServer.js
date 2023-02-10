/* eslint-disable no-param-reassign */
const { WebSocketServer } = require('ws')
const { logger } = require('@coko/server')
const config = require('config')

const {
  establishConnection,
  heartbeat,
  initializeHeartbeat,
  initializeFailSafeUnlocking,
} = require('./utils/wsConnectionHandlers')

const { unlockBookComponent } = require('./services/bookComponentLock.service')

let WSServer

const startWSServer = async () => {
  let HEARTBEAT_INTERVAL_REFERENCE
  let FAILSAFE_UNLOCK_REFERENCE

  try {
    if (!WSServer) {
      if (!config.has('pubsweet-server.WSServerPort')) {
        logger.warn(
          'You should declare a port for your websocket server. Now the default value of 3333 is in use',
        )
      }

      const wsPort = config['pubsweet-server'].WSServerPort || 3333

      WSServer = new WebSocketServer({
        port: wsPort,
        path: '/locks',
        clientTracking: true,
      })

      logger.info(`WS server started on port ${wsPort}`)
    }

    // WS_SERVER EVENT LISTENERS SECTION
    WSServer.on('connection', async (ws, req) => {
      // INITIALIZATION SECTION
      await establishConnection(ws, req)
      ws.isAlive = true
      // INITIALIZATION SECTION END

      // WS EVENT LISTENERS SECTION
      ws.on('pong', () => heartbeat(ws))

      ws.on('open', () => {
        logger.info(
          `WS open event for book component with id ${ws.bookComponentId}, tabId ${ws.tabId} and userId ${ws.userId}`,
        )
      })
      ws.on('close', async () => {
        logger.info(
          `WS close event for book component with id ${ws.bookComponentId}, tabId ${ws.tabId} and userId ${ws.userId}`,
        )
        return unlockBookComponent(ws.bookComponentId, ws.userId, ws.tabId)
      })
      // WS EVENT LISTENERS SECTION END
    })

    HEARTBEAT_INTERVAL_REFERENCE = initializeHeartbeat(WSServer)
    FAILSAFE_UNLOCK_REFERENCE = initializeFailSafeUnlocking(WSServer)

    WSServer.on('close', async () => {
      clearInterval(HEARTBEAT_INTERVAL_REFERENCE)
      clearInterval(FAILSAFE_UNLOCK_REFERENCE)
      logger.info('###### WS SERVER IS CLOSING ######')
      WSServer.clients.forEach(ws => {
        ws.terminate()
      })
    })
    // WS_SERVER EVENT LISTENERS SECTION END
  } catch (e) {
    if (HEARTBEAT_INTERVAL_REFERENCE) {
      clearInterval(HEARTBEAT_INTERVAL_REFERENCE)
    }

    if (FAILSAFE_UNLOCK_REFERENCE) {
      clearInterval(FAILSAFE_UNLOCK_REFERENCE)
    }

    throw new Error(e)
  }
}

module.exports = { startWSServer }
