const resolvers = require('./exportScript.resolver')

const typeDefs = require('../graphqlLoaderUtil')(
  'exportScript/exportScript.graphql',
)

module.exports = {
  resolvers,
  typeDefs,
}
