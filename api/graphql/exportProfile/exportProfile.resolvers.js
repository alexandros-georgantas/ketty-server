const { pubsubManager } = require('@coko/server')

const { EXPORT_PROFILE_UPDATED } = require('./constants')

const getExportProfileHandler = () => {}

const getBookExportProfilesHandler = () => {}

const createExportProfileHandler = () => {}

const updateExportProfileHandler = () => {}

const deleteExportProfileHandler = () => {}

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
