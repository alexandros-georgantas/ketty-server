const { transaction } = require('objection')

const {
  ApplicationParameter,
  BookComponent,
  BookComponentState,
  BookComponentTranslation,
  Division,
} = require('@pubsweet/models')

const { logger } = require('@coko/server')
const find = require('lodash/find')
const map = require('lodash/map')
const assign = require('lodash/assign')

/* 
  For each Fronmatter division which doesn't have a TOC create one
*/

exports.up = async knex => {
  try {
    await transaction(Division.knex(), async trx => {
      const frontMatterDivisions = await Division.query(trx)
        .where('label', 'Frontmatter')
        .andWhere('deleted', false)

      await Promise.all(
        frontMatterDivisions.map(async division => {
          const { bookComponents } = division

          const dbBookComponents = await Promise.all(
            bookComponents.map(async bookComponentId =>
              BookComponent.query(trx).findById(bookComponentId),
            ),
          )

          const divisionHasTOC =
            find(dbBookComponents, {
              componentType: 'toc',
            }) || false

          if (!divisionHasTOC) {
            const workflowConfig = await ApplicationParameter.query().where({
              context: 'bookBuilder',
              area: 'stages',
            })

            const { config: workflowStages } = workflowConfig[0]

            let bookComponentWorkflowStages

            logger.info(
              `Division which will hold the book found with id ${division.id}`,
            )

            const newBookComponent = {
              bookId: division.bookId,
              componentType: 'toc',
              divisionId: division.id,
              pagination: {
                left: false,
                right: true,
              },
              archived: false,
              deleted: false,
            }

            const createdBookComponent = await BookComponent.query(trx).insert(
              newBookComponent,
            )

            logger.info(
              `New book component created with id ${createdBookComponent.id}`,
            )

            const translation = await BookComponentTranslation.query(
              trx,
            ).insert({
              bookComponentId: createdBookComponent.id,
              languageIso: 'en',
              title: 'Table of Contents',
            })

            logger.info(
              `New book component translation created with id ${translation.id}`,
            )

            if (workflowStages) {
              bookComponentWorkflowStages = {
                workflowStages: map(workflowStages, stage => ({
                  type: stage.type,
                  label: stage.title,
                  value: -1,
                })),
              }
            }

            await BookComponentState.query(trx).insert(
              assign(
                {},
                {
                  bookComponentId: createdBookComponent.id,
                  trackChangesEnabled: false,
                  uploading: false,
                  includeInToc: false,
                },
                bookComponentWorkflowStages,
              ),
            )
            const newBookComponents = division.bookComponents

            newBookComponents.push(createdBookComponent.id)

            logger.info(
              `Book component pushed to the array of division's book components [${newBookComponents}]`,
            )
            return Division.query(trx).patchAndFetchById(division.id, {
              bookComponents: newBookComponents,
            })
          }

          return false
        }),
      )
    })
  } catch (error) {
    logger.error(
      'Creating TOC components in old Frontmatter divisions: Migration failed! Rolling back...',
    )
    throw new Error(error)
  }
}
