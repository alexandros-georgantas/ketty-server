const { uuid } = require('@coko/server')

const Book = require('../book/book.model')
const ExportProfile = require('../exportProfile/exportProfile.model')
const BookExportProfile = require('../bookExportProfile/bookExportProfile.model')

const clearDb = require('../../scripts/helpers/_clearDB')

describe('Book Export Profile model', () => {
  beforeEach(() => clearDb())

  afterAll(() => {
    const knex = BookExportProfile.knex()
    knex.destroy()
  })

  it('creates an association between a book an an export profile', async () => {
    const templateId = uuid()
    const book = await Book.insert({})

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    const bookExportProfile = BookExportProfile.insert({
      bookId: book.id,
      exportProfileId: exportProfile.id,
    })

    expect(bookExportProfile).toBeDefined()
  })

  it('throws when the combination of book id with export profile id is not unique', async () => {
    const templateId = uuid()
    const book1 = await Book.insert({})

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    await BookExportProfile.insert({
      bookId: book1.id,
      exportProfileId: exportProfile.id,
    })

    await expect(
      BookExportProfile.insert({
        bookId: book1.id,
        exportProfileId: exportProfile.id,
      }),
    ).rejects.toThrow(
      'insert into "book_export_profiles" ("book_id", "created", "deleted", "export_profile_id", "id", "type", "updated") values ($1, $2, $3, $4, $5, $6, $7) returning "id" - duplicate key value violates unique constraint "book_export_profiles_export_profile_id_unique"',
    )
  })

  it('throws when more than one book is associated with the same export profile', async () => {
    const templateId = uuid()
    const book1 = await Book.insert({})
    const book2 = await Book.insert({})

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    await BookExportProfile.insert({
      bookId: book1.id,
      exportProfileId: exportProfile.id,
    })

    await expect(
      BookExportProfile.insert({
        bookId: book2.id,
        exportProfileId: exportProfile.id,
      }),
    ).rejects.toThrow(
      'insert into "book_export_profiles" ("book_id", "created", "deleted", "export_profile_id", "id", "type", "updated") values ($1, $2, $3, $4, $5, $6, $7) returning "id" - duplicate key value violates unique constraint "book_export_profiles_export_profile_id_unique"',
    )
  })

  it('deletes associated records when book is deleted', async () => {
    const templateId = uuid()

    const book1 = await Book.insert({})

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    const exportProfile2 = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    await BookExportProfile.insert({
      bookId: book1.id,
      exportProfileId: exportProfile.id,
    })
    await BookExportProfile.insert({
      bookId: book1.id,
      exportProfileId: exportProfile2.id,
    })

    await Book.deleteById(book1.id)
    const { result } = await BookExportProfile.find({ bookId: book1.id })
    const { result: exportProfiles } = await BookExportProfile.find({})

    expect(result).toHaveLength(0)
    expect(exportProfiles).toHaveLength(0)
  })

  it('deletes associated records when export profile is deleted', async () => {
    const templateId = uuid()
    const book1 = await Book.insert({})

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    await BookExportProfile.insert({
      bookId: book1.id,
      exportProfileId: exportProfile.id,
    })

    await ExportProfile.deleteById(exportProfile.id)
    const { result } = await BookExportProfile.find({ bookId: book1.id })

    expect(result).toHaveLength(0)
  })
})
