const { logger } = require('@coko/server')

const {
  searchForUsers,
  createKetidaUser,
  updatePassword,
  updatePersonalInformation,
  sendPasswordResetEmail,
} = require('../../../controllers/user.controller')

const searchForUsersHandler = async (_, { search, exclude }, ctx, info) => {
  try {
    logger.info('user resolver: executing searchForUsers use case')
    return searchForUsers(search, exclude)
  } catch (e) {
    throw new Error(e)
  }
}

const createKetidaUserHandler = async (_, { input }, ctx, info) => {
  try {
    const { username, givenName, surname, email, password } = input
    logger.info('user resolver: executing createUser use case')
    return createKetidaUser(username, givenName, surname, email, password)
  } catch (e) {
    throw new Error(e)
  }
}

const updatePasswordHandler = async (_, { input }, ctx) => {
  try {
    const userId = ctx.user
    const { currentPassword, newPassword } = input
    logger.info('user resolver: executing updatePassword use case')
    return updatePassword(userId, currentPassword, newPassword)
  } catch (e) {
    throw new Error(e)
  }
}

const updatePersonalInformationHandler = async (_, { input }, ctx) => {
  try {
    const userId = ctx.user
    const { givenName, surname } = input
    logger.info('user resolver: executing updatePersonalInformation use case')
    return updatePersonalInformation(userId, givenName, surname)
  } catch (e) {
    throw new Error(e)
  }
}

const sendPasswordResetEmailHandler = async (_, { username }, ctx) => {
  try {
    logger.info('user resolver: executing sendPasswordResetEmail use case')
    return sendPasswordResetEmail(username)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Mutation: {
    searchForUsers: searchForUsersHandler,
    createKetidaUser: createKetidaUserHandler,
    updatePassword: updatePasswordHandler,
    updatePersonalInformation: updatePersonalInformationHandler,
    sendPasswordResetEmail: sendPasswordResetEmailHandler,
  },
}
