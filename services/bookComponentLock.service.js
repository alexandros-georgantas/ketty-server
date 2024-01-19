const { pubsubManager, useTransaction, logger } = require('@coko/server')

const { BookComponent, Lock, BookComponentState } = require('../models').models

const { BOOK_UPDATED } = require('../api/graphql/book/constants')

const {
  BOOK_COMPONENT_LOCK_UPDATED,
  BOOK_COMPONENT_UPDATED,
  STATUSES,
} = require('../api/graphql/bookComponent/constants')

const {
  getOrphanLocks,
  getInactiveLocks,
} = require('../controllers/lock.controller')

const unlockBookComponent = async (bookComponentId, userId, tabId) => {
  try {
    // const serverIdentifier = config.get('serverIdentifier')
    const pubsub = await pubsubManager.getPubsub()

    const updatedBookComponent = await useTransaction(async tr => {
      logger.info(
        `server remove lock for book component ${bookComponentId} with tabId ${tabId} and user ${userId}`,
      )

      // const affectedRows = await Lock.query(tr)
      //   .delete()
      //   .where({ foreignId: bookComponentId, userId, tabId, serverIdentifier })

      const affectedRows = await Lock.query(tr)
        .delete()
        .where({ foreignId: bookComponentId, userId, tabId })

      logger.info(`locks removed ${affectedRows}`)
      await BookComponentState.query(tr)
        .patch({ status: STATUSES.FINE })
        .where({ bookComponentId })

      return BookComponent.findById(bookComponentId, { trx: tr })
    }, {})

    pubsub.publish(BOOK_COMPONENT_UPDATED, {
      bookComponentUpdated: updatedBookComponent.id,
    })

    pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
      bookComponentLockUpdated: updatedBookComponent.id,
    })

    pubsub.publish(BOOK_UPDATED, {
      bookUpdated: updatedBookComponent.bookId,
    })
    return true
  } catch (e) {
    throw new Error(e)
  }
}

const unlockOrphanLocks = async bookComponentIdsWithActiveConnection => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    // const serverIdentifier = config.get('serverIdentifier')
    logger.info(`executing locks clean-up procedure for orphan locks`)
    let removeCounter = 0

    await useTransaction(async tr => {
      const orphanLocks = await getOrphanLocks(
        bookComponentIdsWithActiveConnection,
        {
          trx: tr,
        },
      )

      const orphanBookComponentIds = orphanLocks.map(lock => lock.foreignId)

      if (orphanBookComponentIds.length > 0) {
        logger.info(`found ${orphanBookComponentIds.length} orphan locks`)

        const orphanLockedBookComponents = await BookComponent.query(
          tr,
        ).whereIn('id', orphanBookComponentIds)

        await Promise.all(
          orphanLockedBookComponents.map(async lockedBookComponent => {
            const { id: bookComponentId } = lockedBookComponent

            // const affected = await Lock.query(tr).delete().where({
            //   serverIdentifier,
            //   foreignId: bookComponentId,
            //   foreignType: 'bookComponent',
            // })
            const affected = await Lock.query(tr).delete().where({
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
              .patch({ status: STATUSES.UNLOCKED_BY_SYSTEM })
              .where({ bookComponentId })

            const updatedBookComponent = await BookComponent.findById(
              bookComponentId,
              { trx: tr },
            )

            logger.info(`broadcasting unlocked event`)
            pubsub.publish(BOOK_COMPONENT_UPDATED, {
              bookComponentUpdated: updatedBookComponent.id,
            })
            pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
              bookComponentLockUpdated: updatedBookComponent.id,
            })
            pubsub.publish(BOOK_UPDATED, {
              bookUpdated: updatedBookComponent.bookId,
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

              // const affected = await Lock.query(tr).delete().where({
              //   serverIdentifier,
              //   foreignId: unknownBC,
              //   foreignType: 'bookComponent',
              // })
              const affected = await Lock.query(tr).delete().where({
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

const cleanUpLocks = async () => {
  try {
    const pubsub = await pubsubManager.getPubsub()
    // const serverIdentifier = config.get('serverIdentifier')
    logger.info(`executing locks clean-up procedure`)
    let removeCounter = 0

    await useTransaction(async tr => {
      // const { result: locks } = await Lock.find(
      //   { serverIdentifier },
      //   { trx: tr },
      // )
      const locks = await getInactiveLocks({ trx: tr })

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

            // const affected = await Lock.query(tr).delete().where({
            //   serverIdentifier,
            //   foreignId: bookComponentId,
            //   foreignType: 'bookComponent',
            // })
            const affected = await Lock.query(tr).delete().where({
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
              .patch({ status: STATUSES.UNLOCKED_BY_SYSTEM })
              .where({ bookComponentId })

            const updatedBookComponent = await BookComponent.findById(
              bookComponentId,
              { trx: tr },
            )

            logger.info(`broadcasting unlocked event`)
            pubsub.publish(BOOK_COMPONENT_UPDATED, {
              bookComponentUpdated: updatedBookComponent.id,
            })
            pubsub.publish(BOOK_COMPONENT_LOCK_UPDATED, {
              bookComponentLockUpdated: updatedBookComponent.id,
            })
            pubsub.publish(BOOK_UPDATED, {
              bookUpdated: updatedBookComponent.bookId,
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

              // const affected = await Lock.query(tr).delete().where({
              //   serverIdentifier,
              //   foreignId: unknownBC,
              //   foreignType: 'bookComponent',
              // })
              const affected = await Lock.query(tr).delete().where({
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
