const { logger } = require('@coko/server')

const {
  searchForUsers,
  isAdmin,
  ketidaLogin,
  ketidaResendVerificationEmail,
} = require('../../../controllers/user.controller')

const searchForUsersHandler = async (_, { search, exclude }, ctx, info) => {
  try {
    logger.info('user resolver: executing searchForUsers use case')
    return searchForUsers(search, exclude)
  } catch (e) {
    throw new Error(e)
  }
}

const ketidaLoginHandler = async (_, { input }, ctx) => {
  try {
    return ketidaLogin(input)
  } catch (e) {
    throw new Error(e.message)
  }
}

const ketidaRequestVerificationEmailHandler = async (_, { email }, ctx) => {
  try {
    logger.info(`[USER RESOLVER] - ketidaResendVerificationEmail`)
    return ketidaResendVerificationEmail(email)
  } catch (e) {
    logger.error(
      `[USER RESOLVER] - ketidaResendVerificationEmail: ${e.message}`,
    )
    throw new Error(e)
  }
}

module.exports = {
  Mutation: {
    searchForUsers: searchForUsersHandler,
    ketidaLogin: ketidaLoginHandler,
    ketidaRequestVerificationEmail: ketidaRequestVerificationEmailHandler,
  },
  User: {
    async admin(user, input, ctx, info) {
      logger.info('in custom resolver')
      return isAdmin(user.id)
    },
  },
}
