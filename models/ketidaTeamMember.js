/*
  An extension of pubsweet's base model with some bells and whistles.
  All other Ketida models will (and should) extend this class.
*/

const team = require('@pubsweet/model-team')

const TeamMember = team.models[1].model

class KetidaTeamMember extends TeamMember {
  $beforeInsert() {
    super.$beforeInsert()
    this.deleted = false
  }

  static get schema() {
    return {
      type: 'object',
      properties: {
        deleted: {
          type: 'boolean',
          default: false,
        },
      },
    }
  }
}

module.exports = KetidaTeamMember
