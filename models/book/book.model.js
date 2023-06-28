const { Model } = require('objection')

const { uuid } = require('@coko/server')

const Base = require('../ketidaBase')

const {
  booleanDefaultFalse,
  id,
  string,
  year,
  booleanDefaultTrue,
  dateOrNull,
} = require('../helpers').schema

const outlineItem = {
  type: 'object',
  additionalProperties: false,
  $id: 'outline_item',
  properties: {
    id,
    title: string,
    type: string,
    parentId: id,
    children: {
      type: 'array',
      additionalProperties: false,
      default: [],
      items: {
        $ref: 'outline_item',
      },
    },
  },
}

const contentStructureItem = {
  type: 'object',
  $id: 'content_structure_item',
  additionalProperties: false,
  properties: {
    id,
    type: string,
    displayName: string,
  },
}

const levelItem = {
  type: 'object',
  additionalProperties: false,
  $id: 'level_item',
  properties: {
    id,
    type: string,
    displayName: string,
    contentStructure: {
      type: 'array',
      additionalProperties: false,
      default: [],
      items: contentStructureItem,
    },
  },
}

const bookStructure = {
  type: ['object', 'null'],
  default: null,
  additionalProperties: false,
  $id: 'book_structure',
  properties: {
    id,
    levels: {
      type: 'array',
      default: [],
      additionalProperties: false,
      items: levelItem,
    },
    outline: {
      type: 'array',
      default: [],
      additionalProperties: false,
      items: outlineItem,
    },
    finalized: booleanDefaultFalse,
    showWelcome: booleanDefaultTrue,
  },
}

const podMetadata = {
  type: ['object'],
  additionalProperties: false,
  properties: {
    authors: string,
    bottomPage: string,
    copyrightLicense: string,
    isbn: string,
    licenseTypes: {
      type: 'object',
      additionalProperties: false,
      properties: {
        NC: {
          type: ['boolean', 'null'],
        },
        SA: {
          type: ['boolean', 'null'],
        },
        ND: {
          type: ['boolean', 'null'],
        },
      },
    },
    ncCopyrightHolder: string,
    ncCopyrightYear: dateOrNull,
    publicDomainType: string,
    saCopyrightHolder: string,
    saCopyrightYear: dateOrNull,
    topPage: string,
  },
}

const statusField = {
  type: 'integer',
  minimum: 0,
  default: 0,
}

class Book extends Base {
  constructor(properties) {
    super(properties)
    this.type = 'book'
  }

  static get tableName() {
    return 'Book'
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const BookCollection = require('../bookCollection/bookCollection.model')
    /* eslint-enable global-require */
    return {
      bookCollection: {
        relation: Model.BelongsToOneRelation,
        modelClass: BookCollection,
        join: {
          from: 'Book.collectionId',
          to: 'BookCollection.id',
        },
      },
    }
  }

  static async getAllBooks(options, collectionId = undefined) {
    try {
      const { trx, showArchived, page, pageSize, orderBy } = options

      let queryBuilder = Book.query(trx).leftJoin(
        'book_translation',
        'book_translation.book_id',
        'book.id',
      )

      if (orderBy) {
        if (orderBy.column === 'title') {
          queryBuilder.orderByRaw(
            `LOWER(book_translation.title) ${orderBy.order} NULLS LAST`,
          )
        } else {
          queryBuilder = queryBuilder.orderBy([orderBy])
        }
      }

      if (
        (Number.isInteger(page) && !Number.isInteger(pageSize)) ||
        (!Number.isInteger(page) && Number.isInteger(pageSize))
      ) {
        throw new Error(
          'both page and pageSize integers needed for paginated results',
        )
      }

      if (Number.isInteger(page) && Number.isInteger(pageSize)) {
        if (page < 0) {
          throw new Error(
            'invalid index for page (page should be an integer and greater than or equal to 0)',
          )
        }

        if (pageSize <= 0) {
          throw new Error(
            'invalid size for pageSize (pageSize should be an integer and greater than 0)',
          )
        }

        queryBuilder = queryBuilder.page(page, pageSize)
      }

      const res = await queryBuilder
        .select([
          'book.id',
          'book.collectionId',
          'book.publicationDate',
          'book.archived',
          'book.bookStructure',
          'book.divisions',
          'book_translation.title',
        ])
        .groupBy('book.id', 'book_translation.title')
        .where({
          'book.deleted': false,
          'book.archived': showArchived,
          'book.collectionId': collectionId,
        })
        .skipUndefined()

      const { results, total } = res

      return {
        result: page !== undefined ? results : res,
        totalCount: total || res.length,
      }
    } catch (e) {
      throw new Error(e.message)
    }
  }

  static async getUserBooks(userId, options) {
    try {
      const { trx, showArchived, page, pageSize, orderBy, collectionId } =
        options

      let queryBuilder = Book.query(trx)
        .leftJoin('book_translation', 'book_translation.book_id', 'book.id')
        .leftJoin('teams', 'book.id', 'teams.object_id')
        .leftJoin('team_members', 'teams.id', 'team_members.team_id')
        .leftJoin('users', 'team_members.user_id', 'users.id')

      if (orderBy) {
        if (orderBy.column === 'title') {
          queryBuilder = queryBuilder.orderByRaw(
            `LOWER(book_translation.title) ${orderBy.order} NULLS LAST`,
          )
        } else {
          queryBuilder = queryBuilder.orderBy([orderBy])
        }
      }

      if (
        (Number.isInteger(page) && !Number.isInteger(pageSize)) ||
        (!Number.isInteger(page) && Number.isInteger(pageSize))
      ) {
        throw new Error(
          'both page and pageSize integers needed for paginated results',
        )
      }

      if (Number.isInteger(page) && Number.isInteger(pageSize)) {
        if (page < 0) {
          throw new Error(
            'invalid index for page (page should be an integer and greater than or equal to 0)',
          )
        }

        if (pageSize <= 0) {
          throw new Error(
            'invalid size for pageSize (pageSize should be an integer and greater than 0)',
          )
        }

        queryBuilder = queryBuilder.page(page, pageSize)
      }

      const res = await queryBuilder
        .select([
          'book.id',
          'book.collectionId',
          'book.publicationDate',
          'book.archived',
          'book.bookStructure',
          'book.divisions',
          'book_translation.title',
        ])
        .groupBy('book.id', 'book_translation.title')
        .where({
          'book.deleted': false,
          'book.archived': showArchived,
          'users.id': userId,
          'book.collectionId': collectionId,
        })
        .skipUndefined()

      const { results, total } = res

      return {
        result: page !== undefined ? results : res,
        totalCount: total || res.length,
      }
    } catch (e) {
      throw new Error(e.message)
    }
  }

  static get schema() {
    return {
      type: 'object',
      $id: 'book',
      properties: {
        archived: booleanDefaultFalse,
        collectionId: id,
        divisions: {
          $id: 'division_item',
          type: 'array',
          items: id,
          default: [],
        },
        bookStructure,
        referenceId: id,
        publicationDate: string,
        edition: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        copyrightStatement: string,
        copyrightYear: year,
        copyrightHolder: string,
        isbn: string,
        issn: string,
        issnL: string,
        license: string,
        podMetadata,
        status: statusField,
      },
    }
  }

  // Takes into consideration up to three levels of nesting
  ensureIds() {
    if (this.bookStructure) {
      if (!this.bookStructure.id) {
        this.bookStructure.id = uuid()
      }

      this.bookStructure.levels.forEach((level, index) => {
        if (!level.id) {
          this.bookStructure.levels[index].id = uuid()
        }

        level.contentStructure.forEach((contentItem, itemIndex) => {
          if (!contentItem.id) {
            this.bookStructure.levels[index].contentStructure[itemIndex].id =
              uuid()
          }
        })
      })
      this.bookStructure.outline.forEach(
        (outlineItemLevelOne, levelOneIndex) => {
          const levelOneId = uuid()

          if (!outlineItemLevelOne.id) {
            this.bookStructure.outline[levelOneIndex].id = levelOneId
            this.bookStructure.outline[levelOneIndex].parentId = levelOneId
          }

          outlineItemLevelOne.children.forEach(
            (outlineItemLevelTwo, levelTwoIndex) => {
              const levelTwoId = uuid()

              if (!outlineItemLevelTwo.id) {
                this.bookStructure.outline[levelOneIndex].children[
                  levelTwoIndex
                ].id = levelTwoId
                this.bookStructure.outline[levelOneIndex].children[
                  levelTwoIndex
                ].parentId = levelOneId
              }

              outlineItemLevelTwo.children.forEach(
                (outlineItemLevelThree, levelThreeIndex) => {
                  const levelThreeId = uuid()

                  if (!outlineItemLevelThree.id) {
                    this.bookStructure.outline[levelOneIndex].children[
                      levelTwoIndex
                    ].children[levelThreeIndex].id = levelThreeId
                    this.bookStructure.outline[levelOneIndex].children[
                      levelTwoIndex
                    ].children[levelThreeIndex].parentId = levelTwoId
                  }
                },
              )
            },
          )
        },
      )
    }
  }

  $beforeInsert() {
    super.$beforeInsert()
    // If no reference id is given, assume that this is a new book & create one
    this.referenceId = this.referenceId || uuid()
    this.ensureIds()
  }

  $beforeUpdate() {
    super.$beforeUpdate()
    this.ensureIds()
  }
}

module.exports = Book
