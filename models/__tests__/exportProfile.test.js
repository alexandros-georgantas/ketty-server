const { uuid } = require('@coko/server')

const ExportProfile = require('../exportProfile/exportProfile.model')

const clearDb = require('../../scripts/helpers/_clearDB')

describe('Export Profile model', () => {
  beforeEach(() => clearDb())

  afterAll(() => {
    const knex = ExportProfile.knex()
    knex.destroy()
  })

  it('creates export profile', async () => {
    const templateId = uuid()

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
    })

    expect(exportProfile).toBeDefined()
  })

  it('creates export profile with provider info', async () => {
    const templateId = uuid()

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'pdf',
      trimSize: '6x9',
      templateId,
      providerInfo: [
        {
          id: uuid(),
          externalProjectId: uuid(),
          bookMetadataHash: uuid(),
          bookContentHash: uuid(),
          templateHash: uuid(),
          lastSync: new Date().getTime(),
        },
      ],
    })

    expect(exportProfile).toBeDefined()
  })

  it('creates export profile for EPUB', async () => {
    const templateId = uuid()

    const exportProfile = await ExportProfile.insert({
      displayName: 'Test',
      format: 'epub',
      templateId,
    })

    expect(exportProfile).toBeDefined()

    expect(exportProfile).toBeDefined()
  })
  it('throws when invalid format is PDF and no trim size is provided', async () => {
    const templateId = uuid()

    await expect(
      ExportProfile.insert({
        displayName: 'Test',
        format: 'pdf',
        templateId,
      }),
    ).rejects.toThrow('trim size is required for PDF format')
  })

  it('throws when invalid format provided', async () => {
    const templateId = uuid()

    await expect(
      ExportProfile.insert({
        displayName: 'Test',
        format: 'invalid',
        templateId,
      }),
    ).rejects.toThrow('format: should be equal to one of the allowed values')
  })
  it('throws when invalid trim size provided', async () => {
    const templateId = uuid()

    await expect(
      ExportProfile.insert({
        displayName: 'Test',
        format: 'pdf',
        trimSize: '0x7',
        templateId,
      }),
    ).rejects.toThrow('trimSize: should be equal to one of the allowed values')
  })

  it('throws when format is EPUB and trim size is provided', async () => {
    const templateId = uuid()

    await expect(
      ExportProfile.insert({
        displayName: 'Test',
        format: 'epub',
        trimSize: '6x9',
        templateId,
      }),
    ).rejects.toThrow('trim size is only valid option for PDF format')
  })
})
