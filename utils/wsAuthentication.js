/* eslint-disable global-require */
const { logger } = require('@coko/server')
const jwt = require('jsonwebtoken')
const config = require('config')

const userExists = async userId => {
  try {
    const { User } = require('@pubsweet/models')
    logger.info('executing userExists')

    if (!userId) {
      return false
    }

    const foundUser = await User.findById(userId)
    return foundUser || false
  } catch (e) {
    throw new Error(e)
  }
}

const isAuthenticatedUser = async token => {
  try {
    logger.info('executing isAuthenticatedUser')

    const decoded = jwt.verify(token, config.get('pubsweet-server.secret'))

    return userExists(decoded.id)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { isAuthenticatedUser }
