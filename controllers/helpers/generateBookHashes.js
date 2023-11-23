const { fileStorage } = require('@coko/server')
const fs = require('fs-extra')
const config = require('config')
const path = require('path')
const get = require('lodash/get')
const crypto = require('crypto')

const Template = require('../../models/template/template.model')
const Book = require('../../models/book/book.model')

const { download } = fileStorage

const createBookHTML = require('./createBookHTML')
const generateHash = require('./generateHash')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const generateBookHashes = async (book, templateId) => {
  const template = await Template.findById(templateId)
  // const book = await Book.findById(book.id)

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

  const dir = path.join(`${process.cwd()}`, uploadsDir, 'temp', 'stylesheets')

  const tempStylesheetPath = path.join(dir, stylesheetFilename)

  // console.log('1')

  await fs.ensureDir(dir)
  // console.log('2')
  await download(stylesheet.key, tempStylesheetPath)
  // console.log('3')

  const x = fs.readFileSync(tempStylesheetPath)
  // console.log('3.1')

  const stylesheetHash = await generateHash(x)
  // console.log('4')

  await fs.remove(tempStylesheetPath)
  // console.log('5')

  const bookHTML = await createBookHTML(book)
  // console.log('6')
  const contentHash = await generateHash(bookHTML)
  // console.log('7')
  const metadataHash = await generateHash(JSON.stringify(book.podMetadata))
  // console.log('8')

  return { contentHash, metadataHash, stylesheetHash }
}

module.exports = generateBookHashes
