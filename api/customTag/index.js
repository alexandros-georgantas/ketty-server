const models = require('../../data-model')
const resolvers = require('./customTag.resolvers')
const typeDefs = require('../graphqlLoaderUtil')('customTag/customTag.graphql')

module.exports = {
  resolvers,
  typeDefs,
  model: models.customTag,
}
