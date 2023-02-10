const { useTransaction } = require('@coko/server')
const cheerio = require('cheerio')
const uuid = require('uuid/v4')
const { BookComponentTranslation } = require('../../../data-model/src').models

const camelCaseToKebabCase = string =>
  string
    .replace(/\B(?:([A-Z])(?=[a-z]))|(?:(?<=[a-z0-9])([A-Z]))/g, '-$1$2')
    .toLowerCase()
// convert to kebab case classes

const bookComponentContentCreator = async (
  bookComponent,
  title,
  bookStructure,
  level,
  indexes = {},
  options = {},
) => {
  const { trx, languageIso } = options
  let container = cheerio.load(`<html><body></body></html>`)

  if (title) {
    container = cheerio.load(`<html><body><h1>${title}</h1></body></html>`)
  }

  try {
    return useTransaction(
      async tr => {
        let content

        if (bookStructure.levels.length === 3) {
          const { levelOneIndex } = indexes

          if (levelOneIndex !== undefined) {
            bookStructure.levels[level].contentStructure.forEach(
              contentItem => {
                if (contentItem.type === 'contentOpenerImage') {
                  container('body').append(
                    `<div id="${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"></div>`,
                  )
                } else if (contentItem.type !== 'mainContent') {
                  container('body').append(
                    `<div id="${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"><h2>${contentItem.displayName}</h2></div>`,
                  )
                }
              },
            )
            bookStructure.outline[levelOneIndex].children.forEach(
              outlineLevelTwoItem => {
                container('body').append(
                  `<section id="${level}-${
                    outlineLevelTwoItem.id
                  }" data-type="content_structure_element" class="level-three ${camelCaseToKebabCase(
                    outlineLevelTwoItem.type,
                  )}"><h2>${outlineLevelTwoItem.title}</h2></section>`,
                )
                bookStructure.levels[level + 1].contentStructure.forEach(
                  contentItem => {
                    if (contentItem.type === 'contentOpenerImage') {
                      container(`#${level}-${outlineLevelTwoItem.id}`).append(
                        `<div id="${level}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"></div>`,
                      )
                    } else if (contentItem.type !== 'mainContent') {
                      container(`#${level}-${outlineLevelTwoItem.id}`).append(
                        `<div id="${level}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"><h3>${contentItem.displayName}</h3></div>`,
                      )
                    }
                  },
                )
              },
            )

            bookStructure.levels[level + 2].contentStructure.forEach(
              contentItem => {
                if (
                  contentItem.type === 'mainContent' ||
                  contentItem.type === 'contentOpenerImage'
                ) {
                  container('body').append(
                    `<div id="${level + 2}-${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"></div>`,
                  )
                } else {
                  container('body').append(
                    `<div id="${level + 2}-${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"><h2>${contentItem.displayName}</h2></div>`,
                  )
                }
              },
            )
            content = container('body').html()
          } else if (level === 0) {
            bookStructure.levels[level].contentStructure.forEach(
              contentItem => {
                if (contentItem.type === 'contentOpenerImage') {
                  container('body').append(
                    `<div id="${level}-${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"></div>`,
                  )
                } else if (contentItem.type !== 'mainContent') {
                  container('body').append(
                    `<div id="${level}-${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"><h2>${contentItem.displayName}</h2></div>`,
                  )
                }
              },
            )
            bookStructure.outline[level].children.forEach(
              outlineLevelTwoItem => {
                container('body').append(
                  `<section id="${level}-${
                    outlineLevelTwoItem.id
                  }" data-type="content_structure_element" class="level-three ${camelCaseToKebabCase(
                    outlineLevelTwoItem.type,
                  )}"><h2>${outlineLevelTwoItem.title}</h2></section>`,
                )
                bookStructure.levels[level + 1].contentStructure.forEach(
                  contentItem => {
                    if (contentItem.type === 'contentOpenerImage') {
                      container(`#${level}-${outlineLevelTwoItem.id}`).append(
                        `<div id="${level}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"></div>`,
                      )
                    } else if (contentItem.type !== 'mainContent') {
                      container(`#${level}-${outlineLevelTwoItem.id}`).append(
                        `<div id="${level}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"><h3>${contentItem.displayName}</h3></div>`,
                      )
                    }
                  },
                )
              },
            )

            bookStructure.levels[level + 2].contentStructure.forEach(
              contentItem => {
                if (
                  contentItem.type === 'mainContent' ||
                  contentItem.type === 'contentOpenerImage'
                ) {
                  container('body').append(
                    `<div id="${level + 2}-${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"></div>`,
                  )
                } else {
                  container('body').append(
                    `<div id="${level + 2}-${
                      contentItem.id
                    }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                      contentItem.type,
                    )}"><h2>${contentItem.displayName}</h2></div>`,
                  )
                }
              },
            )
            content = container('body').html()
          }
        }

        if (bookStructure.levels.length === 4) {
          const { levelOneIndex, levelTwoIndex } = indexes

          if (levelOneIndex !== undefined && levelTwoIndex !== undefined) {
            // use case of creation from book finalized
            if (level === 0) {
              bookStructure.levels[level].contentStructure.forEach(
                contentItem => {
                  if (contentItem.type === 'contentOpenerImage') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"></div>`,
                    )
                  } else if (contentItem.type !== 'mainContent') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"><h2>${contentItem.displayName}</h2></div>`,
                    )
                  }
                },
              )
            }

            if (level === 1) {
              bookStructure.levels[level].contentStructure.forEach(
                contentItem => {
                  if (contentItem.type === 'contentOpenerImage') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"></div>`,
                    )
                  } else if (contentItem.type !== 'mainContent') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"><h2>${contentItem.displayName}</h2></div>`,
                    )
                  }
                },
              )
              bookStructure.outline[levelOneIndex].children[
                levelTwoIndex
              ].children.forEach(outlineLevelThreeItem => {
                container('body').append(
                  `<section id="${level}-${
                    outlineLevelThreeItem.id
                  }" data-type="content_structure_element" class="level-three ${camelCaseToKebabCase(
                    outlineLevelThreeItem.type,
                  )}"><h2>${outlineLevelThreeItem.title}</h2></section>`,
                )
                bookStructure.levels[level + 1].contentStructure.forEach(
                  contentItem => {
                    if (contentItem.type === 'contentOpenerImage') {
                      container(`#${level}-${outlineLevelThreeItem.id}`).append(
                        `<div id="${level}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"></div>`,
                      )
                    } else if (contentItem.type !== 'mainContent') {
                      container(`#${level}-${outlineLevelThreeItem.id}`).append(
                        `<div id="${level}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"><h3>${contentItem.displayName}</h3></div>`,
                      )
                    }
                  },
                )
              })

              // Case of level two closers after level three
              if (bookStructure.levels.length >= 3) {
                bookStructure.levels[level + 2].contentStructure.forEach(
                  contentItem => {
                    if (
                      contentItem.type === 'mainContent' ||
                      contentItem.type === 'contentOpenerImage'
                    ) {
                      container('body').append(
                        `<div id="${level + 2}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"></div>`,
                      )
                    } else {
                      container('body').append(
                        `<div id="${level + 2}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"><h2>${contentItem.displayName}</h2></div>`,
                      )
                    }
                  },
                )
              }
            }
          } else {
            // use case of creation from book builder
            if (level === 0) {
              bookStructure.levels[level].contentStructure.forEach(
                contentItem => {
                  if (contentItem.type === 'contentOpenerImage') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"></div>`,
                    )
                  } else if (contentItem.type !== 'mainContent') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"><h2>${contentItem.displayName}</h2></div>`,
                    )
                  }
                },
              )
            }

            if (level === 1) {
              bookStructure.levels[level].contentStructure.forEach(
                contentItem => {
                  if (contentItem.type === 'contentOpenerImage') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"></div>`,
                    )
                  } else if (contentItem.type !== 'mainContent') {
                    container('body').append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"><h2>${contentItem.displayName}</h2></div>`,
                    )
                  }
                },
              )
              const levelThreeItemId = uuid()
              container('body').append(
                `<section id="${level}-${levelThreeItemId}" data-type="content_structure_element" class="level-three ${camelCaseToKebabCase(
                  bookStructure.levels[level + 1].type,
                )}"></section>`,
              )

              bookStructure.levels[level + 1].contentStructure.forEach(
                contentItem => {
                  if (contentItem.type === 'contentOpenerImage') {
                    container(`#${level}-${levelThreeItemId}`).append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"></div>`,
                    )
                  } else if (contentItem.type !== 'mainContent') {
                    container(`#${level}-${levelThreeItemId}`).append(
                      `<div id="${level}-${
                        contentItem.id
                      }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                        contentItem.type,
                      )}"><h3>${contentItem.displayName}</h3></div>`,
                    )
                  }
                },
              )

              // Case of level two closers after level three
              if (bookStructure.levels.length >= 3) {
                bookStructure.levels[level + 2].contentStructure.forEach(
                  contentItem => {
                    if (
                      contentItem.type === 'mainContent' ||
                      contentItem.type === 'contentOpenerImage'
                    ) {
                      container('body').append(
                        `<div id="${level + 2}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"></div>`,
                      )
                    } else {
                      container('body').append(
                        `<div id="${level + 2}-${
                          contentItem.id
                        }" data-type="content_structure_element" class="${camelCaseToKebabCase(
                          contentItem.type,
                        )}"><h2>${contentItem.displayName}</h2></div>`,
                      )
                    }
                  },
                )
              }
            }
          }

          content = container('body').html()
        }

        const bookComponentTranslation = await BookComponentTranslation.query(
          tr,
        ).findOne({
          bookComponentId: bookComponent.id,
          languageIso: languageIso || 'en',
        })

        return BookComponentTranslation.query(
          tr,
        ).patchAndFetchById(bookComponentTranslation.id, { content })
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { bookComponentContentCreator }
