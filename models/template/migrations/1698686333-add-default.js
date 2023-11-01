exports.up = async knex =>
  knex.schema.table('template', table => {
    table.boolean('default').defaultTo(false)
  })
