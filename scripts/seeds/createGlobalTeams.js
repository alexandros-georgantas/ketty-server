const { logger } = require('@coko/server')

const {
  ketidaDataModel: {
    models: { Team },
  },
} = require('../../data-model')

const makeTeam = async type => {
  const names = {
    productionEditor: 'Production Editor',
  }

  logger.info(`Create ${names[type]} team`)

  await Team.query().upsertGraphAndFetch(
    {
      global: true,
      members: [],
      name: names[type],
      role: type,
    },
    { relate: true },
  )

  // await team.save()
  logger.info(`${names[type]} team successfully created`)
}

const createGlobalTeams = async () => {
  logger.info('### RUNNING GLOBAL TEAMS SEED SCRIPTS ###')
  logger.info('=> Checking if global teams exist...')

  try {
    const teams = await Team.findByField({ global: true })

    const productionEditorTeam = teams.find(t => t.role === 'productionEditor')

    if (productionEditorTeam) {
      logger.info('All global teams found, exiting...')
    } else {
      logger.warn('No Production Editor team found')
      await makeTeam('productionEditor')
    }
  } catch (err) {
    logger.warn('No global teams found')

    await makeTeam('productionEditor')
  }

  logger.info('Team seed successfully finished')
}

module.exports = createGlobalTeams
