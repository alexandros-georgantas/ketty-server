const { logger } = require('@coko/server')

const {
  useCaseSearchForUsers,
  useCaseCreateUser,
  useCaseUpdatePassword,
  useCaseUpdatePersonalInformation,
  useCaseSendPasswordResetEmail,
} = require('../useCases')

const searchForUsers = async (_, { search, exclude }, ctx, info) => {
  try {
    logger.info('user resolver: executing searchForUsers use case')
    return useCaseSearchForUsers(search, exclude)
  } catch (e) {
    throw new Error(e)
  }
}

const createKetidaUser = async (_, { input }, ctx, info) => {
  try {
    const { username, givenName, surname, email, password } = input
    logger.info('user resolver: executing createUser use case')
    return useCaseCreateUser(username, givenName, surname, email, password)
  } catch (e) {
    throw new Error(e)
  }
}

const updatePassword = async (_, { input }, ctx) => {
  try {
    const userId = ctx.user
    const { currentPassword, newPassword } = input
    logger.info('user resolver: executing updatePassword use case')
    return useCaseUpdatePassword(userId, currentPassword, newPassword)
  } catch (e) {
    throw new Error(e)
  }
}

const updatePersonalInformation = async (_, { input }, ctx) => {
  try {
    const userId = ctx.user
    const { givenName, surname } = input
    logger.info('user resolver: executing updatePersonalInformation use case')
    return useCaseUpdatePersonalInformation(userId, givenName, surname)
  } catch (e) {
    throw new Error(e)
  }
}

const sendPasswordResetEmail = async (_, { username }, ctx) => {
  try {
    logger.info('user resolver: executing sendPasswordResetEmail use case')
    return useCaseSendPasswordResetEmail(username)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Mutation: {
    searchForUsers,
    createKetidaUser,
    updatePassword,
    updatePersonalInformation,
    sendPasswordResetEmail,
  },
}
