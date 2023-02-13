const merge = require('lodash/merge')
const authorize = require('./authorize')
const applicationParameter = require('./applicationParameter')
const book = require('./book')
const bookComponent = require('./bookComponent')
const bookCollection = require('./bookCollection')
const customTag = require('./customTag')
const division = require('./division')
const team = require('./team')
const user = require('./user')
const template = require('./template')
const file = require('./file')

module.exports = {
  typeDefs: [
    authorize.typeDefs,
    applicationParameter.typeDefs,
    book.typeDefs,
    bookComponent.typeDefs,
    bookCollection.typeDefs,
    customTag.typeDefs,
    division.typeDefs,
    file.typeDefs,
    team.typeDefs,
    user.typeDefs,
    template.typeDefs,
  ].join(' '),
  resolvers: merge(
    {},
    authorize.resolvers,
    applicationParameter.resolvers,
    book.resolvers,
    bookComponent.resolvers,
    bookCollection.resolvers,
    customTag.resolvers,
    division.resolvers,
    file.resolvers,
    team.resolvers,
    template.resolvers,
    user.resolvers,
  ),
}
