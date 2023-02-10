const { pubsubManager } = require('@coko/server')
const { logger } = require('@coko/server')

const {
  TEAM_MEMBERS_UPDATED,
  BOOK_PRODUCTION_EDITORS_UPDATED,
} = require('./constants')

const {
  useCaseGetEntityTeams,
  useCaseGetGlobalTeams,
  useCaseUpdateTeamMembers,
  useCaseGetTeamMembers,
} = require('../useCases')

const getBookTeams = async (_, { bookId }, ctx) => {
  try {
    logger.info('team resolver: executing getEntityTeams use case')
    const test = await useCaseGetEntityTeams(bookId, 'book')
    return test
  } catch (e) {
    logger.error(e)
    throw new Error(e)
  }
}

const getGlobalTeams = async (_, __, ctx) => {
  try {
    logger.info('team resolver: executing getGlobalTeams use case')
    return useCaseGetGlobalTeams()
  } catch (e) {
    throw new Error(e)
  }
}

const updateTeamMembers = async (_, { id, input }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    logger.info('team resolver: executing updateTeamMembers use case')
    const userIds = input.members.map(member => member.user.id)
    const updatedTeam = await useCaseUpdateTeamMembers(id, userIds)

    if (updatedTeam.global === true) {
      pubsub.publish(TEAM_MEMBERS_UPDATED, {
        teamMembersUpdated: updatedTeam,
      })

      return updatedTeam
    }

    if (updatedTeam.role === 'productionEditor') {
      pubsub.publish(BOOK_PRODUCTION_EDITORS_UPDATED, {
        productionEditorsUpdated: updatedTeam,
      })
    }

    pubsub.publish(TEAM_MEMBERS_UPDATED, {
      teamMembersUpdated: updatedTeam,
    })
    logger.info(`Update msg broadcasted`)
    return updatedTeam
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getBookTeams,
    getGlobalTeams,
  },
  Mutation: {
    updateTeamMembers,
  },
  KetidaTeam: {
    async members(team, _, ctx) {
      return useCaseGetTeamMembers(team.id, {}, true)
    },
  },
  Subscription: {
    teamMembersUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(TEAM_MEMBERS_UPDATED)
      },
    },
    productionEditorsUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(BOOK_PRODUCTION_EDITORS_UPDATED)
      },
    },
  },
}
