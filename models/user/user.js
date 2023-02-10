const user = require('@pubsweet/model-user')

const User = user.model

const { ValidationError } = require('@pubsweet/errors')

class KetidaUser extends User {
  static get schema() {
    return {
      type: 'object',
      properties: {
        password: {
          type: 'string',
        },
        givenName: {
          type: 'string',
        },
        surname: {
          type: 'string',
        },
        deleted: {
          type: 'boolean',
          default: false,
        },
      },
    }
  }

  static async findById(id) {
    return this.find(id)
  }

  async hashPassword(pwd) {
    this.passwordHash = await User.hashPassword(pwd)
    delete this.password
  }

  async $beforeInsert() {
    super.$beforeInsert()
    if (this.password) await this.hashPassword(this.password)
  }

  static async updatePassword(
    userId,
    currentPassword,
    newPassword,
    options = {},
  ) {
    const { trx } = options
    const foundUser = await User.query(trx).findById(userId)

    const isCurrentPasswordValid = await foundUser.validPassword(
      currentPassword,
    )

    if (!isCurrentPasswordValid) {
      throw new ValidationError(
        'Update password: Current password is not valid',
      )
    }

    if (await foundUser.validPassword(newPassword)) {
      throw new ValidationError(
        'Update password: New password must be different from current password',
      )
    }

    const passwordHash = await User.hashPassword(newPassword)

    return foundUser.$query(trx).patchAndFetch({
      passwordHash,
    })
  }
}

module.exports = KetidaUser
