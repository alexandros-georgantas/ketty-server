const map = require('lodash/map')
const find = require('lodash/find')
const Loader = require('../loader')
const { model } = require('../../bookComponent')
const { model: divisionModel } = require('../../division')

const DivisionLoader = {
  bookComponents: new Loader(async divisionId => {
    // eslint-disable-next-line no-return-await
    const division = await divisionModel.query().findById(divisionId)
    const bookComponentsOrder = division.bookComponents

    const bookComponents = await model
      .query()
      .select('book_component.*', 'book_component_translation.title')
      .innerJoin(
        'book_component_translation',
        'book_component.id',
        'book_component_translation.book_component_id',
      )
      .where('book_component_translation.language_iso', 'en')
      .where('book_component.division_id', divisionId)
      .andWhere('book_component.deleted', false)

    const ordered = map(bookComponentsOrder, bookComponentId => {
      return find(bookComponents, { id: bookComponentId })
    })

    return ordered
  }),
}

module.exports = DivisionLoader
