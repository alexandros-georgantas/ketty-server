const resolvers = require('./file.resolvers')
const typeDefs = require('../graphqlLoaderUtil')('file/file.graphql')

module.exports = {
  resolvers,
  typeDefs,
  // TODO: implement model
  // model: require('./file.model'),
}
