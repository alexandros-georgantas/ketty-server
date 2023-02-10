const { Model } = require('objection')

const Base = require('../ketidaBase')

const {
  arrayOfStringsNotEmpty,
  id,
  integerPositive,
  mimetype,
  stringNotEmpty,
  uri,
} = require('../helpers').schema

class File extends Base {
  constructor(properties) {
    super(properties)
    this.type = 'file'
  }

  static get tableName() {
    return 'File'
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const { model: Book } = require('../book')
    const { model: BookComponent } = require('../bookComponent')
    const { model: FileTranslation } = require('../fileTranslation')
    const { model: Template } = require('../template')
    /* eslint-enable global-require */

    return {
      book: {
        relation: Model.BelongsToOneRelation,
        modelClass: Book,
        join: {
          from: 'File.bookId',
          to: 'Book.id',
        },
      },
      bookComponent: {
        relation: Model.BelongsToOneRelation,
        modelClass: BookComponent,
        join: {
          from: 'File.bookComponentId',
          to: 'BookComponent.id',
        },
      },
      template: {
        relation: Model.BelongsToOneRelation,
        modelClass: Template,
        join: {
          from: 'File.templateId',
          to: 'Template.id',
        },
      },
      fileTranslations: {
        relation: Model.HasManyRelation,
        modelClass: FileTranslation,
        join: {
          from: 'File.id',
          to: 'FileTranslation.fileId',
        },
      },
    }
  }

  static get schema() {
    return {
      type: 'object',
      required: ['name', 'objectKey'],
      properties: {
        name: stringNotEmpty,
        bookId: id,
        extension: stringNotEmpty,
        bookComponentId: id,
        templateId: id,
        mimetype,
        referenceId: id,
        size: integerPositive,
        source: uri,
        objectKey: stringNotEmpty,
        metadata: {
          type: 'object',
          properties: {
            width: integerPositive,
            height: integerPositive,
            density: integerPositive,
            space: stringNotEmpty,
          },
        },
        tags: arrayOfStringsNotEmpty,
      },
    }
  }

  getBook() {
    return this.$relatedQuery('book')
  }

  getBookComponent() {
    return this.$relatedQuery('bookComponent')
  }

  getFileTranslations() {
    return this.$relatedQuery('fileTranslations')
  }

  getTemplate() {
    return this.$relatedQuery('template')
  }
}

module.exports = File
