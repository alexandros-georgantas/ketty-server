const { rule } = require('@coko/server/authorization')

const {
  isAuthenticated,
  isAdmin,
  isGlobalSpecific,
} = require('./helpers/helpers')

const isAuthor = async (userId, bookId) => {
  /* eslint-disable global-require */
  const User = require('../../models/user/user.model')
  /* eslint-enable global-require */
  return User.hasRoleOnObject(userId, 'author', bookId)
}

const isProductionEditor = async (userId, bookId) => {
  /* eslint-disable global-require */
  const User = require('../../models/user/user.model')
  /* eslint-enable global-require */
  return User.hasRoleOnObject(userId, 'productionEditor', bookId)
}

const isCopyEditor = async (userId, bookId) => {
  /* eslint-disable global-require */
  const User = require('../../models/user/user.model')
  /* eslint-enable global-require */
  return User.hasRoleOnObject(userId, 'copyEditor', bookId)
}

const isAuthenticatedRule = rule()(async (parent, args, ctx, info) => {
  const { user: userId } = ctx
  return isAuthenticated(userId)
})

const isAdminRule = rule()(async (parent, args, ctx, info) => {
  const { user: userId } = ctx
  const isAuthenticatedUser = await isAuthenticated(userId)
  return isAuthenticatedUser && isAdmin(userId)
})

const createBookRule = rule()(async (parent, args, ctx, info) => {
  const { user: userId } = ctx
  const isAuthenticatedUser = await isAuthenticated(userId)

  const belongsToAdminTeam = await isAdmin(userId)

  const belongsToGlobalProductionEditorTeam = await isGlobalSpecific(
    userId,
    'productionEditor',
  )

  return (
    isAuthenticatedUser &&
    (belongsToAdminTeam || belongsToGlobalProductionEditorTeam)
  )
})

const modifyBooksInDashboardRule = rule()(
  async (parent, { id: bookId }, ctx, info) => {
    const { user: userId } = ctx
    const belongsToAdminTeam = await isAdmin(userId)

    const belongsToGlobalProductionEditorTeam = await isGlobalSpecific(
      userId,
      'productionEditor',
    )

    const belongsToBookProductionEditorTeam = await isProductionEditor(
      userId,
      bookId,
    )

    return (
      belongsToAdminTeam ||
      belongsToGlobalProductionEditorTeam ||
      belongsToBookProductionEditorTeam
    )
  },
)

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
    archiveBook: modifyBooksInDashboardRule,
    createBook: createBookRule,
    renameBook: modifyBooksInDashboardRule,
    deleteBook: modifyBooksInDashboardRule,
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
