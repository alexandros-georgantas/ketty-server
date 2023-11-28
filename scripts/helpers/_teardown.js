const { db } = require('@pubsweet/db-manager')

module.exports = async () => {
  db.destroy()
}
