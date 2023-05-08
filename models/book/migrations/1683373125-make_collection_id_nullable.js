exports.up = async knex => {
    return knex.schema.alterTable('Book', table => {
      table.uuid('collectionId').alter().nullable()
    })
}