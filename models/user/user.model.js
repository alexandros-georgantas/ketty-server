const BaseUserModel = require('@coko/server/src/models/user/user.model')

class UserModel extends BaseUserModel {
  static searchActiveVerifiedUsersWithEmail(options, searchLow, exclude) {
    const { trx } = options

    return BaseUserModel.query(trx)
      .leftJoin('identities', 'identities.user_id', 'users.id')
      .where({
        'users.is_active': true,
        'identities.is_verified': true,
        'identities.is_default': true,
        'identities.email': searchLow,
      })
      .whereNotIn('users.id', exclude)
      .skipUndefined()
  }
}

module.exports = UserModel
