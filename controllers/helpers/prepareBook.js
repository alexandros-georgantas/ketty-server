const cheerio = require('cheerio')
const config = require('config')
const findIndex = require('lodash/findIndex')

const {
  generateContainer,
  generateTitlePage,
  generateCopyrightsPage,
} = require('./htmlGenerators')

const {
  cleanHTML,
  cleanDataAttributes,
  convertedContent,
} = require('./converters')

const bookConstructor = require('./bookConstructor')

const levelMapper = { 0: 'one', 1: 'two', 2: 'three' }

const scriptsRunner = require('./scriptsRunner')

const prepareBook = async (bookId, template, options) => {
  let notesType
  let templateHasEndnotes

  const {
    icmlNotes,
    fileExtension,
    includeTOC,
    includeCopyrights,
    includeTitlePage,
    isbn,
  } = options

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
    const { notes } = template
    notesType = notes
    templateHasEndnotes = notesType === 'endnotes'
  } else {
    notesType = icmlNotes
  }

  // The produced representation of the book holds two Map data types one
  // for the division and one for the book components of each division to
  // ensure the order of things
  const book = await bookConstructor(bookId, {
    templateHasEndnotes,
    forceISBN: isbn,
    isEPUB: fileExtension === 'epub',
  })

  const frontDivision = book.divisions.get('front')
  const backDivision = book.divisions.get('back')

  const tocComponent = frontDivision.bookComponents.get('toc')

  if (featureBookStructure) {
    tocComponent.content = generateContainer(tocComponent, false, 'one')
  } else {
    tocComponent.content = generateContainer(tocComponent, false)
  }

  if (featurePODEnabled) {
    if (includeTitlePage) {
      const titlePageComponent = frontDivision.bookComponents.get('title-page')

      titlePageComponent.content = generateTitlePage(
        titlePageComponent,
        book.title,
        book.metadata.authors,
        book.subtitle,
      )
    } else {
      frontDivision.bookComponents.delete('title-page')
    }

    if (!includeTOC) {
      frontDivision.bookComponents.delete('toc')
    }

    if (includeCopyrights) {
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
  book.divisions.forEach(division => {
    let counter = 0
    let chapterCounter = 1
    division.bookComponents.forEach(bookComponent => {
      const { componentType } = bookComponent
      const isTheFirstInBody = division.type === 'body' && counter === 0
      const isChapter = division.type === 'body' && componentType === 'chapter'

      if (isChapter) {
        chapterCounter += 1
      }

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
        const levelIndex = bookComponent.parentComponentId ? 2 : 1
        container = generateContainer(
          bookComponent,
          isTheFirstInBody,
          levelIndex,
        )
        cleanedContent = cleanHTML(
          container,
          bookComponent,
          notesType,
          tocComponent,
          bookComponentsWithMath,
          endnotesComponent,
          levelIndex,
          chapterCounter,
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

  await Promise.all(
    bookComponentsWithMath.map(async item => {
      const division = book.divisions.get(item.division)

      const bookComponentWithMath = division.bookComponents.get(
        item.bookComponentId,
      )

      const target = shouldMathML ? 'mml' : 'svg'

      const contentAfter = await convertedContent(
        bookComponentWithMath.content,
        target,
      )

      bookComponentWithMath.content = contentAfter
    }),
  )

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

  return book
}

module.exports = prepareBook
