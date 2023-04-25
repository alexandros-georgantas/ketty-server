const { rule } = require('@coko/server/authorization')

const {
  isAuthenticated,
  isAdmin,
  isGlobalSpecific,
  isTheSameUser,
} = require('./helpers/helpers')

const isAuthor = async (userId, bookId) => {
  try {
    /* eslint-disable global-require */
    const User = require('../../models/user/user.model')
    /* eslint-enable global-require */
    return User.hasRoleOnObject(userId, 'author', bookId)
  } catch (e) {
    throw new Error(e.message)
  }
}

const isProductionEditor = async (userId, bookId) => {
  try {
    /* eslint-disable global-require */
    const User = require('../../models/user/user.model')
    /* eslint-enable global-require */
    return User.hasRoleOnObject(userId, 'productionEditor', bookId)
  } catch (e) {
    throw new Error(e.message)
  }
}

const isCopyEditor = async (userId, bookId) => {
  try {
    /* eslint-disable global-require */
    const User = require('../../models/user/user.model')
    /* eslint-enable global-require */
    return User.hasRoleOnObject(userId, 'copyEditor', bookId)
  } catch (e) {
    throw new Error(e.message)
  }
}

const hasAnyRoleOnObject = async (userId, bookId) => {
  try {
    const belongsToAuthorTeam = await isAuthor(userId, bookId)

    if (belongsToAuthorTeam) {
      return true
    }

    const belongsToProductionEditorTeam = await isProductionEditor(
      userId,
      bookId,
    )

    if (belongsToProductionEditorTeam) {
      return true
    }

    const belongsToCopyEditorTeam = await isCopyEditor(userId, bookId)

    if (belongsToCopyEditorTeam) {
      return true
    }

    return false
  } catch (e) {
    throw new Error(e.message)
  }
}

const isGlobalProductionEditorOrBelongsToObjectTeam = async (
  userId,
  bookId,
) => {
  try {
    const belongsToGlobalProductionEditorTeam = await isGlobalSpecific(
      userId,
      'productionEditor',
    )

    if (belongsToGlobalProductionEditorTeam) {
      return belongsToGlobalProductionEditorTeam
    }

    const belongsToAnyObjectTeam = await hasAnyRoleOnObject(userId, bookId)

    return belongsToAnyObjectTeam
  } catch (e) {
    throw new Error(e.message)
  }
}

const canFetchBookAndRelevantAssets = async (userId, bookId) => {
  try {
    const isAuthenticatedUser = await isAuthenticated(userId)

    if (!isAuthenticatedUser) {
      return false
    }

    const belongsToAdminTeam = await isAdmin(userId)

    if (belongsToAdminTeam) {
      return true
    }

    return isGlobalProductionEditorOrBelongsToObjectTeam(userId, bookId)
  } catch (e) {
    throw new Error(e.message)
  }
}

const isAuthenticatedRule = rule()(async (parent, args, ctx, info) => {
  try {
    const { user: userId } = ctx
    return isAuthenticated(userId)
  } catch (e) {
    throw new Error(e.message)
  }
})

const isAdminRule = rule()(async (parent, args, ctx, info) => {
  try {
    const { user: userId } = ctx
    const isAuthenticatedUser = await isAuthenticated(userId)

    if (!isAuthenticatedUser) {
      return false
    }

    return isAdmin(userId)
  } catch (e) {
    throw new Error(e.message)
  }
})

const createBookRule = rule()(async (parent, args, ctx, info) => {
  try {
    const { user: userId } = ctx
    const isAuthenticatedUser = await isAuthenticated(userId)

    if (!isAuthenticatedUser) {
      return false
    }

    const belongsToAdminTeam = await isAdmin(userId)

    if (belongsToAdminTeam) {
      return true
    }

    return isGlobalSpecific(userId, 'productionEditor')
  } catch (e) {
    throw new Error(e.message)
  }
})

const modifyBooksInDashboardRule = rule()(
  async (parent, { id: bookId }, ctx, info) => {
    try {
      const { user: userId } = ctx
      const isAuthenticatedUser = await isAuthenticated(userId)

      if (!isAuthenticatedUser) {
        return false
      }

      const belongsToAdminTeam = await isAdmin(userId)

      if (belongsToAdminTeam) {
        return true
      }

      const belongsToGlobalProductionEditorTeam = await isGlobalSpecific(
        userId,
        'productionEditor',
      )

      const belongsToBookProductionEditorTeam = await isProductionEditor(
        userId,
        bookId,
      )

      return (
        belongsToGlobalProductionEditorTeam || belongsToBookProductionEditorTeam
      )
    } catch (e) {
      throw new Error(e.message)
    }
  },
)

const userRule = rule()(async (parent, { id: requestedId }, ctx, info) => {
  try {
    const { user: requesterId } = ctx
    const isAuthenticatedUser = await isAuthenticated(requesterId)

    if (!isAuthenticatedUser) {
      return false
    }

    const belongsToAdminTeam = await isAdmin(requesterId)

    if (belongsToAdminTeam) {
      return true
    }

    return isTheSameUser(requesterId, requestedId)
  } catch (e) {
    throw new Error(e.message)
  }
})

const getBookRule = rule()(async (parent, { id: bookId }, ctx, info) => {
  try {
    const { user: userId } = ctx

    return canFetchBookAndRelevantAssets(userId, bookId)
  } catch (e) {
    throw new Error(e.message)
  }
})

const getEntityFilesRule = rule()(
  async (parent, { entityId: bookId }, ctx, info) => {
    try {
      const { user: userId } = ctx

      return canFetchBookAndRelevantAssets(userId, bookId)
    } catch (e) {
      throw new Error(e.message)
    }
  },
)

const getBookComponentRule = rule()(
  async (parent, { id: bookComponentId }, ctx, info) => {
    try {
      const { user: userId } = ctx

      if (!bookComponentId) {
        throw new Error('bookComponent id should be provided')
      }

      /* eslint-disable global-require */
      const BookComponent = require('../../models/bookComponent/bookComponent.model')
      /* eslint-enable global-require */
      const bookComponent = await BookComponent.findById(bookComponentId)
      const { bookId } = bookComponent

      return canFetchBookAndRelevantAssets(userId, bookId)
    } catch (e) {
      throw new Error(e.message)
    }
  },
)

const permissions = {
  Query: {
    user: userRule,
    currentUser: isAuthenticatedRule,
    users: isAdminRule,
    team: isAuthenticatedRule,
    teams: isAuthenticatedRule,
    getGlobalTeams: isAdminRule,
    getObjectTeams: isAuthenticatedRule,
    getWaxRules: isAuthenticatedRule,
    getDashBoardRules: isAuthenticatedRule,
    getBookBuilderRules: isAuthenticatedRule,
    getApplicationParameters: isAuthenticatedRule,
    getBook: getBookRule,
    getPagedPreviewerLink: isAuthenticatedRule,
    getBookComponent: getBookComponentRule,
    getBookCollection: isAuthenticatedRule,
    getBookCollections: isAuthenticatedRule,
    getCustomTags: isAuthenticatedRule,
    getExportScripts: isAuthenticatedRule,
    getFiles: isAuthenticatedRule,
    getFile: isAuthenticatedRule,
    getSignedURL: isAuthenticatedRule,
    getEntityFiles: getEntityFilesRule,
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
