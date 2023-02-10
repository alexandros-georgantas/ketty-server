const models = require('../../data-model')
const resolvers = require('./division.resolvers')
const typeDefs = require('../graphqlLoaderUtil')('division/division.graphql')

module.exports = {
  resolvers,
  typeDefs,
  model: models.division,
}
