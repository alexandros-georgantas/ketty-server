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
} = require('../../../data-model/src').models

const { getEntityTeam } = require('../team')

const divisionTypeMapper = {
  Frontmatter: 'front',
  Body: 'body',
  Backmatter: 'back',
}

module.exports = async bookId => {
  const finalBook = {}
  const book = await Book.findById(bookId)

  if (
    config.has('featureBookStructure') &&
    ((config.get('featureBookStructure') &&
      JSON.parse(config.get('featureBookStructure'))) ||
      false)
  ) {
    finalBook.bookStructure = []
    finalBook.bookStructure.levels = book.bookStructure.levels
  }

  const bookTranslation = await BookTranslation.query()
    .where('bookId', bookId)
    .andWhere('languageIso', 'en')
    .andWhere('deleted', false)

  const divisions = await Division.query()
    .where('bookId', bookId)
    .andWhere('deleted', false)

  const bookComponents = await BookComponent.query()
    .where('bookId', bookId)
    .andWhere('deleted', false)

  const bookComponentsWithState = await Promise.all(
    map(bookComponents, async bookComponent => {
      const bookComponentTranslation = await BookComponentTranslation.query()
        .where('bookComponentId', bookComponent.id)
        .andWhere('languageIso', 'en')
        .andWhere('deleted', false)

      const bookComponentState = await BookComponentState.query()
        .where('bookComponentId', bookComponent.id)
        .andWhere('deleted', false)

      return {
        id: bookComponent.id,
        divisionId: bookComponent.divisionId,
        content: bookComponentTranslation[0].content,
        title: bookComponentTranslation[0].title,
        componentType: bookComponent.componentType,
        includeInTOC: bookComponentState[0].includeInToc,
        runningHeadersRight: bookComponentState[0].runningHeadersRight,
        runningHeadersLeft: bookComponentState[0].runningHeadersLeft,
        pagination: bookComponent.pagination,
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

  const authorTeams = await getEntityTeam(bookId, 'book', 'author', true)
  let authors = []

  if (authorTeams[0] && authorTeams[0].members.length > 0) {
    authors = map(authorTeams[0].members, teamMember => {
      const { givenName, surname } = teamMember
      return `${givenName} ${surname}`
    })
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
    authors: authors.length > 0 ? authors : null,
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
      } else {
        tempDivision.bookComponents.set(bookComponentId, bookComponent)
      }
    })

    bookDivisions.set(divisionTypeMapper[division.label], tempDivision)
  }

  finalBook.title = bookTranslation[0].title
  finalBook.metadata = bookMetadata
  finalBook.divisions = bookDivisions
  finalBook.id = book.id
  finalBook.updated = book.updated
  return finalBook
}
