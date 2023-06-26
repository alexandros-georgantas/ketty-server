const { logger, useTransaction } = require('@coko/server')
const omitBy = require('lodash/omitBy')
const isUndefined = require('lodash/isUndefined')

const TeamMember = require('@coko/server/src/models/teamMember/teamMember.model')

const { Team } = require('../models').models

const getObjectTeam = async (
  role,
  objectId,
  withUsers = false,
  options = {},
) => {
  try {
    const { trx } = options

    if (!withUsers) {
      return Team.findTeamByRoleAndObject(role, objectId, options)
    }

    return Team.findOne(
      { role, objectId, global: false },
      { trx, related: 'users' },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const createTeam = async (
  displayName,
  objectId = undefined,
  objectType = undefined,
  role = undefined,
  global = false,
  options = {},
) => {
  try {
    const { trx } = options

    return useTransaction(
      async tr => {
        const teamData = {
          displayName,
          objectId,
          objectType,
          role,
          global,
        }

        const cleanedData = omitBy(teamData, isUndefined)
        const newTeam = await Team.insert(cleanedData, { trx: tr })

        logger.info(`>>> team of type ${role} created with id ${newTeam.id}`)

        return newTeam
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateTeamMemberStatus = async (teamMemberId, status, options = {}) => {
  try {
    const { trx } = options

    return useTransaction(
      async tr => {
        logger.info(
          `>>> team member with id ${teamMemberId} status updated to ${status}`,
        )

        const updatedTeamMember = await TeamMember.patchAndFetchById(
          teamMemberId,
          { status },
          { trx: tr },
        )

        return Team.findById(updatedTeamMember.teamId, { trx: tr })
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateTeamMemberStatuses = async (teamId, status, options = {}) => {
  try {
    const { trx } = options

    return useTransaction(
      async tr => {
        logger.info(
          `>>> setting status of ${status} to all team member of team with id ${teamId}`,
        )

        const { result: teamMembers } = await TeamMember.find(
          { teamId },
          { trx: tr },
        )

        await Promise.all(
          teamMembers.map(async teamMember =>
            TeamMember.patchAndFetchById(
              teamMember.id,
              { status },
              { trx: tr },
            ),
          ),
        )

        return Team.findById(teamId, { trx: tr })
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const deleteTeam = async (teamId, options = {}) => {
  try {
    const { trx } = options

    return useTransaction(
      async tr => {
        // const deletedTeam = await Team.patchAndFetchById(teamId, {
        //   objectId: null,
        //   objectType: null,
        // })
        const deletedTeam = await Team.deleteById(teamId, { trx: tr })
        logger.info(`>>> associated team with id ${teamId} deleted`)
        logger.info(`>>> corresponding team's object cleaned`)

        // const teamMembers = await TeamMember.query(tr).where({
        //   teamId,
        //   deleted: false,
        // })

        // logger.info(`>>> fetching team members of team with id ${teamId}`)
        // await Promise.all(
        //   map(teamMembers, async teamMember => {
        //     logger.info(`>>> team member with id ${teamMember.id} deleted`)
        //     return TeamMember.query(tr).deleteById(teamMember.id)
        //     // .patch({ deleted: true })
        //     // .where({ id: teamMember.id })
        //   }),
        // )
        return deletedTeam
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const addTeamMembers = async (teamId, members, status, options = {}) => {
  try {
    const { trx } = options

    return useTransaction(async tr => {
      await Promise.all(
        members.map(userId => Team.addMember(teamId, userId, { status })),
      )

      return Team.findById(teamId, { trx })
    })
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  createTeam,
  getObjectTeam,
  deleteTeam,
  updateTeamMemberStatus,
  updateTeamMemberStatuses,
  addTeamMembers,
}