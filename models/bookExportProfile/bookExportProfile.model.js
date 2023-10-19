const Base = require('../ketidaBase')
const { id } = require('../helpers').schema

class ExportProfile extends Base {
  constructor(properties) {
    super(properties)
    this.type = 'bookExportProfile'
  }

  static get tableName() {
    return 'BookExportProfiles'
  }

  static get schema() {
    return {
      additionalProperties: false,
      type: 'object',
      required: ['bookId', 'exportProfileId'],
      properties: {
        bookId: id,
        exportProfileId: id,
      },
    }
  }
}

module.exports = ExportProfile
