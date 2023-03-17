const { rule } = require('@coko/server/authorization')

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  /* eslint-disable global-require */
  const User = require('../models/user/user.model')
  /* eslint-enable global-require */
  let user

  if (ctx.user) {
    user = await User.findById(ctx.user, {
      related: 'defaultIdentity',
    })
  }

  return user && user.isActive && user.defaultIdentity.isVerified
})

const permissions = {
  Query: {
    user: isAuthenticated,
    currentUser: isAuthenticated,
    users: isAuthenticated,
    team: isAuthenticated,
    teams: isAuthenticated,
    getGlobalTeams: isAuthenticated,
    getObjectTeams: isAuthenticated,
    getWaxRules: isAuthenticated,
    getDashBoardRules: isAuthenticated,
    getBookBuilderRules: isAuthenticated,
    getApplicationParameters: isAuthenticated,
    getBook: isAuthenticated,
    getPagedPreviewerLink: isAuthenticated,
    getBookComponent: isAuthenticated,
    getBookCollection: isAuthenticated,
    getBookCollections: isAuthenticated,
    getCustomTags: isAuthenticated,
    getExportScripts: isAuthenticated,
    getFiles: isAuthenticated,
    getFile: isAuthenticated,
    getSignedURL: isAuthenticated,
    getEntityFiles: isAuthenticated,
    getSpecificFiles: isAuthenticated,
    getTemplates: isAuthenticated,
    getTemplate: isAuthenticated,
  },
  Mutation: {
    upload: isAuthenticated,
    deleteUser: isAuthenticated,
    updateUser: isAuthenticated,
    updatePassword: isAuthenticated,
    updateApplicationParameters: isAuthenticated,
    archiveBook: isAuthenticated,
    createBook: isAuthenticated,
    renameBook: isAuthenticated,
    deleteBook: isAuthenticated,
    updateMetadata: isAuthenticated,
    updateRunningHeaders: isAuthenticated,
    exportBook: isAuthenticated,
    ingestWordFile: isAuthenticated,
    addBookComponent: isAuthenticated,
    renameBookComponent: isAuthenticated,
    deleteBookComponent: isAuthenticated,
    archiveBookComponent: isAuthenticated,
    updateWorkflowState: isAuthenticated,
    updatePagination: isAuthenticated,
    unlockBookComponent: isAuthenticated,
    lockBookComponent: isAuthenticated,
    updateTrackChanges: isAuthenticated,
    updateContent: isAuthenticated,
    updateComponentType: isAuthenticated,
    updateUploading: isAuthenticated,
    toggleIncludeInTOC: isAuthenticated,
    createBookCollection: isAuthenticated,
    addCustomTag: isAuthenticated,
    updateBookComponentOrder: isAuthenticated,
    uploadFiles: isAuthenticated,
    updateFile: isAuthenticated,
    deleteFiles: isAuthenticated,
    updateTeamMembership: isAuthenticated,
    searchForUsers: isAuthenticated,
    addTeamMember: isAuthenticated,
    removeTeamMember: isAuthenticated,
    createTemplate: isAuthenticated,
    cloneTemplate: isAuthenticated,
    updateTemplate: isAuthenticated,
    updateTemplateCSSFile: isAuthenticated,
    deleteTemplate: isAuthenticated,
  },
}

module.exports = permissions
