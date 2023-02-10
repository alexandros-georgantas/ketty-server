const map = require('lodash/map')
const get = require('lodash/get')
const assign = require('lodash/assign')

const config = require('config')
const { ketidaDataModel } = require('../data-model')

const { models } = ketidaDataModel

const {
  Book,
  BookComponent,
  BookComponentTranslation,
  Division,
  BookComponentState,
} = models

const createBookComponents = async () => {
  try {
    const books = await Book.all()
    const bookId = books[0].id
    const componentType = 'component'
    const bookBuilder = get(config, 'bookBuilder')
    const workflowStages = get(bookBuilder, 'stages')

    await Promise.all(
      map(books[0].divisions, async divisionId => {
        const newBookComponent = {
          bookId,
          componentType,
          divisionId,
          archived: false,
          deleted: false,
        }

        const createdBookComponent = await new BookComponent(
          newBookComponent,
        ).save()

        await new BookComponentTranslation({
          bookComponentId: createdBookComponent.id,
          languageIso: 'en',
          title: `title-${createdBookComponent.id}`,
        }).save()

        await Division.query().patchAndFetchById(divisionId, {
          bookComponents: [createdBookComponent.id],
        })

        const bookComponentWorkflowStages = {
          workflowStages: map(workflowStages, stage => ({
            type: stage.type,
            label: stage.title,
            value: -1,
          })),
        }

        await new BookComponentState(
          assign(
            {},
            {
              bookComponentId: createdBookComponent.id,
              trackChangesEnabled: false,
              uploading: false,
            },
            bookComponentWorkflowStages,
          ),
        ).save()
      }),
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = createBookComponents

createBookComponents()
