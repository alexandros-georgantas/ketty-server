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
  type: ['string', null],
  enum: ['8.5x11', '6x9', '5.5x8.5'],
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
    if (this.format === 'epub' && this.trimSize) {
      throw new objection.ValidationError({
        message: 'trim size is only valid option for PDF format',
        type: 'ValidationError',
      })
    }

    if (this.format === 'pdf' && !this.trimSize) {
      throw new objection.ValidationError({
        message: 'trim size is required for PDF format',
        type: 'ValidationError',
      })
    }

    super.$beforeInsert(queryContext)
  }

  static async beforeUpdate({ asFindQuery, inputItems }) {
    try {
      const affectedItems = await asFindQuery().select('*')

      affectedItems.forEach(item => {
        const { format: itemFormat } = item
        inputItems.forEach(input => {
          const { trimSize: inputTrimSize } = input

          if (itemFormat === 'epub') {
            if (inputTrimSize) {
              throw new objection.ValidationError({
                message: 'trim size is only valid option for PDF format',
                type: 'ValidationError',
              })
            }
          }

          if (itemFormat === 'pdf') {
            if (!inputTrimSize) {
              throw new objection.ValidationError({
                message: 'trim size is required for PDF format',
                type: 'ValidationError',
              })
            }
          }
        })
      })
    } catch (e) {
      throw new Error(e.message)
    }
  }

  static get schema() {
    return {
      additionalProperties: false,
      type: 'object',
      required: ['bookId', 'displayName', 'format', 'templateId'],
      properties: {
        bookId: id,
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
