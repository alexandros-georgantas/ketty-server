const isAuthenticated = async userId => {
  try {
    /* eslint-disable global-require */
    const User = require('../../../models/user/user.model')
    /* eslint-enable global-require */
    let user

    if (userId) {
      user = await User.findById(userId, {
        related: 'defaultIdentity',
      })
    }

    return user && user.isActive && user.defaultIdentity.isVerified
  } catch (e) {
    throw new Error(e.message)
  }
}

const isAdmin = async userId => {
  try {
    /* eslint-disable global-require */
    const User = require('../../../models/user/user.model')
    /* eslint-enable global-require */
    const isValidUser = await isAuthenticated(userId)
    const hasAdminTeamMembership = await User.hasGlobalRole(userId, 'admin')
    return isValidUser && hasAdminTeamMembership
  } catch (e) {
    throw new Error(e.message)
  }
}

module.exports = { isAuthenticated, isAdmin }
