/*
  BookSettings: Settings of a book
*/

const { Model } = require('objection')

const Base = require('../ketidaBase')

const { booleanDefaultFalse, id } = require('../helpers').schema

class BookSettings extends Base {
  constructor(properties) {
    super(properties)
    this.type = 'bookSettings'
  }

  static get tableName() {
    return 'BookSettings'
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const Book = require('../book/book.model')

    return {
      book: {
        relation: Model.HasOneRelation,
        modelClass: Book,
        join: {
          from: 'BookSettings.bookId',
          to: 'Book.id',
        },
      },
    }
  }

  static get schema() {
    return {
      type: 'object',
      required: ['bookId'],
      properties: {
        aiOn: booleanDefaultFalse,
        aiPdfDesignerOn: booleanDefaultFalse,
        bookId: id,
      },
    }
  }

  getBook() {
    return this.$relatedQuery('book')
  }
}

module.exports = BookSettings
