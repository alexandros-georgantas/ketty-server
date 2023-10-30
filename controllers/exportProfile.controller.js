const { useTransaction, logger } = require('@coko/server')

const {
  labels: { EXPORT_PROFILE_CONTROLLER },
} = require('./constants')

const ExportProfile = require('../models/exportProfile/exportProfile.model')

const getExportProfile = async (id, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `${EXPORT_PROFILE_CONTROLLER} getExportProfile: fetching export profile with id ${id}`,
    )

    const exportProfile = await useTransaction(
      async tr => ExportProfile.findOne({ id, deleted: false }, { trx: tr }),
      { trx, passedTrxOnly: true },
    )

    if (!exportProfile) {
      throw new Error(`export profile with id: ${id} does not exist`)
    }

    return exportProfile
  } catch (e) {
    logger.error(`${EXPORT_PROFILE_CONTROLLER} getExportProfile: ${e.message}`)
    throw new Error(e)
  }
}

const getBookExportProfiles = async (bookId, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `${EXPORT_PROFILE_CONTROLLER} getBookExportProfiles: fetching export profiles for book with id ${bookId}`,
    )

    return useTransaction(
      async tr => ExportProfile.find({ bookId, deleted: false }, { trx: tr }),
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_CONTROLLER} getBookExportProfiles: ${e.message}`,
    )
    throw new Error(e)
  }
}

const createExportProfile = async (data, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `${EXPORT_PROFILE_CONTROLLER} createExportProfile: creating export profiles for book with id ${data.bookId}`,
    )

    return useTransaction(async tr => ExportProfile.insert(data, { trx: tr }), {
      trx,
    })
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_CONTROLLER} createExportProfile: ${e.message}`,
    )
    throw new Error(e)
  }
}

const updateExportProfile = async (id, data, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `${EXPORT_PROFILE_CONTROLLER} updateExportProfile: updating export profiles with id ${id}`,
    )

    return useTransaction(
      async tr => ExportProfile.patchAndFetchById(id, data, { trx: tr }),
      {
        trx,
      },
    )
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_CONTROLLER} updateExportProfile: ${e.message}`,
    )
    throw new Error(e)
  }
}

const deleteExportProfile = async (id, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `${EXPORT_PROFILE_CONTROLLER} deleteExportProfile: deleting file with ids ${id}`,
    )
    return useTransaction(async tr => ExportProfile.deleteById(id), { trx })
  } catch (e) {
    logger.error(
      `${EXPORT_PROFILE_CONTROLLER} deleteExportProfile: ${e.message}`,
    )
    throw new Error(e)
  }
}

module.exports = {
  getExportProfile,
  getBookExportProfiles,
  createExportProfile,
  updateExportProfile,
  deleteExportProfile,
}
