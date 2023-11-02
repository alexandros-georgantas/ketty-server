const path = require('path')

const {
  connectToFileStorage,
} = require('@coko/server/src/services/fileStorage')

const crypto = require('crypto')
const get = require('lodash/get')
const config = require('config')
const microServicesController = require('../microServices.controller')
const seedBookCollection = require('../../scripts/seeds/bookCollection')
const { createBook } = require('../book.controller')
const seedApplicationParameters = require('../../scripts/seeds/applicationParameters')
const { createDivision } = require('../division.controller')

const createTestFile = require('../../scripts/helpers/_createTestFile')
const clearDb = require('../../scripts/helpers/_clearDB')

const {
  epubcheckerHandler,
  pdfHandler,
  xsweetHandler,
} = require('../microServices.controller')

const { addBookComponent } = require('../bookComponent.controller')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

describe('MicroServices Controller', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('should check epub based on path', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.epub',
    )

    await connectToFileStorage()

    const rs = await epubcheckerHandler(filePath)

    expect(rs.outcome).toBe('ok')
  }, 30000)

  it('should check xsweetHandler based on book component id, filepath', async () => {
    const newCollection = await seedBookCollection()
    await seedApplicationParameters()
    const title = 'Test Book'
    const componentType = 'component'

    const newBook = await createBook({ collectionId: newCollection.id, title })

    const division = await createDivision({ bookId: newBook.id, label: 'body' })

    const bookComponent1 = await addBookComponent(
      division.id,
      newBook.id,
      componentType,
    )

    const filePath = await createTestFile()

    const rs = await xsweetHandler(bookComponent1.id, filePath)

    expect(rs).toBe('ok')
  })

  it('should check pdf based on zipPath, outputPath, pdffile name', async () => {
    const PDFFileTimestamp = `${new Date().getTime() + 2}`
    const PDFFilename = `${crypto.randomBytes(32).toString('hex')}.pdf`

    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.zip',
    )

    const PDFtempFolderFilePath = path.join(
      process.cwd(),
      uploadsDir,
      'temp',
      'paged',
      PDFFileTimestamp,
    )

    const rs = await pdfHandler(filePath, PDFtempFolderFilePath, PDFFilename)

    expect(rs).toBeUndefined()
  }, 30000)

  it('should check paged previewer link based on dir path', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.zip',
    )

    const mockPagedPreviewerLink = jest.fn().mockResolvedValue(true)
    microServicesController.pagedPreviewerLink = mockPagedPreviewerLink

    const res = await microServicesController.pagedPreviewerLink(filePath)

    expect(res).toBe(true)
  })

  it('should check icml handler based on dir path', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.zip',
    )

    const mockIcmlHandler = jest.fn().mockResolvedValue(true)
    microServicesController.icmlHandler = mockIcmlHandler

    const res = await microServicesController.icmlHandler(filePath)

    expect(res).toBe(true)
  })
})
