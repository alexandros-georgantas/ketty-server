const { pubsubManager } = require('@coko/server')
const { logger } = require('@coko/server')

const {
  subscriptions: { USER_UPDATED },
} = require('@coko/server/src/models/user/constants')

const {
  updateTeamMembership,
} = require('@coko/server/src/models/team/team.controller')

const { getUser } = require('@coko/server/src/models/user/user.controller')

const {
  updateTeamMemberStatus,
  updateTeamMemberStatuses,
} = require('../../../controllers/team.controller')

const {
  TEAM_MEMBERS_UPDATED,
  BOOK_PRODUCTION_EDITORS_UPDATED,
  TEAM_UPDATED,
} = require('./constants')

const updateKetidaTeamMembersHandler = async (
  _,
  { teamId, members, status },
  ctx,
) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    logger.info('team resolver: executing updateTeamMembers use case')
    const updatedTeam = await updateTeamMembership(teamId, members)

    await updateTeamMemberStatuses(teamId, status)

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

    await Promise.all(
      members.map(async userId => {
        const user = await getUser(userId)
        return pubsub.publish(USER_UPDATED, {
          userUpdated: { user },
        })
      }),
    )

    pubsub.publish(TEAM_MEMBERS_UPDATED, {
      teamMembersUpdated: updatedTeam,
    })
    logger.info(`Update msg broadcasted`)
    return updatedTeam
  } catch (e) {
    throw new Error(e)
  }
}

const updateTeamMemberStatusHandler = async (
  _,
  { teamId, userId, status },
  ctx,
) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const updatedTeam = await updateTeamMemberStatus(teamId, userId, status)
    const user = await getUser(userId)

    pubsub.publish(TEAM_UPDATED, {
      teamUpdated: { teamId },
    })

    pubsub.publish(USER_UPDATED, {
      userUpdated: { user },
    })
    return updatedTeam
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Mutation: {
    updateKetidaTeamMembers: updateKetidaTeamMembersHandler,
    updateTeamMemberStatus: updateTeamMemberStatusHandler,
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
