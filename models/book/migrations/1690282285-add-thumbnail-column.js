const { logger } = require('@coko/server')
const { Book } = require('@pubsweet/models')

exports.up = async knex => {
  try {
    await knex.schema.table('book', table => {
      table.uuid('thumbnailId').nullable()
    })

    const books = await Book.query().select('id')

    const updates = books.map(book => {
      return Book.query()
        .patch({
          thumbnailId: null,
        })
        .where('id', book.id)
    })

    return updates
  } catch (e) {
    logger.error(e)
    throw new Error(`Migration: Book: adding thumbnailId column failed`)
  }
}

exports.down = async knex => {
  try {
    return knex.schema.table('book', table => {
      table.dropColumn('thumbnailId')
    })
  } catch (e) {
    logger.error(e)
    throw new Error(`Migration: Book: removing thumbnailId column failed`)
  }
}
