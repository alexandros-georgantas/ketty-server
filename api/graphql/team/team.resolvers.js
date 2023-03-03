const { pubsubManager } = require('@coko/server')
const { logger } = require('@coko/server')

const {
  updateTeamMembership,
} = require('@coko/server/src/models/team/team.controller')

const {
  TEAM_MEMBERS_UPDATED,
  BOOK_PRODUCTION_EDITORS_UPDATED,
} = require('./constants')

// const {
//   getEntityTeams,
//   getTeamMembers,
//   getGlobalTeams,
//   updateTeamMembers,
// } = require('../../../controllers/team.controller')

// const getBookTeamsHandler = async (_, { bookId }, ctx) => {
//   try {
//     logger.info('team resolver: executing getEntityTeams use case')
//     const test = await getEntityTeams(bookId, 'book')
//     return test
//   } catch (e) {
//     logger.error(e)
//     throw new Error(e)
//   }
// }

// const getGlobalTeamsHandler = async (_, __, ctx) => {
//   try {
//     logger.info('team resolver: executing getGlobalTeams use case')
//     return getGlobalTeams()
//   } catch (e) {
//     throw new Error(e)
//   }
// }

const updateKetidaTeamMembersHandler = async (_, { teamId, members }, ctx) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    logger.info('team resolver: executing updateTeamMembers use case')
    const updatedTeam = await updateTeamMembership(teamId, members)

    if (updatedTeam.global === true) {
      await pubsub.publish(TEAM_MEMBERS_UPDATED, {
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
  //   Query: {
  //     getBookTeams: getBookTeamsHandler,
  //     getGlobalTeams: getGlobalTeamsHandler,
  //   },
  Mutation: {
    updateKetidaTeamMembers: updateKetidaTeamMembersHandler,
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
