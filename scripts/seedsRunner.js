const { logger } = require('@coko/server')
const config = require('config')

const {
  createAdminUser,
  createApplicationParams,
  createBookCollection,
  createGlobalTeams,
  // createTemplates,
} = require('./seeds')

const adminUser = config.get('pubsweet-server.admin')

const runner = async () => {
  try {
    await createGlobalTeams()
    await createAdminUser({
      ...adminUser,
    })
    await createApplicationParams()
    await createBookCollection()
    // await createTemplates()
  } catch (e) {
    logger.error(e.message)
  }
}

runner()
