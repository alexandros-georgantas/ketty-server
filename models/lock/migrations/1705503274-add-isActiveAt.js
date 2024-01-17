const { logger } = require('@coko/server')

exports.up = async knex => {
  try {
    return knex.schema.table('lock', table => {
      table.timestamp('isActiveAt', { useTz: true }).nullable()
    })
  } catch (e) {
    logger.error(e)
    throw new Error('Migration: Lock: adding isActiveAt failed')
  }
}

exports.down = async knex => {
  try {
    return knex.schema.table('lock', table => {
      table.dropColumn('isActiveAt')
    })
  } catch (e) {
    logger.error(e)
    throw new Error('Migration: Lock: removing isActiveAt failed')
  }
}
