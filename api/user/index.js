const models = require('../../data-model')
const resolvers = require('./user.resolvers')
const typeDefs = require('../graphqlLoaderUtil')('user/user.graphql')

module.exports = {
  resolvers,
  typeDefs,
  model: models.user,
}
