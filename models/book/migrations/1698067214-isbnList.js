const { logger } = require('@coko/server')
const { Book } = require('@pubsweet/models')

exports.up = async knex => {
  try {
    const tableExists = await knex.schema.hasTable('book')

    if (tableExists) {
      const hasColumnPodMetadata = await knex.schema.hasColumn(
        'book',
        'pod_metadata',
      )

      if (hasColumnPodMetadata) {
        await Book.query()
          .whereRaw("TRIM(pod_metadata->>'isbn') != ''")
          .patch({
            'podMetadata:isbn': knex.raw(
              "json_build_array(json_build_object('label', '', 'isbn', pod_metadata->'isbn')) ",
            ),
          })
        await Book.query()
          .whereRaw("TRIM(pod_metadata->>'isbn') = ''")
          .patch({ 'podMetadata:isbn': knex.raw('json_build_array()') })
      }
    }

    return false
  } catch (e) {
    logger.error(e)
    throw new Error('Migration: Book: conversion to ISBN lists failed')
  }
}
