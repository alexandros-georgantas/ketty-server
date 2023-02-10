const { logger } = require('@coko/server')
const indexOf = require('lodash/indexOf')
const map = require('lodash/map')
const isNil = require('lodash/isNil')
const isEmpty = require('lodash/isEmpty')
const get = require('lodash/get')
const path = require('path')
const fs = require('fs-extra')
const config = require('config')
const { createTemplate, getTemplates } = require('../utils/utils')

const createTemplates = async () => {
  try {
    await getTemplates()
    const whichTemplates = config.get('templates')
    const templatesFolder = path.join(__dirname, '..', '..', 'templates')
    const noteTypes = ['footnotes', 'endnotes', 'chapterEnd']

    if (isNil(whichTemplates) || isEmpty(whichTemplates)) {
      throw new Error('no templates are specified in config/default.js')
    }

    if (fs.existsSync(templatesFolder)) {
      const fetchedTemplates = await fs.readdir(templatesFolder)
      await Promise.all(
        map(fetchedTemplates, async templateFolder => {
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

          if (indexOf(whichTemplates, name) !== -1) {
            logger.info('******* Create Templates script is starting ********')

            const pagedData = {
              name,
              author,
              target: 'pagedjs',
            }

            logger.info('PagedJS Templates')
            await Promise.all(
              map(noteTypes, async noteType =>
                createTemplate(
                  sourceRoot,
                  pagedData,
                  get(target, 'pagedjs.file'),
                  noteType,
                ),
              ),
            )

            if (get(target, 'epub.file')) {
              const epubData = {
                name,
                author,
                target: 'epub',
              }

              logger.info('EPUB Templates')
              await Promise.all(
                map(noteTypes, async noteType =>
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
            await fs.remove(templatesFolder)
            logger.info('******* Templates folder removed ********')
          }
        }),
      )
    }
  } catch (e) {
    throw new Error(e.message)
  }
}

module.exports = createTemplates
