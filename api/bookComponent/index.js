const models = require('../../data-model')
const resolvers = require('./bookComponent.resolvers')

const typeDefs = require('../graphqlLoaderUtil')(
  'bookComponent/bookComponent.graphql',
)

module.exports = {
  resolvers,
  typeDefs,
  model: models.bookComponent,
}
