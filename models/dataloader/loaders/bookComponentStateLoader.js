const Loader = require('../loader')
const { model } = require('../../bookComponentState')

const BookComponentStateLoader = {
  state: new Loader(
    async bookComponentId =>
      // eslint-disable-next-line no-return-await
      await model.query().where('bookComponentId', bookComponentId),
  ),
}

module.exports = BookComponentStateLoader
