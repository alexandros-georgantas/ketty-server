/*
  TO DO

  Define notes schema more accurately
*/

const { Model } = require('objection')

const Translation = require('../translation')
const { model: BookComponent } = require('../bookComponent')
const { id, string } = require('../helpers').schema

class BookComponentTranslation extends Translation {
  constructor(properties) {
    super(properties)
    this.type = 'bookComponentTranslation'
  }

  static get tableName() {
    return 'BookComponentTranslation'
  }

  static get relationMappings() {
    return {
      bookComponent: {
        relation: Model.BelongsToOneRelation,
        modelClass: BookComponent,
        join: {
          from: 'BookComponentTranslation.bookComponentId',
          to: 'BookComponent.id',
        },
      },
    }
  }

  static get schema() {
    return {
      type: 'object',
      required: ['bookComponentId'],
      properties: {
        bookComponentId: id,
        content: string,
        notes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: string,
            },
          },
        },
        title: string,
      },
    }
  }

  getBookComponent() {
    return this.$relatedQuery('bookComponent')
  }
}

module.exports = BookComponentTranslation
