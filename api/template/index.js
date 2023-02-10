const models = require('../../data-model')
const resolvers = require('./template.resolvers')
const typeDefs = require('../graphqlLoaderUtil')('template/template.graphql')

module.exports = {
  resolvers,
  typeDefs,
  model: models.template,
}
