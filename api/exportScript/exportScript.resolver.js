const { logger } = require('@coko/server')
const { useCaseGetExportScripts } = require('../useCases')

const getExportScripts = async (_, { scope }, ctx) => {
  try {
    logger.info('export script resolver: executing getExportScripts use case')
    return useCaseGetExportScripts(scope)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getExportScripts,
  },
}
