const { logger, useTransaction } = require('@coko/server')
const indexOf = require('lodash/indexOf')
const find = require('lodash/find')

const { Division, Book } = require('../../data-model/src').models
const utils = require('../helpers/utils')

const { getApplicationParameters } = require('./applicationParameters')
// const { getBook } = require('./book')
const { getBookComponent, updateBookComponent } = require('./bookComponent')

const createDivision = async (divisionData, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `>>> creating division ${divisionData.label} for the book with id ${divisionData.bookId}`,
    )

    return useTransaction(async tr => Division.query(tr).insert(divisionData), {
      trx,
    })
  } catch (e) {
    throw new Error(e)
  }
}

const getDivision = async (divisionId, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching division with id ${divisionId}`)

    const division = await useTransaction(
      async tr => Division.query(tr).where({ id: divisionId, deleted: false }),
      { trx, passedTrxOnly: true },
    )

    if (division.length === 0) {
      throw new Error(`division with id: ${divisionId} does not exist`)
    }

    return division[0]
  } catch (e) {
    throw new Error(e)
  }
}

const updateDivision = async (divisionId, patch, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> updating division with id ${divisionId}`)

    return useTransaction(
      async tr => Division.query(tr).patchAndFetchById(divisionId, patch),
      {
        trx,
      },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateBookComponentOrder = async (
  targetDivisionId,
  bookComponentId,
  index,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const applicationParameters = await getApplicationParameters(
          'bookBuilder',
          'divisions',
          { trx: tr },
        )

        const { config: divisions } = applicationParameters

        const bookComponent = await getBookComponent(bookComponentId, {
          trx: tr,
        })

        const sourceDivision = await getDivision(bookComponent.divisionId, {
          trx: tr,
        })

        const found = indexOf(sourceDivision.bookComponents, bookComponentId)

        if (sourceDivision.id === targetDivisionId) {
          const updatedBookComponents = utils.reorderArray(
            sourceDivision.bookComponents,
            bookComponentId,
            index,
            found,
          )

          await updateDivision(
            sourceDivision.id,
            {
              bookComponents: updatedBookComponents,
            },
            { trx: tr },
          )
        } else {
          sourceDivision.bookComponents.splice(found, 1)
          await updateDivision(
            sourceDivision.id,
            {
              bookComponents: sourceDivision.bookComponents,
            },
            { trx: tr },
          )

          const targetDivision = await getDivision(targetDivisionId, {
            trx: tr,
          })

          const updatedTargetDivisionBookComponents = utils.reorderArray(
            targetDivision.bookComponents,
            bookComponentId,
            index,
          )

          const updatedDivision = await updateDivision(
            targetDivision.id,
            {
              bookComponents: updatedTargetDivisionBookComponents,
            },
            { trx: tr },
          )

          const divisionConfig = find(divisions, {
            name: updatedDivision.label,
          })

          await updateBookComponent(
            bookComponentId,
            {
              divisionId: targetDivision.id,
              componentType: divisionConfig.defaultComponentType,
            },
            { trx: tr },
          )
        }

        // return getBook(sourceDivision.bookId, { trx: tr })
        return Book.query(tr)
          .findById(sourceDivision.bookId)
          .throwIfNotFound()
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  createDivision,
  updateBookComponentOrder,
  getDivision,
}
