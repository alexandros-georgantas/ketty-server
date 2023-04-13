const { rule } = require('@coko/server/authorization')
const { isAuthenticated, isAdmin } = require('./helpers/helpers')

const isAuthenticatedRule = rule()(async (parent, args, ctx, info) => {
  return isAuthenticated(ctx.user)
})

const isAdminRule = rule()(async (parent, args, ctx, info) => {
  return isAdmin(ctx.user)
})

const permissions = {
  Query: {
    user: isAuthenticatedRule,
    currentUser: isAuthenticatedRule,
    users: isAdminRule,
    team: isAuthenticatedRule,
    teams: isAuthenticatedRule,
    getGlobalTeams: isAuthenticatedRule,
    getObjectTeams: isAuthenticatedRule,
    getWaxRules: isAuthenticatedRule,
    getDashBoardRules: isAuthenticatedRule,
    getBookBuilderRules: isAuthenticatedRule,
    getApplicationParameters: isAuthenticatedRule,
    getBook: isAuthenticatedRule,
    getPagedPreviewerLink: isAuthenticatedRule,
    getBookComponent: isAuthenticatedRule,
    getBookCollection: isAuthenticatedRule,
    getBookCollections: isAuthenticatedRule,
    getCustomTags: isAuthenticatedRule,
    getExportScripts: isAuthenticatedRule,
    getFiles: isAuthenticatedRule,
    getFile: isAuthenticatedRule,
    getSignedURL: isAuthenticatedRule,
    getEntityFiles: isAuthenticatedRule,
    getSpecificFiles: isAuthenticatedRule,
    getTemplates: isAuthenticatedRule,
    getTemplate: isAuthenticatedRule,
    chatGPT: isAuthenticatedRule,
  },
  Mutation: {
    upload: isAuthenticatedRule,
    deleteUser: isAuthenticatedRule,
    updateUser: isAuthenticatedRule,
    updatePassword: isAuthenticatedRule,
    updateApplicationParameters: isAuthenticatedRule,
    archiveBook: isAuthenticatedRule,
    createBook: isAuthenticatedRule,
    renameBook: isAuthenticatedRule,
    deleteBook: isAuthenticatedRule,
    updateMetadata: isAuthenticatedRule,
    updateRunningHeaders: isAuthenticatedRule,
    exportBook: isAuthenticatedRule,
    ingestWordFile: isAuthenticatedRule,
    addBookComponent: isAuthenticatedRule,
    renameBookComponent: isAuthenticatedRule,
    deleteBookComponent: isAuthenticatedRule,
    archiveBookComponent: isAuthenticatedRule,
    updateWorkflowState: isAuthenticatedRule,
    updatePagination: isAuthenticatedRule,
    unlockBookComponent: isAuthenticatedRule,
    lockBookComponent: isAuthenticatedRule,
    updateTrackChanges: isAuthenticatedRule,
    updateContent: isAuthenticatedRule,
    updateComponentType: isAuthenticatedRule,
    updateUploading: isAuthenticatedRule,
    toggleIncludeInTOC: isAuthenticatedRule,
    createBookCollection: isAuthenticatedRule,
    addCustomTag: isAuthenticatedRule,
    updateBookComponentOrder: isAuthenticatedRule,
    uploadFiles: isAuthenticatedRule,
    updateFile: isAuthenticatedRule,
    deleteFiles: isAuthenticatedRule,
    updateTeamMembership: isAuthenticatedRule,
    searchForUsers: isAuthenticatedRule,
    addTeamMember: isAuthenticatedRule,
    removeTeamMember: isAuthenticatedRule,
    createTemplate: isAuthenticatedRule,
    cloneTemplate: isAuthenticatedRule,
    updateTemplate: isAuthenticatedRule,
    updateTemplateCSSFile: isAuthenticatedRule,
    deleteTemplate: isAuthenticatedRule,
  },
}

module.exports = permissions
