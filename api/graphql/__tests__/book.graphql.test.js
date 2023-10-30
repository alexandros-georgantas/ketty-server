/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
/* eslint-disable jest/no-disabled-tests */
const _ = require('lodash')
const BookTranslation = require('../../../models/bookTranslation/bookTranslation.model')
/*const { useTransaction } = require('@coko/server')
const User = require('../../../models/user/user.model')
const Team = require('../../../models/team/team.model')
*/
const seedAdmin = require('../../../scripts/seeds/admin')
//const seedUser = require('../../../scripts/seeds/user')
//const seedBookCollection = require('../../../scripts/seeds/bookCollection')
const seedGlobalTeams = require('../../../scripts/seeds/globalTeams')
const seedApplicationParams = require('../../../scripts/seeds/applicationParameters')
const clearDb = require('../../../scripts/helpers/_clearDB')
const testGraphQLServer = require('../../../scripts/helpers/testGraphQLServer')

describe('Book GraphQL Query', () => {
  let user
  let testServer

  beforeEach(async () => {
    await clearDb()
    await seedGlobalTeams()
    await seedApplicationParams()
    user = await seedAdmin({
      username: 'admin',
      password: 'password',
      email: 'admin@example.com',
      givenNames: 'Admin',
      surname: 'Adminius',
    })
    testServer = await testGraphQLServer(user.id)
  })

  it('creates a book with just a title', async () => {
    const res = await testServer.executeOperation({
      query: `mutation($input: CreateBookInput!){
  createBook(input: $input) {
    id
    authors{id}
    archived
    bookStructure{id}
    collectionId
    copyrightStatement
    copyrightYear
    copyrightHolder
    divisions{id}
    edition
    isPublished
    isbn
    issn
    issnL
    license
    productionEditors
    publicationDate
    subtitle
    podMetadata{isbns{isbn, label}}
    associatedTemplates{epub{templateId}}
    status
    title
    thumbnailId
    thumbnailURL
  }}`,
      variables: {
        input: {title: "A book with just a title"},
      }
    })

    const bookData = res.data.createBook
    expect(res.errors).toBe(undefined)
    expect(_.sortBy(Object.keys(bookData))).toEqual([
      'archived',
      'associatedTemplates',
      'authors',
      'bookStructure',
      'collectionId',
      'copyrightHolder',
      'copyrightStatement',
      'copyrightYear',
      'divisions',
      'edition',
      'id',
      'isPublished',
      'isbn',
      'issn',
      'issnL',
      'license',
      'podMetadata',
      'productionEditors',
      'publicationDate',
      'status',
      'subtitle',
      'thumbnailId',
      'thumbnailURL',
      'title',
    ])
    // Book was created without an author
    expect(bookData.authors).toEqual([])
    expect(bookData.podMetadata).toBe(null)
    expect(bookData.title).toEqual('A book with just a title')

    // There should be exactly on Book and therefore, one BookTranslation
    const bookTranslations = await BookTranslation.query()
    expect(bookTranslations.length).toEqual(1)
    expect(bookTranslations[0].bookId).toEqual(bookData.id)
    expect(bookTranslations[0].title).toEqual(bookData.title)
  })

})
