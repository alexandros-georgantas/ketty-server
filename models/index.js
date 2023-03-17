const applicationParameter = require('./applicationParameter')
const book = require('./book')
const bookCollection = require('./bookCollection')
const bookCollectionTranslation = require('./bookCollectionTranslation')
const bookComponent = require('./bookComponent')
const bookComponentState = require('./bookComponentState')
const bookComponentTranslation = require('./bookComponentTranslation')
const bookTranslation = require('./bookTranslation')
const file = require('./file')
const template = require('./template')
const customTag = require('./customTag')
const division = require('./division')
const team = require('./team')
const teamMember = require('./teamMember')
const user = require('./user')
const lock = require('./lock')
const serviceCallbackToken = require('./serviceCallbackToken')
const { models } = require('./dataloader')

const loader = models.reduce((r, c) => Object.assign(r, c), {})

module.exports = {
  book,
  customTag,
  team,
  teamMember,
  user,
  applicationParameter,
  bookCollection,
  bookCollectionTranslation,
  bookComponent,
  bookComponentState,
  bookComponentTranslation,
  bookTranslation,
  division,
  file,
  lock,
  loader,
  template,
  serviceCallbackToken,
  models: {
    ApplicationParameter: applicationParameter.model,
    Book: book.model,
    BookCollection: bookCollection.model,
    BookCollectionTranslation: bookCollectionTranslation.model,
    BookComponent: bookComponent.model,
    BookComponentState: bookComponentState.model,
    BookComponentTranslation: bookComponentTranslation.model,
    BookTranslation: bookTranslation.model,
    CustomTag: customTag.model,
    Division: division.model,
    File: file.model,
    Team: team.model,
    TeamMember: teamMember.model,
    Template: template.model,
    User: user.model,
    Lock: lock.model,
    loader,
    ServiceCallbackToken: serviceCallbackToken.model,
  },
}
