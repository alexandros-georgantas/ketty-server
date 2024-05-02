#!/usr/bin/env node

const { logger, useTransaction } = require('@coko/server')
const { db } = require('@coko/server')

const ApplicationParameter = require('../../models/applicationParameter/applicationParameter.model')

const configBooksprints = require('../../config/modules/bookBuilderBooksprints')
const configVanilla = require('../../config/modules/bookBuilderVanilla')
const configOEN = require('../../config/modules/bookBuilderOEN')
const configKetidaV2 = require('../../config/modules/applicationParametersKetida2')

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
    config = configKetidaV2
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

    if (selectedConfig.instance === 'KETIDA_V2') {
      // preserve params that can be configured via admin dashboard
      return useTransaction(async trx =>
        Promise.all(
          areas.map(async area => {
            const appParam = await ApplicationParameter.find({
              context: 'bookBuilder',
              area,
            })

            const [existingParam] = appParam.result
            const integration = {}

            switch (area) {
              // create termsAndConditions and aiEnabled if they don't exist
              case 'termsAndConditions':
              case 'aiEnabled':
              case 'chatGptApiKey':
                if (!existingParam) {
                  logger.info(
                    `Creating new Application Parameter: ${JSON.stringify(
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
                }

                return appParam

              // update integrations but preserve the `disabled` property value
              case 'integrations':
                if (existingParam) {
                  Object.keys(selectedConfig[area]).forEach(key => {
                    integration[key] = {
                      ...selectedConfig[area][key],
                      disabled: existingParam.config[key]?.disabled,
                    }
                  })

                  return existingParam.update(
                    {
                      config: JSON.stringify(integration),
                    },
                    { trx },
                  )
                }

                // if integrations don't exist create them
                return ApplicationParameter.insert(
                  {
                    context: 'bookBuilder',
                    area,
                    config: JSON.stringify(selectedConfig[area]),
                  },
                  { trx },
                )

              // for other params, update them if they exist, create them if they don't
              default:
                if (existingParam) {
                  return existingParam.update(
                    {
                      config: JSON.stringify(selectedConfig[area]),
                    },
                    { trx },
                  )
                }

                // if param doesn't exist, create it
                return ApplicationParameter.insert(
                  {
                    context: 'bookBuilder',
                    area,
                    config: JSON.stringify(selectedConfig[area]),
                  },
                  { trx },
                )
            }
          }),
        ),
      )
    }

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
