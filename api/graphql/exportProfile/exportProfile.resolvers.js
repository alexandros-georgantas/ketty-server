const { withFilter } = require('graphql-subscriptions')
const { pubsubManager, logger } = require('@coko/server')

const { subscriptions, labels } = require('./constants')

const {
  getExportProfile,
  getBookExportProfiles,
  createExportProfile,
  updateExportProfile,
  deleteExportProfile,
  createLuluProject,
  updateLuluProject,
  uploadToLulu,
  uploadToProvider,
} = require('../../../controllers/exportProfile.controller')

// const generateBookHashes = require('../../../controllers/helpers/generateBookHashes')

const {
  EXPORT_PROFILE_CREATED,
  EXPORT_PROFILE_UPDATED,
  EXPORT_PROFILE_DELETED,
} = subscriptions

const { EXPORT_PROFILE_RESOLVER } = labels

const getExportProfileHandler = async (_, { id }) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} getExportProfileHandler`)
    return getExportProfile(id)
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} getExportProfileHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const getBookExportProfilesHandler = (_, { bookId }) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} getBookExportProfilesHandler`)
    return getBookExportProfiles(bookId)
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} getBookExportProfilesHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const createExportProfileHandler = async (_, { input }, ctx) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} createExportProfileHandler`)

    const pubsub = await pubsubManager.getPubsub()

    const newExportProfile = await createExportProfile(input)

    pubsub.publish(EXPORT_PROFILE_CREATED, {
      exportProfileCreated: newExportProfile.id,
    })

    return newExportProfile
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} createExportProfileHandler: ${e.message}`,
    )
    throw e
  }
}

const updateExportProfileHandler = async (_, { id, data }) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} updateExportProfileHandler`)

    const pubsub = await pubsubManager.getPubsub()

    const updatedExportProfile = await updateExportProfile(id, data)

    pubsub.publish(EXPORT_PROFILE_UPDATED, {
      exportProfileUpdated: updatedExportProfile.id,
    })

    return updatedExportProfile
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} updateExportProfileHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const deleteExportProfileHandler = async (_, { id }) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} deleteExportProfileHandler`)

    const pubsub = await pubsubManager.getPubsub()

    await deleteExportProfile(id)

    pubsub.publish(EXPORT_PROFILE_DELETED, {
      exportProfileDeleted: id,
    })

    return id
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} deleteExportProfileHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const createLuluProjectHandler = async (_, { exportProfileId }, ctx) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} createLuluProjectHandler`)

    const pubsub = await pubsubManager.getPubsub()

    const updatedExportProfile = await createLuluProject(
      ctx.user,
      exportProfileId,
    )

    pubsub.publish(EXPORT_PROFILE_UPDATED, {
      exportProfileUpdated: updatedExportProfile.id,
    })

    return updatedExportProfile
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} createLuluProjectHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const updateLuluProjectHandler = async (_, { exportProfileId }, ctx) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} updateLuluProjectHandler`)

    const pubsub = await pubsubManager.getPubsub()

    const updatedExportProfile = await updateLuluProject(
      ctx.user,
      exportProfileId,
    )

    pubsub.publish(EXPORT_PROFILE_UPDATED, {
      exportProfileUpdated: updatedExportProfile.id,
    })

    return updatedExportProfile
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} updateLuluProjectHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const uploadToProviderHandler = async (_, { providerLabel, id }, ctx) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} uploadToProviderHandler`)

    const pubsub = await pubsubManager.getPubsub()

    const updatedExportProfile = await uploadToProvider(
      providerLabel,
      id,
      ctx.user,
    )

    pubsub.publish(EXPORT_PROFILE_UPDATED, {
      exportProfileUpdated: updatedExportProfile.id,
    })

    return updatedExportProfile
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} uploadToProviderHandler: ${e.message}`,
    )
    throw new Error(e)
  }
}

const uploadToLuluHandler = async (_, { id }, ctx) => {
  try {
    logger.info(`${EXPORT_PROFILE_RESOLVER} uploadToLuluHandler`)

    const updatedExportProfile = await uploadToLulu(id, ctx.user)

    const pubsub = await pubsubManager.getPubsub()

    pubsub.publish(EXPORT_PROFILE_UPDATED, {
      exportProfileUpdated: updatedExportProfile.id,
    })

    return updatedExportProfile
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_RESOLVER} uploadToProviderHandler: ${e.message}`,
    )
    throw e
  }
}

module.exports = {
  Query: {
    getExportProfile: getExportProfileHandler,
    getBookExportProfiles: getBookExportProfilesHandler,
  },
  Mutation: {
    createExportProfile: createExportProfileHandler,
    updateExportProfile: updateExportProfileHandler,
    deleteExportProfile: deleteExportProfileHandler,
    createLuluProject: createLuluProjectHandler,
    updateLuluProject: updateLuluProjectHandler,
    uploadToLulu: uploadToLuluHandler,
    uploadToProvider: uploadToProviderHandler,
  },
  // ProviderInfo: {
  //   async inSync(args, _, ctx) {
  //     const bookHashes = await generateBookHashes(bookId, templateId)
  //     const { contentHash, metadataHash, stylesheetHash } = bookHashes

  //     return (
  //       contentHash === bookContentHash &&
  //       metadataHash === bookMetadataHash &&
  //       stylesheetHash === templateHash
  //     )
  //   },
  // },
  Subscription: {
    exportProfileUpdated: {
      subscribe: async (...args) => {
        const pubsub = await pubsubManager.getPubsub()

        return withFilter(
          () => {
            return pubsub.asyncIterator(EXPORT_PROFILE_UPDATED)
          },
          async (payload, variables) => {
            const { bookId } = variables
            const { exportProfileUpdated: exportProfileId } = payload

            const exportProfile = await getExportProfile(exportProfileId)

            return bookId === exportProfile.bookId
          },
        )(...args)
      },
    },
    exportProfileCreated: {
      subscribe: async (...args) => {
        const pubsub = await pubsubManager.getPubsub()

        return withFilter(
          () => {
            return pubsub.asyncIterator(EXPORT_PROFILE_CREATED)
          },
          async (payload, variables) => {
            const { bookId } = variables
            const { exportProfileCreated: exportProfileId } = payload

            const exportProfile = await getExportProfile(exportProfileId)

            return bookId === exportProfile.bookId
          },
        )(...args)
      },
    },
    exportProfileDeleted: {
      subscribe: async (...args) => {
        const pubsub = await pubsubManager.getPubsub()

        return withFilter(
          () => {
            return pubsub.asyncIterator(EXPORT_PROFILE_DELETED)
          },
          async (payload, variables) => {
            const { bookId } = variables
            const { exportProfileDeleted: exportProfileId } = payload

            const exportProfile = await getExportProfile(exportProfileId)

            return bookId === exportProfile.bookId
          },
        )(...args)
      },
    },
  },
}
