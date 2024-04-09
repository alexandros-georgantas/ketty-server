const {
  deleteInvitation,
  getInvitation,
  sendInvitations,
  getInvitations,
  updateInvitation,
} = require('../../../controllers/invitations.controller')

const { addTeamMembers } = require('../../../controllers/team.controller')
const { getIdentityByToken } = require('../../../controllers/user.controller')

const sendInvitationsHandler = async (_, invitationData, ctx) => {
  try {
    return sendInvitations(invitationData, ctx.user)
  } catch (e) {
    throw new Error(e)
  }
}

const invitationHandler = async (_, { token }, ctx) => {
  try {
    const identity = await getIdentityByToken(token)

    const invitation = await getInvitation(identity.email)

    if (invitation) {
      // Add member to team
      await addTeamMembers(
        invitation.teamId,
        [identity.userId],
        invitation.status,
      )

      // Clean up invitation
      await deleteInvitation(invitation.bookId, invitation.email)
    }
  } catch (e) {
    throw new Error(e)
  }
}

const getInvitationsResolver = async (_, { bookId }) => {
  return getInvitations(bookId)
}

const deleteInvitationHandler = async (_, { bookId, email }) => {
  return deleteInvitation(bookId, email)
}

const updateInvitationHandler = async (_, { bookId, email, status }) => {
  return updateInvitation(bookId, email, status)
}

module.exports = {
  Query: {
    getInvitations: getInvitationsResolver,
  },
  Mutation: {
    sendInvitations: sendInvitationsHandler,
    handleInvitation: invitationHandler,
    deleteInvitation: deleteInvitationHandler,
    updateInvitation: updateInvitationHandler,
  },
}
