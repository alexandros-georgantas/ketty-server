// const { Model } = require('objection')
const objection = require('objection')

const Base = require('../ketidaBase')
const { id, stringNotEmpty, date } = require('../helpers').schema

const format = {
  enum: ['epub', 'pdf'],
}

const trimSize = {
  enum: ['8.5x11', '6x9', '5.5x8.5', null],
}

const providerItem = {
  type: 'object',
  additionalProperties: false,
  required: ['providerLabel', 'externalProjectId'],
  properties: {
    providerLabel: stringNotEmpty,
    externalProjectId: stringNotEmpty,
    bookMetadataHash: stringNotEmpty,
    bookContentHash: stringNotEmpty,
    templateHash: stringNotEmpty,
    lastSync: date,
  },
}

const includedComponents = {
  type: 'object',
  additionalProperties: false,
  properties: {
    toc: { type: 'boolean', default: true },
    copyright: { type: 'boolean', default: true },
    titlePage: { type: 'boolean', default: true },
  },
  default: {
    toc: true,
    copyright: true,
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
    const affectedItems = await asFindQuery().select('*')

    affectedItems.forEach(item => {
      const { format: currentFormat, trimSize: currentTrimSize } = item

      inputItems.forEach(input => {
        const { format: incomingFormat, trimSize: incomingTrimSize } = input

        const finalFormat = incomingFormat || currentFormat
        const finalTrimSize = incomingTrimSize || currentTrimSize

        if (finalFormat === 'epub') {
          if (finalTrimSize) {
            throw new objection.ValidationError({
              message: 'trim size is only valid option for PDF format',
              type: 'ValidationError',
            })
          }
        }

        if (finalFormat === 'pdf') {
          if (!finalTrimSize) {
            throw new objection.ValidationError({
              message: 'trim size is required for PDF format',
              type: 'ValidationError',
            })
          }
        }
      })
    })
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
