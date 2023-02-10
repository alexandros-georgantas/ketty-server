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
// const bookCollectionTranslation = require('./bookCollectionTranslation')
// const bookComponentState = require('./bookComponentState')
// const bookComponentTranslation = require('./bookComponentTranslation')
// const bookTranslation = require('./bookTranslation')
const file = require('./file')
const exportScript = require('./exportScript')

module.exports = {
  typeDefs: [
    authorize.typeDefs,
    applicationParameter.typeDefs,
    book.typeDefs,
    bookComponent.typeDefs,
    bookCollection.typeDefs,
    customTag.typeDefs,
    division.typeDefs,
    exportScript.typeDefs,
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
    exportScript.resolvers,
    file.resolvers,
    team.resolvers,
    template.resolvers,
    user.resolvers,
  ),
  // context: {
  //   book: book.model,
  //   bookComponent: bookComponent.model,
  //   bookCollection: bookCollection.model,
  //   division: division.model,
  //   bookCollectionTranslation: bookCollectionTranslation.model,
  //   bookComponentState: bookComponentState.model,
  //   bookComponentTranslation: bookComponentTranslation.model,
  //   bookTranslation: bookTranslation.model,
  //   // file: file.model,
  //   // TODO: loaders should be implemented
  //   // loaders: loaders()
  // },
}
