const { startServer, logger } = require('@coko/server')
const config = require('config')

const scripts = config.get('export.scripts')

const { startWSServer } = require('./startWebSocketServer')
const { cleanUpLocks } = require('./services/bookComponentLock.service')

const init = async () => {
  try {
    if (
      !config.has('serverIdentifier') ||
      config.get('serverIdentifier') === undefined
    ) {
      throw new Error(
        'server identifier should be provided as env variable in order for the server to function properly',
      )
    }

    await cleanUpLocks()
    await startServer()

    logger.info('starting WebSockets server')
    await startWSServer()

    if (scripts && scripts.length > 0) {
      const errors = []

      for (let i = 0; i < scripts.length; i += 1) {
        for (let j = i + 1; j < scripts.length; j += 1) {
          if (
            scripts[i].label === scripts[j].label &&
            scripts[i].filename !== scripts[j].filename &&
            scripts[i].scope === scripts[j].scope
          ) {
            errors.push(
              `your have provided the same label (${scripts[i].label}) for two different scripts`,
            )
          }

          if (
            scripts[i].label === scripts[j].label &&
            scripts[i].filename === scripts[j].filename &&
            scripts[i].scope === scripts[j].scope
          ) {
            errors.push(
              `your have declared the script with label (${scripts[i].label}) twice`,
            )
          }
        }
      }

      if (errors.length !== 0) {
        throw new Error(errors)
      }
    }
  } catch (e) {
    throw new Error(e)
  }
}

init()
