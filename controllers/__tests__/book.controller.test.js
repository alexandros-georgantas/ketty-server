const User = require('../../models/user/user.model')
const BookTranslation = require('../../models/bookTranslation/bookTranslation.model')
const seedBookCollection = require('../../scripts/seeds/bookCollection')
const seedAdmin = require('../../scripts/seeds/admin')

const clearDb = require('../../scripts/helpers/_clearDB')
const { createBook } = require('../book.controller')

describe('Book Controller', () => {
  beforeEach(async () => {
    try {
      return clearDb()
    } catch (e) {
      throw new Error(e.message)
    }
  })

  it('creates a book by providing a collectionId', async () => {
    const newCollection = await seedBookCollection()
    const newBook = await createBook({ collectionId: newCollection.id })
    expect(newBook).toBeDefined()
    expect(newBook.collectionId).toEqual(newCollection.id)
  })

  it('creates a book by providing a collectionId and a title', async () => {
    const newCollection = await seedBookCollection()
    const title = 'Test Book'
    const newBook = await createBook({ collectionId: newCollection.id, title })

    const bookTranslation = await BookTranslation.findOne({
      bookId: newBook.id,
    })

    expect(newBook).toBeDefined()
    expect(newBook.collectionId).toEqual(newCollection.id)
    expect(bookTranslation).toBeDefined()
    expect(bookTranslation.title).toEqual(title)
  })

  it('creates a book by providing just a title', async () => {
    const title = 'Test Book'
    const newBook = await createBook({ title })

    const bookTranslation = await BookTranslation.findOne({
      bookId: newBook.id,
    })

    expect(newBook).toBeDefined()
    expect(newBook.collectionId).toEqual(undefined)
    expect(bookTranslation).toBeDefined()
    expect(bookTranslation.title).toEqual(title)
  })

  it('creates a book without collectionId nor title', async () => {
    const newBook = await createBook()

    const bookTranslation = await BookTranslation.findOne({
      bookId: newBook.id,
    })

    expect(newBook).toBeDefined()
    expect(newBook.collectionId).toEqual(undefined)
    expect(bookTranslation).toBeDefined()
    expect(bookTranslation.title).toEqual(null)
  })

  it('creates a book without collectionId nor title and adds creator to specified teams', async () => {
    const user = await seedAdmin({
      username: 'admin',
      password: 'password',
      email: 'admin@example.com',
      givenNames: 'Admin',
      surname: 'Adminius',
    })

    const newBook = await createBook({
      options: {
        addUserToBookTeams: ['productionEditor'],
        userId: user.id,
      },
    })

    const bookTranslation = await BookTranslation.findOne({
      bookId: newBook.id,
    })

    const isTeamMember = await User.hasRoleOnObject(
      user.id,
      'productionEditor',
      newBook.id,
    )

    expect(newBook).toBeDefined()
    expect(newBook.collectionId).toEqual(undefined)
    expect(bookTranslation).toBeDefined()
    expect(bookTranslation.title).toEqual(null)
    expect(isTeamMember).toEqual(true)
  })
})
