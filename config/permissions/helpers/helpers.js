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

    const hasAdminTeamMembership = await User.hasGlobalRole(userId, 'admin')
    return hasAdminTeamMembership
  } catch (e) {
    throw new Error(e.message)
  }
}

const isGlobal = async (userId, includeAdmin = false) => {
  try {
    /* eslint-disable global-require */
    const config = require('config')
    const globalTeams = config.get('teams.global')
    const User = require('../../../models/user/user.model')
    /* eslint-enable global-require */

    let globalTeamsKeys = Object.keys(globalTeams)

    if (!includeAdmin) {
      globalTeamsKeys = Object.keys(globalTeams).filter(
        team => team !== 'admin',
      )
    }

    const isGlobalList = await Promise.all(
      globalTeamsKeys.map(async team =>
        User.hasGlobalRole(userId, globalTeams[team].role),
      ),
    )

    return isGlobalList.some(global => global)
  } catch (e) {
    throw new Error(e.message)
  }
}

const isGlobalSpecific = async (userId, role) => {
  try {
    /* eslint-disable global-require */
    const User = require('../../../models/user/user.model')
    /* eslint-enable global-require */

    return User.hasGlobalRole(userId, role)
  } catch (e) {
    throw new Error(e.message)
  }
}

const isTheSameUser = (requesterId, userId) => {
  try {
    return requesterId === userId
  } catch (e) {
    throw new Error(e.message)
  }
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isGlobal,
  isGlobalSpecific,
  isTheSameUser,
}
