const { Model } = require('objection')

const Translation = require('../translation')
const { model: Book } = require('../book')

const {
  arrayOfStringsNotEmpty,
  id,
  string,
  stringNotEmpty,
} = require('../helpers').schema

class BookTranslation extends Translation {
  constructor(properties) {
    super(properties)
    this.type = 'bookTranslation'
  }

  static get tableName() {
    return 'BookTranslation'
  }

  static get relationMappings() {
    return {
      book: {
        relation: Model.BelongsToOneRelation,
        modelClass: Book,
        join: {
          from: 'BookTranslation.bookId',
          to: 'Book.id',
        },
      },
    }
  }

  static get schema() {
    return {
      type: 'object',
      required: ['bookId', 'title'],
      properties: {
        abstractContent: string,
        abstractTitle: string,
        alternativeTitle: string,
        bookId: id,
        keywords: arrayOfStringsNotEmpty,
        subtitle: string,
        title: stringNotEmpty,
      },
    }
  }

  getBook() {
    return this.$relatedQuery('book')
  }
}

module.exports = BookTranslation
