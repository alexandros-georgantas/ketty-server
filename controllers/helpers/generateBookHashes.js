const { fileStorage } = require('@coko/server')
const fs = require('fs-extra')
const config = require('config')
const path = require('path')
const get = require('lodash/get')

const Template = require('../../models/template/template.model')
const Book = require('../../models/book/book.model')

const { download } = fileStorage

const createBookHTML = require('./createBookHTML')
const generateHash = require('./generateHash')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const generateBookHashes = async (bookId, templateId) => {
  const template = await Template.findById(templateId)
  const book = await Book.findById(bookId)

  if (!template) {
    throw new Error(`template with id ${templateId} does not exist`)
  }

  const templateFiles = await template.getFiles()
  let stylesheet

  templateFiles.forEach(file => {
    const storedObject = file.getStoredObjectBasedOnType('original')
    const { mimetype } = storedObject

    if (mimetype === 'text/css') {
      stylesheet = storedObject
    }
  })

  if (!stylesheet) {
    throw new Error(`template with id ${templateId} does not have a stylesheet`)
  }

  // make stylesheet hash
  const stylesheetFilename = `${crypto.randomBytes(32).toString('hex')}.css`

  const tempStylesheetPath = path.join(
    `${process.cwd()}`,
    uploadsDir,
    'temp',
    'stylesheets',
    stylesheetFilename,
  )

  await fs.ensureDir(tempStylesheetPath)
  await download(stylesheet.key, tempStylesheetPath)

  const stylesheetHash = await generateHash(fs.readFileSync(tempStylesheetPath))

  await fs.remove(tempStylesheetPath)

  const bookHTML = await createBookHTML(bookId)
  const contentHash = await generateHash(bookHTML)
  const metadataHash = await generateHash(JSON.stringify(book.podMetadata))

  return { contentHash, metadataHash, stylesheetHash }
}

module.exports = generateBookHashes
