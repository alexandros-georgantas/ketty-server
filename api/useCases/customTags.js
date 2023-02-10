const { logger, useTransaction } = require('@coko/server')
const { CustomTag } = require('../../data-model/src').models

const getCustomTags = async (options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        logger.info('>>> fetching all the custom tags')
        const customTags = await CustomTag.query(tr).where({ deleted: false })

        if (!customTags) {
          throw new Error(`CustomTags error: Could not fetch Tags`)
        }

        return customTags
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const addCustomTag = async (label, tagType, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const newCustomTag = await CustomTag.query(tr).insert({
          label,
          tagType,
        })

        logger.info(`>>> new custom tag created with id ${newCustomTag.id}`)
        return newCustomTag
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateCustomTag = async (tags, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        await Promise.all(
          tags.map(async tag => {
            const { id, deleted, tagType, label } = tag
            logger.info(`>>> updating custom tag with id ${id}`)
            return CustomTag.query(tr).patchAndFetchById(id, {
              label,
              deleted,
              tagType,
            })
          }),
        )

        const customTags = await CustomTag.query(tr).where({ deleted: false })

        return customTags
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  getCustomTags,
  addCustomTag,
  updateCustomTag,
}
