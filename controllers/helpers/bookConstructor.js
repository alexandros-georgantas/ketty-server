const map = require('lodash/map')
const groupBy = require('lodash/groupBy')
const forEach = require('lodash/forEach')
const findIndex = require('lodash/findIndex')
const find = require('lodash/find')
const config = require('config')

const {
  Book,
  BookTranslation,
  BookComponent,
  BookComponentTranslation,
  Division,
  BookComponentState,
} = require('../../models').models

const { getObjectTeam } = require('../team.controller')

const divisionTypeMapper = {
  Frontmatter: 'front',
  Body: 'body',
  Backmatter: 'back',
}

module.exports = async (bookId, options = {}) => {
  try {
    const { forceISBN, isEPUB } = options
    const finalBook = {}
    const book = await Book.findById(bookId)
    const authors = []

    const featurePODEnabled =
      config.has('featurePOD') &&
      ((config.get('featurePOD') && JSON.parse(config.get('featurePOD'))) ||
        false)

    if (
      config.has('featureBookStructure') &&
      ((config.get('featureBookStructure') &&
        JSON.parse(config.get('featureBookStructure'))) ||
        false)
    ) {
      finalBook.bookStructure = []
      finalBook.bookStructure.levels = book.bookStructure.levels
    }

    const bookTranslation = await BookTranslation.findOne({
      bookId,
      languageIso: 'en',
      deleted: false,
    })

    const { result: divisions } = await Division.find({
      bookId,
      deleted: false,
    })

    const { result: bookComponents } = await BookComponent.find({
      bookId,
      deleted: false,
    })

    const bookComponentsWithState = await Promise.all(
      map(bookComponents, async bookComponent => {
        const bookComponentTranslation = await BookComponentTranslation.findOne(
          {
            bookComponentId: bookComponent.id,
            languageIso: 'en',
            deleted: false,
          },
        )

        const bookComponentState = await BookComponentState.findOne({
          bookComponentId: bookComponent.id,
          deleted: false,
        })

        return {
          id: bookComponent.id,
          divisionId: bookComponent.divisionId,
          content: bookComponentTranslation.content,
          title: bookComponentTranslation.title,
          componentType: bookComponent.componentType,
          includeInTOC: bookComponentState.includeInToc,
          runningHeadersRight: bookComponentState.runningHeadersRight,
          runningHeadersLeft: bookComponentState.runningHeadersLeft,
          pagination: bookComponent.pagination,
          parentComponentId: bookComponent.parentComponentId,
        }
      }),
    )

    const bookComponentsWithDivision = map(
      bookComponentsWithState,
      bookComponent => ({
        ...bookComponent,
        division:
          divisionTypeMapper[
            find(divisions, { id: bookComponent.divisionId }).label
          ],
      }),
    )

    const bookComponentsWithNumber = map(
      bookComponentsWithDivision,
      bookComponent => {
        const divisionBookComponents = find(divisions, {
          id: bookComponent.divisionId,
        }).bookComponents

        const sortedBookComponentsInDivision = []

        for (let i = 0; i < divisionBookComponents.length; i += 1) {
          const found = find(bookComponentsWithDivision, {
            id: divisionBookComponents[i],
          })

          sortedBookComponentsInDivision.push(found)
        }

        const groupedByType = groupBy(
          sortedBookComponentsInDivision,
          'componentType',
        )

        const componentTypeNumber =
          findIndex(
            groupedByType[bookComponent.componentType],
            item => item.id === bookComponent.id,
          ) + 1

        return {
          ...bookComponent,
          number: componentTypeNumber,
        }
      },
    )

    if (featurePODEnabled) {
      if (book.podMetadata.authors) {
        const deconstructAuthors = book.podMetadata.authors.split(',')
        forEach(deconstructAuthors, author => authors.push(author))
      }

      const clonePODMetadata = { ...book.podMetadata }

      if (isEPUB) {
        const found = find(book?.podMetadata?.isbns, { isbn: forceISBN })

        if (found) {
          clonePODMetadata.isbns = [found]
        } else {
          clonePODMetadata.isbns = []
        }
      }

      finalBook.podMetadata = clonePODMetadata
    } else {
      const authorTeam = await getObjectTeam('author', bookId, true)

      if (authorTeam && authorTeam.users.length > 0) {
        map(authorTeam.users, user => {
          const { givenNames, surname } = user
          authors.push(`${givenNames} ${surname}`)
        })
      }
    }

    const bookMetadata = {
      publicationDate: book.publicationDate,
      edition: book.edition,
      copyrightStatement: book.copyrightStatement,
      copyrightYear: book.copyrightYear,
      copyrightHolder: book.copyrightHolder,
      isbn: book.isbn,
      issn: book.issn,
      issnL: book.issnL,
      license: book.license,
      authors,
    }

    const bookDivisions = new Map()

    for (let i = 0; i < book.divisions.length; i += 1) {
      const division = find(divisions, { id: book.divisions[i] })

      const tempDivision = {
        label: division.label,
        type: divisionTypeMapper[division.label],
        bookComponents: new Map(),
      }

      forEach(division.bookComponents, bookComponentId => {
        const bookComponent = find(bookComponentsWithNumber, {
          id: bookComponentId,
        })

        if (bookComponent.componentType === 'toc') {
          tempDivision.bookComponents.set('toc', bookComponent)
        } else if (bookComponent.componentType === 'endnotes') {
          tempDivision.bookComponents.set('endnotes', bookComponent)
        } else if (bookComponent.componentType === 'title-page') {
          tempDivision.bookComponents.set('title-page', bookComponent)
        } else if (bookComponent.componentType === 'copyrights-page') {
          tempDivision.bookComponents.set('copyrights-page', bookComponent)
        } else {
          tempDivision.bookComponents.set(bookComponentId, bookComponent)
        }
      })

      bookDivisions.set(divisionTypeMapper[division.label], tempDivision)
    }

    finalBook.title = bookTranslation.title
    finalBook.subtitle = bookTranslation.subtitle
    finalBook.metadata = bookMetadata
    finalBook.divisions = bookDivisions
    finalBook.id = book.id
    finalBook.updated = book.updated
    return finalBook
  } catch (e) {
    throw new Error(e.message)
  }
}
