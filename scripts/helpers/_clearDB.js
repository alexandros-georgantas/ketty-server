const { db } = require('@coko/server')
const isEmpty = require('lodash/isEmpty')
const remove = require('lodash/remove')

const dbCleaner = async () => {
  const query = await db.raw(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`,
  )

  const { rows } = query

  if (!isEmpty(rows)) {
    let cleanedRows = rows

    cleanedRows = remove(rows, row => row.tablename === 'migrations')

    return Promise.all(
      cleanedRows.map(async row => {
        const { tablename } = row

        return db.raw(`TRUNCATE TABLE ${tablename} CASCADE`)
      }),
    )
  }

  return true
}

module.exports = dbCleaner
