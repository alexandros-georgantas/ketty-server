const { Model } = require('objection')
const uuid = require('uuid/v4')

const Base = require('../ketidaBase')

const { booleanDefaultFalse, id, string, year, booleanDefaultTrue } =
  require('../helpers').schema

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

  static get schema() {
    return {
      type: 'object',
      required: ['collectionId'],
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
