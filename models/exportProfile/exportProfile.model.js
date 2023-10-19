// const { Model } = require('objection')
const objection = require('objection')

const Base = require('../ketidaBase')
const { id, stringNotEmpty, timestamp } = require('../helpers').schema

const format = {
  additionalProperties: false,
  type: 'string',
  enum: ['epub', 'pdf'],
}

const trimSize = {
  additionalProperties: false,
  type: ['string', 'null'],
  enum: ['8.5x11', '6x9', '5.5x8.5', null],
}

const providerItem = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'externalProjectId',
    'bookMetadataHash',
    'bookContentHash',
    'templateHash',
  ],
  properties: {
    id,
    externalProjectId: id,
    bookMetadataHash: stringNotEmpty,
    bookContentHash: stringNotEmpty,
    templateHash: stringNotEmpty,
    lastSync: timestamp,
  },
}

const includedComponents = {
  type: 'object',
  additionalProperties: false,
  properties: {
    toc: { type: 'boolean', default: true },
    copyrights: { type: 'boolean', default: true },
    titlePage: { type: 'boolean', default: true },
  },
  default: {
    toc: true,
    copyrights: true,
    titlePage: true,
  },
}

const providerInfo = {
  type: 'array',
  default: [],
  additionalProperties: false,
  items: providerItem,
}

class ExportProfile extends Base {
  constructor(properties) {
    super(properties)
    this.type = 'exportProfile'
  }

  static get tableName() {
    return 'ExportProfiles'
  }

  $beforeInsert(queryContext) {
    console.log('here', this)

    if (this.format !== 'pdf' && this.trimSize) {
      throw new objection.ValidationError({
        message: 'trim size is not valid option for EPUB format',
        type: 'ValidationError',
      })
    }

    super.$beforeInsert(queryContext)
  }

  static get schema() {
    return {
      additionalProperties: false,
      type: 'object',
      required: ['displayName', 'format', 'templateId'],
      properties: {
        displayName: stringNotEmpty,
        templateId: id,
        includedComponents,
        format,
        trimSize,
        providerInfo,
      },
    }
  }
}

module.exports = ExportProfile
