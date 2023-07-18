const { logger } = require('@coko/server')
const find = require('lodash/find')
const get = require('lodash/get')
const path = require('path')
const fs = require('fs-extra')
const config = require('config')

const { createTemplate, getTemplates } = require('../helpers/templates')

const seedTemplates = async () => {
  let templatesFolder

  try {
    const normalizedTemplates = config.has('templates')
      ? config.get('templates').map(t => ({
          label: t.label.toLowerCase(),
          url: t.url,
          assetsRoot: t.assetsRoot.replace(/^\/+/, '').replace(/\/+$/, ''),
          supportedNoteTypes: t.supportedNoteTypes,
        }))
      : undefined

    if (!normalizedTemplates) {
      logger.info('not templates defined in the config for automatic fetching')
      return
    }

    await getTemplates()

    templatesFolder = path.join(__dirname, '..', '..', 'templates')

    if (!fs.existsSync(templatesFolder)) {
      throw new Error(
        'something went wrong and your defined templates were not fetched correctly',
      )
    }

    const fetchedTemplates = await fs.readdir(templatesFolder)

    await Promise.all(
      fetchedTemplates.map(async templateFolder => {
        const sourceRoot = path.join(
          __dirname,
          '..',
          '..',
          'templates',
          templateFolder,
        )

        const raw = fs.readFileSync(path.join(sourceRoot, 'template.json'))
        const manifest = JSON.parse(raw)

        const { name, author, target } = manifest

        const templateConfig = find(normalizedTemplates, {
          label: name.toLowerCase(),
        })

        if (!templateConfig) {
          return
        }

        logger.info('******* Create Templates script is starting ********')

        if (
          !templateConfig.supportedNoteTypes ||
          templateConfig.supportedNoteTypes.length === 0
        ) {
          throw new Error(
            'supportedNoteTypes is required for the creation of templates, please check your templates config',
          )
        }

        const { supportedNoteTypes } = templateConfig

        logger.info('PagedJS Templates')

        await Promise.all(
          supportedNoteTypes.map(async noteType => {
            return Promise.all(
              target.pagedjs.map(async data => {
                const { trimSize, file } = data

                const pagedData = {
                  name: name.toLowerCase(),
                  author,
                  target: 'pagedjs',
                  trimSize,
                }

                return createTemplate(sourceRoot, pagedData, file, noteType)
              }),
            )
          }),
        )

        if (get(target, 'epub.file')) {
          const epubData = {
            name,
            author,
            target: 'epub',
          }

          logger.info('EPUB Templates')
          await Promise.all(
            supportedNoteTypes.map(async noteType =>
              createTemplate(
                sourceRoot,
                epubData,
                get(target, 'epub.file'),
                noteType,
              ),
            ),
          )
        }

        logger.info(
          '******* Create Templates script finished successfully ********',
        )
      }),
    )
    await fs.remove(templatesFolder)
    logger.info('******* Templates folder removed ********')
  } catch (e) {
    fs.remove(templatesFolder)
    throw new Error(e.message)
  }
}

module.exports = seedTemplates
