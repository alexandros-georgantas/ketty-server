const { logger } = require('@coko/server')

const {
  searchForUsers,
  isAdmin,
} = require('../../../controllers/user.controller')

const searchForUsersHandler = async (_, { search, exclude }, ctx, info) => {
  try {
    logger.info('user resolver: executing searchForUsers use case')
    return searchForUsers(search, exclude)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Mutation: {
    searchForUsers: searchForUsersHandler,
  },
  User: {
    async admin(user, input, ctx, info) {
      logger.info('in costume resolver')
      return isAdmin(user.id)
    },
  },
}
