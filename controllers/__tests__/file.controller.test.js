const fs = require('fs-extra')
const path = require('path')
const { createFile } = require('@coko/server/src/models/file/file.controller')

const {
  connectToFileStorage,
} = require('@coko/server/src/services/fileStorage')

const seedApplicationParameters = require('../../scripts/seeds/applicationParameters')
const seedBookCollection = require('../../scripts/seeds/bookCollection')

const { createBook } = require('../book.controller')

const clearDb = require('../../scripts/helpers/_clearDB')

const {
  getFiles,
  getFile,
  updateFile,
  getSpecificFiles,
  updateFiles,
  getFileURL,
  getObjectKey,
  getEntityFiles,
  getContentFiles,
  isFileInUse,
} = require('../file.controller')

describe('File Controller', () => {
  beforeEach(async () => {
    await clearDb()
  }, 30000)

  it('creates a file', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(fileStream, 'test.jpg')

    expect(newFile).toBeDefined()
    expect(newFile.storedObjects).toHaveLength(3)
    expect(newFile.name).toEqual('test.jpg')
  })

  it('should update file based on id, data', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const updatedName = 'test1.jpg'

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(fileStream, 'test.jpg')

    const update = await updateFile(newFile.id, { name: updatedName })

    expect(updateFile).toBeDefined()
    expect(update.id).toBe(newFile.id)
    expect(update.name).toBe(updatedName)
  })

  it('should update files based on ids', async () => {
    const filePaths = [
      path.join(process.cwd(), 'controllers', '__tests__', 'files', 'test.jpg'),
      path.join(
        process.cwd(),
        'controllers',
        '__tests__',
        'files',
        'test2.jpg',
      ),
    ]

    const fileStreams = filePaths.map(filePath => fs.createReadStream(filePath))

    await connectToFileStorage()

    const newFiles = await Promise.all(
      fileStreams.map(async (fileStream, index) => {
        const newFileName = `test${index + 1}.jpg`
        const file = await createFile(fileStream, newFileName)
        return file
      }),
    )

    const updatedFiles = await updateFiles([newFiles[0].id, newFiles[1].id], {
      type: 'file',
      name: 'test2.jpg',
      alt: 'img',
    })

    expect(updateFiles).toBeDefined()
    expect(updatedFiles).toBe(2)
  })

  it('should fetch file based on id', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(fileStream, 'test.jpg')

    const fetchFile = await getFile(newFile.id)

    expect(getFile).toBeDefined()
    expect(fetchFile.id).toBe(newFile.id)
  })

  it('should fetch all files', async () => {
    const filePaths = [
      path.join(process.cwd(), 'controllers', '__tests__', 'files', 'test.jpg'),
      path.join(
        process.cwd(),
        'controllers',
        '__tests__',
        'files',
        'test2.jpg',
      ),
    ]

    const fileStreams = filePaths.map(filePath => fs.createReadStream(filePath))

    await connectToFileStorage()

    await Promise.all(
      fileStreams.map(async (fileStream, index) => {
        const newFileName = `test${index + 1}.jpg`
        const file = await createFile(fileStream, newFileName)
        return file
      }),
    )

    const fetchAllFiles = await getFiles()

    expect(getFiles).toBeDefined()
    expect(fetchAllFiles).toHaveLength(2)
  })

  it('should fetch specific files based on ids', async () => {
    const filePaths = [
      path.join(process.cwd(), 'controllers', '__tests__', 'files', 'test.jpg'),
      path.join(
        process.cwd(),
        'controllers',
        '__tests__',
        'files',
        'test2.jpg',
      ),
    ]

    const fileStreams = filePaths.map(filePath => fs.createReadStream(filePath))

    await connectToFileStorage()

    const newFiles = await Promise.all(
      fileStreams.map(async (fileStream, index) => {
        const newFileName = `test${index + 1}.jpg`
        const file = await createFile(fileStream, newFileName)
        return file
      }),
    )

    const specificFiles = await getSpecificFiles([
      newFiles[0].id,
      newFiles[1].id,
    ])

    expect(getSpecificFiles).toBeDefined()
    expect(specificFiles).toHaveLength(2)
  })

  it('should fetch file url based on id', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(fileStream, 'test.jpg')

    const url = await getFileURL(newFile.id)

    expect(getFileURL).toBeDefined()
    expect(url).toMatch(/^https?:\/\/.*/)
  })

  it('should fetch object key based on id', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(fileStream, 'test.jpg')

    const objectKey = await getObjectKey(newFile.id)

    expect(getObjectKey).toBeDefined()
    expect(objectKey).toBe(newFile.storedObjects[0].key)
  })

  it('should fetch entity files based on entityId', async () => {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(
      fileStream,
      'test.jpg',
      null,
      null,
      [],
      '98f7187c-f5f6-4b87-98e6-5c7f1911d1e8',
    )

    const rs = await getEntityFiles('98f7187c-f5f6-4b87-98e6-5c7f1911d1e8')

    expect(getEntityFiles).toBeDefined()
    expect(rs.result[0].id).toBe(newFile.id)
  })

  it('should fetch content based on file ids', async () => {
    const filePaths = [
      path.join(process.cwd(), 'controllers', '__tests__', 'files', 'test.jpg'),
      path.join(
        process.cwd(),
        'controllers',
        '__tests__',
        'files',
        'test2.jpg',
      ),
    ]

    const fileStreams = filePaths.map(filePath => fs.createReadStream(filePath))

    await connectToFileStorage()

    const newFiles = await Promise.all(
      fileStreams.map(async (fileStream, index) => {
        const newFileName = `test${index + 1}.jpg`
        const file = await createFile(fileStream, newFileName)
        return file
      }),
    )

    const contents = await getContentFiles([newFiles[0].id, newFiles[1].id])

    expect(getContentFiles).toBeDefined()
    expect(contents).toHaveLength(2)
  })

  it('should check file is in use or not based on bookId, FileID', async () => {
    const newCollection = await seedBookCollection()
    await seedApplicationParameters()
    const title = 'Test Book'
    const newBook = await createBook({ collectionId: newCollection.id, title })

    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.jpg',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const newFile = await createFile(fileStream, 'test.jpg')

    const checkFileUse = await isFileInUse(newBook.id, newFile.id)

    expect(isFileInUse).toBeDefined()
    expect(checkFileUse).toBeTruthy()
  })
})
