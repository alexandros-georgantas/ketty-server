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
    const files = 1
    const target = 'epub'
    const trimSize = null

    const template = await createTemplate(name, author, files, target, trimSize)

    expect(createTemplate).toBeDefined()
    expect(template.name).toBe(name)
    expect(template.author).toBe(author)
  })

  it('should fetch template based on id', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = 1
    const target = 'epub'
    const trimSize = null

    const template = await createTemplate(name, author, files, target, trimSize)

    const fetchTemplate = await getTemplate(template.id)

    expect(getTemplate).toBeDefined()
    expect(fetchTemplate.id).toBe(template.id)
  })

  it('should fetch templates based on order, sortKey, target, notes', async () => {
    const ascending = false
    const sortKey = 'author'
    const name = 'Atla (chapterEnd)'
    const author = 'AAAOne User'
    const files = 1
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
    const filesTwo = 1
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

    expect(getTemplates).toBeDefined()
    expect(rs).toHaveLength(2)
    expect(rs[1].id).toBe(createdTemplateOne.id)
    expect(rs[0].id).toBe(createdTemplateTwo.id)
  })

  it('should delete template based on id', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = 1
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

    expect(deleteTemplate).toBeDefined()
    expect(deletedTemplate.id).toBe(createdTemplate.id)
    expect(deletedTemplate.deleted).toBe(true)
  })

  it('should update template data based on data provided', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = 1
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
      files: 1,
    }

    const updatedTemplate = await updateTemplate(data)

    expect(updateTemplate).toBeDefined()
    expect(updatedTemplate.id).toBe(createdTemplate.id)
    expect(updatedTemplate.name).toBe(data.name)
  })

  it('should fetch export scripts based on scope', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = 1
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

    expect(getExportScripts).toBeDefined()
    expect(exportScript).toBeTruthy()
  })

  it('should clone template based on id, name', async () => {
    const name = 'Atla (chapterEnd)'
    const author = 'Atla Open Press'
    const files = 1
    const target = 'epub'
    const trimSize = null

    const createdTemplate = await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
    )

    const clonedTemp = await cloneTemplate(
      createdTemplate.id,
      createdTemplate.name,
    )

    expect(cloneTemplate).toBeDefined()
    expect(clonedTemp.referenceId).toBe(createdTemplate.id)
    expect(clonedTemp.name).toBe(createdTemplate.name)
  })
})
