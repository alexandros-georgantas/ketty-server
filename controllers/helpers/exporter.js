/* eslint-disable no-await-in-loop */
const cheerio = require('cheerio')
const fs = require('fs-extra')
const path = require('path')
const config = require('config')
const get = require('lodash/get')
const findIndex = require('lodash/findIndex')
const crypto = require('crypto')

const {
  cleanHTML,
  cleanDataAttributes,
  convertedContent,
} = require('./converters')

const bookConstructor = require('./bookConstructor')

const {
  generateContainer,
  generateTitlePage,
  generateCopyrightsPage,
} = require('./htmlGenerators')

const EPUBPreparation = require('./EPUBPreparation')
const ICMLPreparation = require('./ICMLPreparation')
const PagedJSPreparation = require('./PagedJSPreparation')
const EPUBArchiver = require('./EPUBArchiver')
const PagedJSArchiver = require('./PagedJSArchiver')
const ICMLArchiver = require('./ICMLArchiver')
const scriptsRunner = require('./scriptsRunner')

const Template = require('../../models/template/template.model')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const {
  epubcheckerHandler,
  icmlHandler,
  pdfHandler,
} = require('../microServices.controller')

const levelMapper = { 0: 'one', 1: 'two', 2: 'three' }

const getURL = relativePath => {
  const serverUrl = config.has('pubsweet-server.serverUrl')
    ? config.get('pubsweet-server.serverUrl')
    : undefined

  // temp code for solving docker networking for macOS
  if (process.env.NODE_ENV !== 'production') {
    return `${serverUrl.replace('server', 'localhost')}/${relativePath}`
  }

  return `${serverUrl}/${relativePath}`
}

const ExporterService = async (
  bookId,
  templateId,
  previewer,
  fileExtension,
  icmlNotes,
  additionalExportOptions,
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

    const featurePODEnabled =
      config.has('featurePOD') &&
      ((config.get('featurePOD') && JSON.parse(config.get('featurePOD'))) ||
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
    const book = await bookConstructor(bookId, templateHasEndnotes)

    const frontDivision = book.divisions.get('front')
    const backDivision = book.divisions.get('back')

    const tocComponent = frontDivision.bookComponents.get('toc')

    if (featureBookStructure) {
      tocComponent.content = generateContainer(tocComponent, false, 'one')
    } else {
      tocComponent.content = generateContainer(tocComponent, false)
    }

    if (featurePODEnabled && additionalExportOptions) {
      if (additionalExportOptions.includeTitlePage) {
        const titlePageComponent =
          frontDivision.bookComponents.get('title-page')

        titlePageComponent.content = generateTitlePage(
          titlePageComponent,
          book.title,
          book.metadata.authors,
          book.subtitle,
        )
      } else {
        frontDivision.bookComponents.delete('title-page')
      }

      if (!additionalExportOptions.includeTOC) {
        frontDivision.bookComponents.delete('toc')
      }

      if (additionalExportOptions.includeCopyrights) {
        const copyrightComponent =
          frontDivision.bookComponents.get('copyrights-page')

        copyrightComponent.content = generateCopyrightsPage(
          book.title,
          copyrightComponent,
          book.podMetadata,
        )
      } else {
        frontDivision.bookComponents.delete('copyrights-page')
      }
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

        if (featurePODEnabled) {
          if (componentType === 'title-page') return
          if (componentType === 'copyrights-page') return
        }

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
        bookComponent.content = cleanDataAttributes(content)
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
    if (templateHasEndnotes && tocComponent) {
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
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'epub',
        assetsTimestamp,
      )

      const EPUBtempFolderFilePath = path.join(
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'epub',
        EPUBFileTimestamp,
      )

      await EPUBPreparation(book, template, EPUBtempFolderAssetsPath)

      const filename = await EPUBArchiver(
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
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'paged',
        assetsTimestamp,
      )

      const pagedJStempFolderAssetsPathForPreviewer = path.join(
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'previewer',
        assetsTimestamp,
      )

      const zippedTempFolderFilePath = path.join(
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'paged',
        zippedFileTimestamp,
      )

      const PDFtempFolderFilePath = path.join(
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'paged',
        PDFFileTimestamp,
      )

      if (fileExtension === 'pdf') {
        const PDFFilename = `${crypto.randomBytes(32).toString('hex')}.pdf`
        await PagedJSPreparation(
          book,
          template,
          pagedJStempFolderAssetsPathForPDF,
          true,
        )

        const zippedAssetsFilename = await PagedJSArchiver(
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

      await PagedJSPreparation(
        book,
        template,
        pagedJStempFolderAssetsPathForPreviewer,
      )

      return {
        path: `${assetsTimestamp}/template/${templateId}`,
        validationResult: undefined,
      }
    }

    if (fileExtension === 'icml') {
      const assetsTimestamp = `${new Date().getTime()}`
      const zippedFileTimestamp = `${new Date().getTime() + 1}` // delay it a bit

      const ICMLtempFolderAssetsPath = path.join(
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'icml',
        assetsTimestamp,
      )

      const ICMLtempFolderFilePath = path.join(
        `${process.cwd()}`,
        uploadsDir,
        'temp',
        'icml',
        zippedFileTimestamp,
      )

      await ICMLPreparation(book, ICMLtempFolderAssetsPath)
      await icmlHandler(ICMLtempFolderAssetsPath)
      await fs.remove(`${ICMLtempFolderAssetsPath}/index.html`)

      const filename = await ICMLArchiver(
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
