#!/usr/bin/env node

const { logger, useTransaction } = require('@coko/server')
const { db } = require('@coko/server')

const ApplicationParameter = require('../../models/applicationParameter/applicationParameter.model')

const configBooksprints = require('../../config/modules/bookBuilderBooksprints')
const configVanilla = require('../../config/modules/bookBuilderVanilla')
const configOEN = require('../../config/modules/bookBuilderOEN')
// let configKetidaV2 = await require('../../config/modules/applicationParametersKetida2')

const featureBookStructureEnabled =
  (process.env.FEATURE_BOOK_STRUCTURE &&
    JSON.parse(process.env.FEATURE_BOOK_STRUCTURE)) ||
  false

const featurePODEnabled =
  (process.env.FEATURE_POD && JSON.parse(process.env.FEATURE_POD)) || false

const flavour = process.env.KETIDA_FLAVOUR

const whichConfig = async () => {
  let config = configVanilla

  if (featureBookStructureEnabled && flavour !== 'BOOKSPRINTS') {
    config = configOEN
  }

  if (featurePODEnabled && flavour !== 'BOOKSPRINTS') {
    // require the config asynchonously
    // eslint-disable-next-line global-require
    config = await require('../../config/modules/applicationParametersKetida2')
  }

  if (flavour === 'BOOKSPRINTS') {
    config = configBooksprints
  }

  return config
}

const truncate = async () => {
  await db.raw(`truncate table application_parameter cascade`)
  logger.info(`truncate table application parameter`)
}

const seedApplicationParameters = async () => {
  try {
    if (!flavour) {
      throw new Error(
        'env variable KETIDA_FLAVOUR is needed in order to continue',
      )
    }

    const selectedConfig = await whichConfig()

    const areas = Object.keys(selectedConfig)
    await truncate()
    return useTransaction(async trx =>
      Promise.all(
        areas.map(async area => {
          logger.info(
            `New Application Parameter created: ${JSON.stringify(
              selectedConfig[area],
            )}`,
          )
          return ApplicationParameter.insert(
            {
              context: 'bookBuilder',
              area,
              config: JSON.stringify(selectedConfig[area]),
            },
            { trx },
          )
        }),
      ),
    )
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

module.exports = seedApplicationParameters
