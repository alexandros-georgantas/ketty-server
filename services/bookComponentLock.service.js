const { pubsubManager, useTransaction, logger } = require('@coko/server')
const config = require('config')

const { Book, BookComponent, Lock, BookComponentState } =
  require('../models').models

const unlockBookComponent = async (bookComponentId, userId, tabId) => {
  try {
    const serverIdentifier = config.get('serverIdentifier')
    const pubsub = await pubsubManager.getPubsub()

    const updatedBookComponent = await useTransaction(async tr => {
      logger.info(
        `server remove lock for book component ${bookComponentId} with tabId ${tabId} and user ${userId}`,
      )

      const affectedRows = await Lock.query(tr)
        .delete()
        .where({ foreignId: bookComponentId, userId, tabId, serverIdentifier })

      logger.info(`locks removed ${affectedRows}`)
      await BookComponentState.query(tr)
        .patch({ status: 200 })
        .where({ bookComponentId })

      return BookComponent.findById(bookComponentId, { trx: tr })
    }, {})

    const updatedBook = await Book.findById(updatedBookComponent.bookId)
    pubsub.publish('BOOK_COMPONENT_UPDATED', {
      bookComponentUpdated: updatedBookComponent,
    })

    pubsub.publish('BOOK_COMPONENT_LOCK_UPDATED', {
      bookComponentLockUpdated: updatedBookComponent,
    })

    pubsub.publish('BOOK_UPDATED', {
      bookUpdated: updatedBook,
    })
    return true
  } catch (e) {
    throw new Error(e)
  }
}

const unlockOrphanLocks = async bookComponentIdsWithLock => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const serverIdentifier = config.get('serverIdentifier')
    logger.info(`executing locks clean-up procedure for orphan locks`)
    let removeCounter = 0

    await useTransaction(async tr => {
      const orphanLocks = await Lock.query(tr)
        .whereNotIn('foreignId', bookComponentIdsWithLock)
        .andWhere({ serverIdentifier })

      const orphanBookComponentIds = orphanLocks.map(lock => lock.foreignId)

      if (orphanBookComponentIds.length > 0) {
        logger.info(`found ${orphanBookComponentIds.length} orphan locks`)

        const orphanLockedBookComponents = await BookComponent.query(
          tr,
        ).whereIn('id', orphanBookComponentIds)

        await Promise.all(
          orphanLockedBookComponents.map(async lockedBookComponent => {
            const { id: bookComponentId } = lockedBookComponent

            const affected = await Lock.query(tr).delete().where({
              serverIdentifier,
              foreignId: bookComponentId,
              foreignType: 'bookComponent',
            })

            if (affected === 1) {
              removeCounter += 1
            }

            const foundIndex = orphanBookComponentIds.indexOf(bookComponentId)

            if (foundIndex > -1) {
              orphanBookComponentIds.splice(foundIndex, 1)
            }

            await BookComponentState.query(tr)
              .patch({ status: 104 })
              .where({ bookComponentId })

            const updatedBookComponent = await BookComponent.findById(
              bookComponentId,
              { trx: tr },
            )

            const updatedBook = await Book.findById(
              updatedBookComponent.bookId,
              { trx: tr },
            )

            logger.info(`broadcasting unlocked event`)
            pubsub.publish('BOOK_COMPONENT_UPDATED', {
              bookComponentUpdated: updatedBookComponent,
            })
            pubsub.publish('BOOK_COMPONENT_LOCK_UPDATED', {
              bookComponentLockUpdated: updatedBookComponent,
            })
            pubsub.publish('BOOK_UPDATED', {
              bookUpdated: updatedBook,
            })

            return true
          }),
        )

        if (orphanBookComponentIds.length > 0) {
          logger.info(`lock for UNKNOWN book component/s detected`)
          await Promise.all(
            orphanBookComponentIds.map(async unknownBC => {
              logger.info(
                `removing lock for unknown book component with id ${unknownBC}`,
              )

              const affected = await Lock.query(tr).delete().where({
                serverIdentifier,
                foreignId: unknownBC,
                foreignType: 'bookComponent',
              })

              if (affected === 1) {
                removeCounter += 1
              }
            }),
          )
        }

        logger.info(
          `removed ${removeCounter} out of ${orphanBookComponentIds.length} orphan locks`,
        )
      }
    }, {})

    return false
  } catch (e) {
    throw new Error(e)
  }
}

const cleanUpLocks = async (immediate = false) => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    const serverIdentifier = config.get('serverIdentifier')
    logger.info(`executing locks clean-up procedure`)
    let removeCounter = 0

    await useTransaction(async tr => {
      const { result: locks } = await Lock.find(
        { serverIdentifier },
        { trx: tr },
      )

      const bookComponentIds = locks.map(lock => lock.foreignId)

      if (bookComponentIds.length > 0) {
        const lockedBookComponents = await BookComponent.query(tr).whereIn(
          'id',
          bookComponentIds,
        )

        logger.info(`found ${locks.length} idle locks`)

        await Promise.all(
          lockedBookComponents.map(async lockedBookComponent => {
            const { id: bookComponentId } = lockedBookComponent

            const affected = await Lock.query(tr).delete().where({
              serverIdentifier,
              foreignId: bookComponentId,
              foreignType: 'bookComponent',
            })

            if (affected === 1) {
              removeCounter += 1
            }

            const foundIndex = bookComponentIds.indexOf(bookComponentId)

            if (foundIndex > -1) {
              bookComponentIds.splice(foundIndex, 1)
            }

            await BookComponentState.query(tr)
              .patch({ status: 104 })
              .where({ bookComponentId })

            const updatedBookComponent = await BookComponent.findById(
              bookComponentId,
              { trx: tr },
            )

            const updatedBook = await Book.findById(
              updatedBookComponent.bookId,
              { trx: tr },
            )

            logger.info(`broadcasting unlocked event`)
            pubsub.publish('BOOK_COMPONENT_UPDATED', {
              bookComponentUpdated: updatedBookComponent,
            })
            pubsub.publish('BOOK_UPDATED', {
              bookUpdated: updatedBook,
            })
            pubsub.publish('BOOK_COMPONENT_LOCK_UPDATED', {
              bookComponentLockUpdated: updatedBookComponent,
            })

            return true
          }),
        )

        if (bookComponentIds.length > 0) {
          logger.info(`lock for UNKNOWN book component/s detected`)
          await Promise.all(
            bookComponentIds.map(async unknownBC => {
              logger.info(
                `removing lock for unknown book component with id ${unknownBC}`,
              )

              const affected = await Lock.query(tr).delete().where({
                serverIdentifier,
                foreignId: unknownBC,
                foreignType: 'bookComponent',
              })

              if (affected === 1) {
                removeCounter += 1
              }
            }),
          )
        }

        logger.info(
          `removed ${removeCounter} out of ${locks.length} idle locks`,
        )
      }
    }, {})

    return false
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { unlockBookComponent, cleanUpLocks, unlockOrphanLocks }