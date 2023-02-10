const { logger, useTransaction } = require('@coko/server')
const map = require('lodash/map')
const forEach = require('lodash/forEach')
const find = require('lodash/find')
const indexOf = require('lodash/indexOf')
const omitBy = require('lodash/omitBy')
const isUndefined = require('lodash/isUndefined')

const { Team, TeamMember, User } = require('../../data-model/src').models

const getTeamMembers = async (
  teamId,
  options = {},
  withTeamMemberId = false,
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const teamMembers = await TeamMember.query(tr).where({
          teamId,
          deleted: false,
        })

        if (teamMembers === 0) {
          return teamMembers
        }

        const populatedTeamMembers = await Promise.all(
          map(teamMembers, async teamMember => {
            const user = await User.query(tr).where({
              id: teamMember.userId,
            })

            const {
              id: userId,
              username,
              admin,
              email,
              givenName,
              surname,
            } = user[0]

            if (!withTeamMemberId) {
              return { id: userId, username, admin, email, givenName, surname }
            }

            return {
              id: teamMember.id,
              user: { id: userId, username, admin, email, givenName, surname },
            }
          }),
        )

        return populatedTeamMembers
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const createTeam = async (
  name,
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
          name,
          objectId,
          objectType,
          role,
          global,
        }

        const cleanedData = omitBy(teamData, isUndefined)
        const newTeam = await Team.query(tr).insert(cleanedData)

        logger.info(`>>> team of type ${role} created with id ${newTeam.id}`)

        return newTeam
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getEntityTeam = async (
  objectId,
  objectType,
  role,
  withTeamMembers = false,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        logger.info(
          `>>> fetching team of ${objectType} with id ${objectId} and role ${role}`,
        )

        const team = await Team.query(tr).where({
          objectId,
          objectType,
          role,
          deleted: false,
        })

        if (team.length === 0) {
          throw new Error(
            `team of ${objectType} with id ${objectId} does not exist`,
          )
        }

        if (!withTeamMembers) {
          return team[0]
        }

        team[0].members = await getTeamMembers(team[0].id, { trx: tr })

        return team[0]
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getEntityTeams = async (
  objectId,
  objectType,
  withTeamMembers = false,
  options = {},
) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching teams of ${objectType} with id ${objectId}`)
    return useTransaction(
      async tr => {
        const teams = await Team.query(tr).where({
          objectId,
          objectType,
          deleted: false,
          global: false,
        })

        if (teams.length === 0) {
          throw new Error(
            `teams of ${objectType} with id ${objectId} do not exist`,
          )
        }

        if (!withTeamMembers) {
          return teams
        }

        return Promise.all(teams, async team => {
          /* eslint-disable no-param-reassign */
          team.members = await getTeamMembers(team.id, { trx: tr })
          /* eslint-enable no-param-reassign */
          return team
        })
      },
      { trx, passedTrxOnly: true },
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
        const deletedTeam = await Team.query(tr).patchAndFetchById(teamId, {
          deleted: false,
          objectId: null,
          objectType: null,
        })

        logger.info(`>>> associated team with id ${teamId} deleted`)
        logger.info(`>>> corresponding team's object cleaned`)

        const teamMembers = await TeamMember.query(tr).where({
          teamId,
          deleted: false,
        })

        logger.info(`>>> fetching team members of team with id ${teamId}`)
        await Promise.all(
          map(teamMembers, async teamMember => {
            logger.info(`>>> team member with id ${teamMember.id} deleted`)
            return TeamMember.query(tr).deleteById(teamMember.id)
            // .patch({ deleted: true })
            // .where({ id: teamMember.id })
          }),
        )
        return deletedTeam
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getGlobalTeams = async (withTeamMembers = false, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching global teams`)
    return useTransaction(
      async tr => {
        const teams = await Team.query(tr).where({
          global: true,
          deleted: false,
        })

        if (teams.length === 0) {
          throw new Error(`no global teams`)
        }

        if (!withTeamMembers) {
          return teams
        }

        return Promise.all(teams, async team => {
          /* eslint-disable no-param-reassign */
          team.members = await getTeamMembers(team.id, { trx: tr })
          /* eslint-enable no-param-reassign */
          return team
        })
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getTeam = async (teamId, withTeamMembers = false, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const team = await Team.query(tr).where({ id: teamId, deleted: false })

        if (team.length === 0) {
          throw Error(`team with id ${teamId} does not exist`)
        }

        if (!withTeamMembers) {
          return team[0]
        }

        team[0].members = await getTeamMembers(teamId, { trx: tr })
        return team[0]
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateTeamMembers = async (teamId, members, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const toBeAdded = []
        const toBeDeleted = []
        const teamMembers = await getTeamMembers(teamId, { trx: tr })

        forEach(members, userId => {
          if (!find(teamMembers, { id: userId })) {
            toBeAdded.push(userId)
          }
        })

        forEach(teamMembers, user => {
          const { id } = user

          if (indexOf(members, id) === -1) {
            toBeDeleted.push(id)
          }
        })

        await Promise.all(
          toBeAdded.map(async userId =>
            TeamMember.query(tr).insert({
              teamId,
              userId,
            }),
          ),
        )
        await Promise.all(
          toBeDeleted.map(async userId =>
            TeamMember.query(tr)
              // .patch({ deleted: true })
              .delete()
              .where({
                teamId,
                userId,
              }),
          ),
        )
        return getTeam(teamId, true, { trx: tr })
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  createTeam,
  getEntityTeams,
  getEntityTeam,
  getTeam,
  getTeamMembers,
  getGlobalTeams,
  deleteTeam,
  updateTeamMembers,
}
