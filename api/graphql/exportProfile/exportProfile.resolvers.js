const { pubsubManager, logger } = require('@coko/server')

const { subscriptions, labels } = require('./constants')

const {
  getExportProfile,
  getBookExportProfiles,
  createExportProfile,
  updateExportProfile,
  deleteExportProfile,
} = require('../../../controllers/exportProfile.controller')

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
    throw new Error(e)
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

const uploadToProviderHandler = () => {}

module.exports = {
  Query: {
    getExportProfile: getExportProfileHandler,
    getBookExportProfiles: getBookExportProfilesHandler,
  },
  Mutation: {
    createExportProfile: createExportProfileHandler,
    updateExportProfile: updateExportProfileHandler,
    deleteExportProfile: deleteExportProfileHandler,
    uploadToProvider: uploadToProviderHandler,
  },
  Subscription: {
    exportProfileUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(EXPORT_PROFILE_UPDATED)
      },
    },
  },
}
