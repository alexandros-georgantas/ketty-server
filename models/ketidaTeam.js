/*
  An extension of pubsweet's base model with some bells and whistles.
  All other Ketida models will (and should) extend this class.
*/

const team = require('@pubsweet/model-team')

const Team = team.models[0].model

class KetidaTeam extends Team {
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

  // get members() {
  //   if (!this.members) {
  //     return []
  //   }
  //   return this.member
  // }

  static async findById(id) {
    return this.find(id)
  }
}

module.exports = KetidaTeam
