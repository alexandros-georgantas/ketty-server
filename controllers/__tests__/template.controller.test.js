const fs = require('fs-extra')
const path = require('path')

const {
  connectToFileStorage,
} = require('@coko/server/src/services/fileStorage')

const { createFile } = require('@coko/server/src/models/file/file.controller')
const File = require('../../models/file/file.model')
const clearDb = require('../../scripts/helpers/_clearDB')

const {
  createTemplate,
  getTemplate,
  getTemplates,
  deleteTemplate,
  updateTemplate,
  getExportScripts,
  cloneTemplate,
} = require('../template.controller')

describe('Template Controller', () => {
  beforeEach(async () => {
    await clearDb()
  }, 30000)

  it('should create templates based on name, author, files, target, trimSize', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = []
    const target = 'epub'
    const trimSize = null

    const template = await createTemplate(name, author, files, target, trimSize)

    expect(template.name).toBe(name)
    expect(template.author).toBe(author)
  })

  it('should fetch template based on id', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = []
    const target = 'epub'
    const trimSize = null

    const template = await createTemplate(name, author, files, target, trimSize)

    const fetchTemplate = await getTemplate(template.id)

    expect(fetchTemplate.id).toBe(template.id)
  })

  it('should fetch templates based on order, sortKey, target, notes', async () => {
    const ascending = false
    const sortKey = 'author'
    const name = 'Atla (chapterEnd)'
    const author = 'AAAOne User'
    const files = []
    const target = 'epub'
    const trimSize = null

    const createdTemplateOne = await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
    )

    const nameTwo = 'Atla (chapterStart)'
    const authorTwo = 'BBBTwo User'
    const filesTwo = []
    const targetTwo = 'epub'
    const trimSizeTwo = null

    const createdTemplateTwo = await createTemplate(
      nameTwo,
      authorTwo,
      filesTwo,
      targetTwo,
      trimSizeTwo,
    )

    const rs = await getTemplates(ascending, sortKey, null, null)

    expect(rs).toHaveLength(2)
    expect(rs[1].id).toBe(createdTemplateOne.id)
    expect(rs[0].id).toBe(createdTemplateTwo.id)
  })

  it('should delete template based on id', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = []
    const target = 'epub'
    const trimSize = null

    const createdTemplate = await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
    )

    const deletedTemplate = await deleteTemplate(createdTemplate.id)

    expect(deletedTemplate.id).toBe(createdTemplate.id)
    expect(deletedTemplate.deleted).toBe(true)
  })

  it('should update template data based on data provided', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = []
    const target = 'epub'
    const trimSize = null

    const createdTemplate = await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
    )

    const data = {
      id: createdTemplate.id,
      name: 'Atla (chapterStart)',
      deleteFiles: false,
      files: [],
    }

    const updatedTemplate = await updateTemplate(data)

    expect(updatedTemplate.id).toBe(createdTemplate.id)
    expect(updatedTemplate.name).toBe(data.name)
  })

  it('should fetch export scripts based on scope', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = []
    const target = 'epub'
    const trimSize = null

    const exportScripts = {
      label: 'script1',
      value: 'scriptValue',
      scope: 'defined',
    }

    await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
      null,
      'endnotes',
      exportScripts,
    )

    const exportScript = await getExportScripts(exportScripts.scope)

    expect(exportScript).toBeTruthy()
  })

  it('should clone template based on id, name', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = []
    const target = 'epub'
    const trimSize = null

    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.css',
    )

    const fileStream = fs.createReadStream(filePath)

    await connectToFileStorage()

    const createdTemplate = await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
    )

    await createFile(fileStream, 'test.css', null, null, [], createdTemplate.id)

    const clonedTemp = await cloneTemplate(
      createdTemplate.id,
      createdTemplate.name,
      'test css',
    )

    const newfile = await File.find({
      objectId: createdTemplate.id,
    })

    expect(clonedTemp.referenceId).toBe(createdTemplate.id)
    expect(clonedTemp.name).toBe(createdTemplate.name)
    expect(newfile.result[0].storedObjects[0].key).toBeTruthy()
  })
})
