const { logger, useTransaction } = require('@coko/server')
const { ketidaDataModel } = require('../../data-model')

const { models } = ketidaDataModel
const { User } = models

const createAdmin = async userData => {
  try {
    logger.info('### CREATING ADMIN USER ###')
    logger.info('>>> checking if admin user already exists...')

    const { username, password, email, givenName, surname } = userData

    const adminExists = await User.query().where({ admin: true, email })

    if (adminExists.length !== 0) {
      logger.warn('>>> an admin user already exists in the system')
      return false
    }

    logger.info('creating user')

    await useTransaction(async trx => {
      await User.query(trx).insert({
        admin: true,
        password,
        givenName,
        surname,
        email,
        username,
      })

      logger.info(
        `>>> admin user  with username "${username}" successfully created.`,
      )

      return true
    })
    return true
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

module.exports = createAdmin
