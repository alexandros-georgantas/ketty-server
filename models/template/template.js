const { Model } = require('objection')
const remove = require('lodash/remove')
const Base = require('../ketidaBase')

const { id, stringNotEmpty, string, targetType, notesType } =
  require('../helpers').schema

class Template extends Base {
  constructor(properties) {
    super(properties)
    this.type = 'template'
  }

  static get tableName() {
    return 'Template'
  }

  static get schema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        name: stringNotEmpty,
        referenceId: id,
        thumbnailId: id,
        author: string,
        target: targetType,
        trimSize: string,
        exportScripts: {
          type: ['object', 'array'],
        },
        notes: notesType,
      },
    }
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const { model: File } = require('../file')
    /* eslint-enable global-require */
    return {
      files: {
        relation: Model.HasManyRelation,
        modelClass: File,
        join: {
          from: 'File.templateId',
          to: 'Template.id',
        },
      },
      thumbnail: {
        relation: Model.BelongsToOneRelation,
        modelClass: File,
        join: {
          from: 'Template.thumbnailId',
          to: 'File.id',
        },
      },
    }
  }

  async getFiles(tr = undefined) {
    const { thumbnailId } = this
    const associatedFiles = await this.$relatedQuery('files', tr)

    if (thumbnailId) {
      remove(associatedFiles, file => file.id === thumbnailId)
    }

    remove(associatedFiles, file => file.deleted === true)
    return associatedFiles
  }

  async getThumbnail(tr = undefined) {
    const { thumbnailId } = this

    if (thumbnailId) {
      return this.$relatedQuery('thumbnail', tr)
    }

    return null
  }
}

module.exports = Template
