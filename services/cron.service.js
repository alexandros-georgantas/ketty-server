const { pubsubManager, useTransaction, logger, cron } = require('@coko/server')

const fs = require('fs-extra')
const path = require('path')
const config = require('config')
const find = require('lodash/find')

const {
  BookComponent,
  Lock,
  BookComponentState,
  BookComponentTranslation,
  Book,
} = require('../data-model/src').models

const tempDirectoryCleanUp =
  JSON.parse(config.get('tempDirectoryCleanUp')) || false

// default run every one hour
const tempDirectoryCRONJobSchedule =
  config.get('tempDirectoryCRONJobSchedule') || '0 * * * *'

// default is 30 minutes
const tempDirectoryCRONJobOffset =
  (config.get('tempDirectoryCRONJobOffset') &&
    parseInt(config.get('tempDirectoryCRONJobOffset'), 10)) ||
  1800000

const tempRootDirectory = path.join(__dirname, '..', 'uploads/temp')

const getTempDir = serviceSubfolder => {
  return `${tempRootDirectory}/${serviceSubfolder}`
}

const exportServiceDirectories = {
  paged: getTempDir('paged'),
  epub: getTempDir('epub'),
  pdf: getTempDir('pdf'),
  icml: getTempDir('icml'),
}

if (tempDirectoryCleanUp) {
  logger.info(
    `cleanup job and will be registered with params ${tempDirectoryCRONJobSchedule} and ${tempDirectoryCRONJobOffset}`,
  )
  cron.schedule(tempDirectoryCRONJobSchedule, async () => {
    try {
      logger.info('running cleanup job for temp files')
      const keys = Object.keys(exportServiceDirectories)
      await Promise.all(
        keys.map(async key => {
          let subDirectories

          if (fs.pathExistsSync(exportServiceDirectories[key])) {
            subDirectories = fs.readdirSync(exportServiceDirectories[key])
          }

          if (subDirectories && subDirectories.length > 0) {
            logger.info(`found temp directories for ${key}`)
            subDirectories.forEach(subDirectory => {
              if (
                fs
                  .lstatSync(
                    path.resolve(
                      `${path.join(__dirname, '..', 'uploads/temp', key)}`,
                      subDirectory,
                    ),
                  )
                  .isDirectory()
              ) {
                const cronRunTime =
                  new Date().getTime() - tempDirectoryCRONJobOffset

                if (subDirectory <= cronRunTime) {
                  logger.info(`deleting sub-directory ${subDirectory}`)
                  return fs.remove(
                    `${exportServiceDirectories[key]}/${subDirectory}`,
                  )
                }
              }

              return false
            })
          }

          return false
        }),
      )
    } catch (e) {
      throw new Error(e)
    }
  })
}

cron.schedule('*/10 * * * *', async () => {
  // run every 10 minutes
  try {
    const pubsub = await pubsubManager.getPubsub()
    const serverIdentifier = config.get('serverIdentifier')
    logger.info(`executing locks clean-up procedure for idle locks`)

    await useTransaction(async tr => {
      const locks = await Lock.query(tr).where({ serverIdentifier })
      const bookComponentIds = locks.map(lock => lock.foreignId)

      if (bookComponentIds.length > 0) {
        const lockedBookComponents = await BookComponentTranslation.query(
          tr,
        ).whereIn('bookComponentId', bookComponentIds)

        await Promise.all(
          lockedBookComponents.map(async lockedBookComponent => {
            const { updated, bookComponentId } = lockedBookComponent
            const lastUpdate = new Date(updated).getTime()
            const now = new Date().getTime()

            const associatedLock = find(locks, {
              serverIdentifier,
              foreignId: bookComponentId,
            })

            const { created } = associatedLock
            const lockCreatedAt = new Date(created).getTime()

            const timeElapsedFromContentUpdate = now - lastUpdate
            const timeElapsedFromLockAcquirement = now - lockCreatedAt

            if (
              timeElapsedFromContentUpdate > 86400000 &&
              timeElapsedFromLockAcquirement > 1800000
            ) {
              // one day of inactivity in content and 30 minutes since lock acquired
              await Lock.query(tr).delete().where({
                serverIdentifier,
                foreignId: bookComponentId,
              })

              await BookComponentState.query(tr)
                .patch({ status: 102 })
                .where({ bookComponentId })

              const updatedBookComponent = await BookComponent.query(
                tr,
              ).findById(bookComponentId)

              const updatedBook = await Book.query(tr).findById(
                updatedBookComponent.bookId,
              )

              pubsub.publish('BOOK_COMPONENT_UPDATED', {
                bookComponentUpdated: updatedBookComponent,
              })
              pubsub.publish('BOOK_UPDATED', {
                bookUpdated: updatedBook,
              })
              return true
            }

            return false
          }),
        )
      }

      return []
    }, {})
  } catch (e) {
    throw new Error(e)
  }
})
