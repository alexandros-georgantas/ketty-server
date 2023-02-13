const { logger } = require('@coko/server')
const map = require('lodash/map')

const BookComponentState = require('../models/bookComponentState/bookComponentState.model')

const unfreezeUploading = async () => {
  try {
    const hanged = await BookComponentState.query().where('uploading', true)
    logger.info(`Found ${hanged.length} with hanging uploading`)
    await Promise.all(
      map(hanged, async bookComponentState => {
        logger.info(`Unfreezing ${bookComponentState.id}`)
        return BookComponentState.query().patchAndFetchById(
          bookComponentState.id,
          {
            uploading: false,
          },
        )
      }),
    )
    const after = await BookComponentState.query().where('uploading', true)

    if (after.length === 0) {
      logger.info('Job done')
    } else {
      logger.info(`Remaining ${after}`)
    }
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = unfreezeUploading

unfreezeUploading()
