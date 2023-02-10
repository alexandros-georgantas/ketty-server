/* eslint-disable no-await-in-loop */
const cheerio = require('cheerio')
const fs = require('fs-extra')
const path = require('path')
const config = require('config')
const get = require('lodash/get')
const findIndex = require('lodash/findIndex')
const crypto = require('crypto')
const { epubArchiver } = require('./epubArchiver')

const {
  cleanHTML,
  cleanDataIdAttributes,
  convertedContent,
} = require('./converters')

const { generateContainer } = require('./htmlGenerators')

const { htmlToEPUB } = require('./htmlToEPUB')
const bookConstructor = require('./bookConstructor')
const { pagednation } = require('./pagednation')
const { icmlArchiver } = require('./icmlArchiver')
const { icmlPreparation } = require('./icmlPreparation')
const { pagedArchiver } = require('./pagedArchiver')
const { scriptsRunner } = require('./scriptsRunner')

const { Template } = require('../../../data-model/src').models

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const { epubcheckerHandler, icmlHandler, pdfHandler } = require('../services')

const levelMapper = { 0: 'one', 1: 'two', 2: 'three' }

const getURL = relativePath => {
  const publicURL = config.has('pubsweet-server.publicURL')
    ? config.get('pubsweet-server.publicURL')
    : undefined

  // temp code for solving docker networking for macOS
  if (process.env.NODE_ENV !== 'production') {
    return `${publicURL.replace('server', 'localhost')}/${relativePath}`
  }

  return `${publicURL}/${relativePath}`
}

const ExporterService = async (
  bookId,
  mode,
  templateId,
  previewer,
  fileExtension,
  icmlNotes,
  ctx,
) => {
  try {
    let template
    let notesType
    let templateHasEndnotes

    const featureBookStructure =
      config.has('featureBookStructure') &&
      ((config.get('featureBookStructure') &&
        JSON.parse(config.get('featureBookStructure'))) ||
        false)

    if (fileExtension !== 'icml') {
      template = await Template.findById(templateId)
      const { notes } = template
      notesType = notes
      templateHasEndnotes = notesType === 'endnotes'
    } else {
      notesType = icmlNotes
    }

    // The produced representation of the book holds two Map data types one
    // for the division and one for the book components of each division to
    // ensure the order of things
    const book = await bookConstructor(bookId, templateHasEndnotes, ctx)

    const frontDivision = book.divisions.get('front')
    const backDivision = book.divisions.get('back')

    const tocComponent = frontDivision.bookComponents.get('toc')

    if (featureBookStructure) {
      tocComponent.content = generateContainer(tocComponent, false, 'one')
    } else {
      tocComponent.content = generateContainer(tocComponent, false)
    }

    let endnotesComponent

    if (
      templateHasEndnotes ||
      (fileExtension === 'icml' && icmlNotes === 'endnotes')
    ) {
      endnotesComponent = backDivision.bookComponents.get('endnotes')

      if (featureBookStructure) {
        endnotesComponent.content = generateContainer(
          endnotesComponent,
          false,
          'one',
        )
      } else {
        endnotesComponent.content = generateContainer(endnotesComponent, false)
      }
    }

    const bookComponentsWithMath = []
    const shouldMathML = fileExtension === 'epub'
    book.divisions.forEach((division, divisionId) => {
      let counter = 0
      division.bookComponents.forEach((bookComponent, bookComponentId) => {
        const { componentType } = bookComponent
        const isTheFirstInBody = division.type === 'body' && counter === 0

        if (componentType === 'toc') return

        let container
        let cleanedContent

        if (featureBookStructure) {
          const levelIndex = findIndex(book.bookStructure.levels, {
            type: componentType,
          })

          if (levelIndex !== -1) {
            container = generateContainer(
              bookComponent,
              isTheFirstInBody,
              levelMapper[levelIndex],
            )
            cleanedContent = cleanHTML(
              container,
              bookComponent,
              notesType,
              tocComponent,
              bookComponentsWithMath,
              endnotesComponent,
              levelMapper[levelIndex],
            )
          } else {
            container = generateContainer(bookComponent, isTheFirstInBody)
            cleanedContent = cleanHTML(
              container,
              bookComponent,
              notesType,
              tocComponent,
              bookComponentsWithMath,
              endnotesComponent,
            )
          }
        } else {
          container = generateContainer(bookComponent, isTheFirstInBody)
          cleanedContent = cleanHTML(
            container,
            bookComponent,
            notesType,
            tocComponent,
            bookComponentsWithMath,
            endnotesComponent,
          )
        }

        const { content, hasMath } = cleanedContent
        /* eslint-disable no-param-reassign */
        bookComponent.hasMath = hasMath
        bookComponent.content = cleanDataIdAttributes(content)
        /* eslint-enable no-param-reassign */
        counter += 1
      })
    })

    for (let i = 0; i < bookComponentsWithMath.length; i += 1) {
      const division = book.divisions.get(bookComponentsWithMath[i].division)

      const bookComponentWithMath = division.bookComponents.get(
        bookComponentsWithMath[i].bookComponentId,
      )

      const target = shouldMathML ? 'mml' : 'svg'

      const contentAfter = await convertedContent(
        bookComponentWithMath.content,
        target,
      )

      bookComponentWithMath.content = contentAfter
    }

    // Gathering and executing scripts defined by user
    if (fileExtension === 'epub') {
      if (template.exportScripts.length > 0) {
        const bbWithConvertedContent = await scriptsRunner(book, template)
        book.divisions.forEach(division => {
          division.bookComponents.forEach(bookComponent => {
            const { id } = bookComponent

            if (bbWithConvertedContent[id]) {
              /* eslint-disable no-param-reassign */
              bookComponent.content = bbWithConvertedContent[id]
              /* eslint-enable no-param-reassign */
            }
          })
        })
      }
    }

    // Check if notes exist, else remove the book component
    if (templateHasEndnotes) {
      const $endnotes = cheerio.load(endnotesComponent.content)
      const $toc = cheerio.load(tocComponent.content)

      if ($endnotes('ol').length === 0) {
        backDivision.bookComponents.delete('endnotes')

        $toc('.toc-endnotes').remove()

        tocComponent.content = $toc('body').html()
      }
    }

    if (fileExtension === 'epub') {
      const assetsTimestamp = `${new Date().getTime()}`
      const EPUBFileTimestamp = `${new Date().getTime() + 1}` // delay it a bit

      const EPUBtempFolderAssetsPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'epub',
        assetsTimestamp,
      )

      const EPUBtempFolderFilePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'epub',
        EPUBFileTimestamp,
      )

      await htmlToEPUB(book, template, EPUBtempFolderAssetsPath)

      const filename = await epubArchiver(
        EPUBtempFolderAssetsPath,
        EPUBtempFolderFilePath,
      )

      const { outcome, messages } = await epubcheckerHandler(
        `${EPUBtempFolderFilePath}/${filename}`,
      )

      if (outcome === 'not valid') {
        let errors = ''

        for (let i = 0; i < messages.length; i += 1) {
          const { message } = messages[i]
          errors += `${message} - `
        }

        throw new Error(errors)
      }

      await fs.remove(EPUBtempFolderAssetsPath)

      return {
        path: getURL(
          path.join(uploadsDir, 'temp', 'epub', EPUBFileTimestamp, filename),
        ),
      }
    }

    if (previewer === 'pagedjs' || fileExtension === 'pdf') {
      const assetsTimestamp = `${new Date().getTime()}`
      const zippedFileTimestamp = `${new Date().getTime() + 1}` // delay it a bit
      const PDFFileTimestamp = `${new Date().getTime() + 2}` // delay it a bit

      const pagedJStempFolderAssetsPathForPDF = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'paged',
        assetsTimestamp,
      )

      const pagedJStempFolderAssetsPathForPreviewer = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'previewer',
        assetsTimestamp,
      )

      const zippedTempFolderFilePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'paged',
        zippedFileTimestamp,
      )

      const PDFtempFolderFilePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'paged',
        PDFFileTimestamp,
      )

      if (fileExtension === 'pdf') {
        const PDFFilename = `${crypto.randomBytes(32).toString('hex')}.pdf`
        await pagednation(
          book,
          template,
          pagedJStempFolderAssetsPathForPDF,
          true,
        )

        const zippedAssetsFilename = await pagedArchiver(
          pagedJStempFolderAssetsPathForPDF,
          zippedTempFolderFilePath,
        )

        await pdfHandler(
          `${zippedTempFolderFilePath}/${zippedAssetsFilename}`,
          PDFtempFolderFilePath,
          PDFFilename,
        )

        await fs.remove(pagedJStempFolderAssetsPathForPDF)
        await fs.remove(zippedTempFolderFilePath)

        // pagedjs-cli
        return {
          path: getURL(
            path.join(
              uploadsDir,
              'temp',
              'paged',
              PDFFileTimestamp,
              PDFFilename,
            ),
          ),
          validationResult: undefined,
        }
      }

      await pagednation(book, template, pagedJStempFolderAssetsPathForPreviewer)

      return {
        path: `${assetsTimestamp}/template/${templateId}`,
        validationResult: undefined,
      }
    }

    if (fileExtension === 'icml') {
      const assetsTimestamp = `${new Date().getTime()}`
      const zippedFileTimestamp = `${new Date().getTime() + 1}` // delay it a bit

      const ICMLtempFolderAssetsPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'icml',
        assetsTimestamp,
      )

      const ICMLtempFolderFilePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        uploadsDir,
        'temp',
        'icml',
        zippedFileTimestamp,
      )

      await icmlPreparation(book, ICMLtempFolderAssetsPath)
      await icmlHandler(ICMLtempFolderAssetsPath)
      await fs.remove(`${ICMLtempFolderAssetsPath}/index.html`)

      const filename = await icmlArchiver(
        ICMLtempFolderAssetsPath,
        ICMLtempFolderFilePath,
      )

      await fs.remove(ICMLtempFolderAssetsPath)

      return {
        path: getURL(
          path.join(uploadsDir, 'temp', 'icml', zippedFileTimestamp, filename),
        ),
        validationResult: undefined,
      }
    }

    return null
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = ExporterService
