const { db } = require('@coko/server')
const isEmpty = require('lodash/isEmpty')
const remove = require('lodash/remove')

const dbCleaner = async () => {
  try {
    const query = await db.raw(
      `SELECT tablename FROM pg_tables WHERE schemaname='public'`,
    )

    const { rows } = query

    if (!isEmpty(rows)) {
      const cleanedRows = rows
      remove(rows, row => row.tablename === 'migrations')

      await Promise.all(
        cleanedRows.map(async row => {
          const { tablename } = row

          return db.raw(`TRUNCATE TABLE ${tablename} CASCADE`)
        }),
      )
    }

    return true
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = dbCleaner
