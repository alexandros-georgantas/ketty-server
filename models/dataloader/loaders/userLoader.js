const { model } = require('@pubsweet/model-user')
const Loader = require('../loader')

const UserLoader = {
  userTeams: new Loader(
    async id =>
      // eslint-disable-next-line no-return-await
      await model.find(id, {
        eager: 'teams',
      }),
  ),
}

module.exports = UserLoader
