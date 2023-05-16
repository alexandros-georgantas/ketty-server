const { db } = require('@coko/server')

module.exports = async () => {
  await db.raw('DROP SCHEMA public CASCADE;CREATE SCHEMA public;')
  return db.destroy()
}
