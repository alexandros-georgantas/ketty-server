const models = require('../../data-model')
const resolvers = require('./team.resolvers')
const typeDefs = require('../graphqlLoaderUtil')('team/team.graphql')

module.exports = {
  resolvers,
  typeDefs,
  model: models.team,
}
