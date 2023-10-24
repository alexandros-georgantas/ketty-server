const { logger } = require('@coko/server')

exports.up = async knex => {
  try {
    return knex.schema.createTable('book_export_profiles', table => {
      table.uuid('id').primary()
      table.text('type').notNullable()
      table
        .timestamp('created', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())
      table.timestamp('updated', { useTz: true })
      table
        .uuid('bookId')
        .notNullable()
        .references('id')
        .inTable('book')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .uuid('exportProfileId')
        .notNullable()
        .references('id')
        .inTable('export_profiles')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.boolean('deleted').defaultTo(false)
      table.unique('export_profile_id')
      table.unique(['book_id', 'export_profile_id'])
    })
  } catch (e) {
    logger.error(e)
    throw new Error(`Migration: Book Export Profiles: initial migration failed`)
  }
}

exports.down = async knex => knex.schema.dropTable('book_export_profiles')
