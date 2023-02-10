const cheerio = require('cheerio')
const fs = require('fs-extra')
const config = require('config')
const find = require('lodash/find')

const map = require('lodash/map')
const { locallyDownloadFile, signURL } = require('../objectStorage')
const { imageGatherer } = require('./gatherImages')

const { readFile, writeFile } = require('./filesystem')

const { fixFontFaceUrls } = require('./converters')

const { generatePagedjsContainer } = require('./htmlGenerators')

const { objectKeyExtractor } = require('../../../common')

const pagednation = async (
  book,
  template,
  pagedJStempFolderAssetsPath,
  pdf = false,
) => {
  try {
    const templateFiles = await template.getFiles()
    const fonts = []
    const stylesheets = []
    const scripts = template.exportScripts

    // const images = []
    // const currentTime = new Date().getTime()
    // const hash = crypto.randomBytes(32).toString('hex')
    // const tempDir = `${process.cwd()}/${uploadsDir}/temp`
    // const pagedDestination = path.join(tempDir, 'paged', `${currentTime}`)
    await fs.ensureDir(pagedJStempFolderAssetsPath)

    for (let i = 0; i < templateFiles.length; i += 1) {
      const {
        id: dbId,
        objectKey,
        mimetype,
        extension,
        name,
      } = templateFiles[i]

      const originalFilename = `${name}.${extension}`

      if (templateFiles[i].mimetype === 'text/css') {
        const target = `${pagedJStempFolderAssetsPath}/${originalFilename}`
        const id = `stylesheet-${dbId}-${i}`
        stylesheets.push({
          id,
          objectKey,
          target,
          mimetype,
          originalFilename,
          extension,
        })
      } else {
        const target = `${pagedJStempFolderAssetsPath}/${originalFilename}`
        const id = `font-${dbId}-${i}`
        fonts.push({
          id,
          objectKey,
          target,
          mimetype,
          originalFilename,
          extension,
        })
      }
    }

    if (stylesheets.length === 0) {
      throw new Error(
        'No stylesheet file exists in the selected template, export aborted',
      )
    }

    const gatheredImages = imageGatherer(book)
    const freshImageLinkMapper = {}

    await Promise.all(
      map(gatheredImages, async image => {
        const { currentObjectKey } = image
        freshImageLinkMapper[currentObjectKey] = await signURL(
          'getObject',
          currentObjectKey,
        )
        return true
      }),
    )
    book.divisions.forEach(division => {
      division.bookComponents.forEach(bookComponent => {
        const { content } = bookComponent
        const $ = cheerio.load(content)

        $('img[src]').each((index, node) => {
          const $node = $(node)
          const url = $node.attr('src')
          const objectKey = objectKeyExtractor(url)
          $node.attr('src', freshImageLinkMapper[objectKey])
        })
        $('figure').each((_, node) => {
          const $node = $(node)
          const srcExists = $node.attr('src')

          if (srcExists) {
            $node.removeAttr('src')
          }
        })
        /* eslint-disable no-param-reassign */
        bookComponent.content = $.html('body')
        /* eslint-enable no-param-reassign */
      })
    })

    await Promise.all(
      map(stylesheets, async stylesheet => {
        const { objectKey, target } = stylesheet
        return locallyDownloadFile(objectKey, target)
      }),
    )
    await Promise.all(
      map(fonts, async font => {
        const { objectKey, target } = font
        return locallyDownloadFile(objectKey, target)
      }),
    )

    // Copy export scripts to temp folder which will be zipped and be send to service
    await Promise.all(
      map(scripts, async (script, i) => {
        const { value } = script
        const deconstructedValue = value.split('-')
        const label = deconstructedValue[0]
        const scope = deconstructedValue[1]

        const scriptsRootFolder = config.get('export.rootFolder')
        const availableScripts = config.get('export.scripts')

        if (!scriptsRootFolder || !availableScripts) {
          throw new Error(
            `something went wrong with your scripts configuration`,
          )
        }

        const foundScript = find(availableScripts, { label, scope })

        if (!foundScript) {
          throw new Error(
            `template has a script which does not exist in the configurations`,
          )
        }

        const constructedScriptPath = `${process.cwd()}/${scriptsRootFolder}/${
          foundScript.filename
        }`

        if (!fs.existsSync(constructedScriptPath)) {
          throw new Error(
            `the script file declared in the config does not exist under ${process.cwd()}/${scriptsRootFolder}/`,
          )
        }

        const targetPath = `${pagedJStempFolderAssetsPath}/${i + 1}.js`

        return fs.copy(constructedScriptPath, targetPath)
      }),
    )
    // SECTION END

    const stylesheetContent = await readFile(stylesheets[0].target)
    const fixedCSS = fixFontFaceUrls(stylesheetContent, fonts, '.')
    await writeFile(`${stylesheets[0].target}`, fixedCSS)
    const output = cheerio.load(generatePagedjsContainer(book.title))

    book.divisions.forEach(division => {
      division.bookComponents.forEach(bc => {
        const { content } = bc
        output('body').append(content)
      })
    })

    if (pdf) {
      output('<link/>')
        .attr('href', `./${stylesheets[0].originalFilename}`)
        .attr('type', 'text/css')
        .attr('rel', 'stylesheet')
        .appendTo('head')
    }

    await writeFile(`${pagedJStempFolderAssetsPath}/index.html`, output.html())
    return true
    // return {
    //   clientPath: `${currentTime}/template/${template.id}`,
    //   currentTime,
    //   hash,
    // }
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { pagednation }
