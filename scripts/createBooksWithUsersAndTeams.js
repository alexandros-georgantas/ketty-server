const { logger } = require('@coko/server')
const { TeamMember } = require('@pubsweet/models')
const keys = require('lodash/keys')
const map = require('lodash/map')
const config = require('config')

const { ketidaDataModel } = require('../data-model')

const { models } = ketidaDataModel

const {
  User,
  Book,
  Team,
  BookTranslation,
  BookCollection,
  BookCollectionTranslation,
} = models

const createBooksWithUsersAndTeams = async () => {
  try {
    const collections = await BookCollection.all()
    const globalTeams = await Team.query().where('global', true)
    // eslint-disable-next-line no-unused-vars
    let globalTeam
    let collection

    if (collections.length === 0) {
      collection = await new BookCollection().save()
      await new BookCollectionTranslation({
        collectionId: collection.id,
        languageIso: 'en',
        title: 'Books',
      }).save()
    } else {
      // eslint-disable-next-line prefer-destructuring
      collection = collections[0]
    }

    let adminUser = await User.findByUsername('admin')
    let authorUser = await User.findByUsername('author')
    let productionEditorUser = await User.findByUsername('productionEditor')
    let globalProductionEditorUser = await User.findByUsername(
      'globalProductionEditor',
    )
    let copyEditorUser = await User.findByUsername('copyEditor')

    if (!adminUser) {
      adminUser = await new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password',
        admin: true,
      }).save()
    }

    if (!authorUser) {
      authorUser = await new User({
        username: 'author',
        email: 'author@example.com',
        password: 'password',
        givenName: 'AUTH',
        surname: 'AUTH',
        admin: false,
      }).save()
    }

    if (!productionEditorUser) {
      productionEditorUser = await new User({
        username: 'productionEditor',
        email: 'productionEditorUser@example.com',
        password: 'password',
        givenName: 'PE',
        surname: 'PE',
        admin: false,
      }).save()
    }

    if (!globalProductionEditorUser) {
      globalProductionEditorUser = await new User({
        username: 'globalProductionEditor',
        email: 'globalProductionEditor@example.com',
        password: 'password',
        givenName: 'GPE',
        surname: 'GPE',
        admin: false,
      }).save()
    }

    if (!copyEditorUser) {
      copyEditorUser = await new User({
        username: 'copyEditor',
        email: 'copyEditorUser@example.com',
        password: 'password',
        givenName: 'CP',
        surname: 'CP',
        admin: false,
      }).save()
    }

    if (globalTeams.length === 0) {
      const newTeam = await new Team({
        name: 'Production Editor',
        role: 'productionEditor',
        deleted: false,
        global: true,
      }).save()

      await new TeamMember({
        userId: globalProductionEditorUser.id,
        teamId: newTeam.id,
      }).save()
    } else {
      const tempGlobal = globalTeams[0]

      if (tempGlobal.members === undefined) {
        await new TeamMember({
          userId: globalProductionEditorUser.id,
          teamId: tempGlobal.id,
        }).save()
      }
    }

    const books = await Book.all()
    let authorBook
    let productionEditorBook
    let copyEditorBook
    const roles = keys(config.authsome.teams)

    if (books.length === 0) {
      authorBook = await new Book({
        collectionId: collection.id,
      }).save()
      await new BookTranslation({
        title: 'Author Book',
        bookId: authorBook.id,
        languageIso: 'en',
      }).save()
      await Promise.all(
        map(roles, async role => {
          if (role === 'author') {
            const newTeam = await new Team({
              name: config.authsome.teams[role].name,
              objectId: authorBook.id,
              objectType: 'book',
              role,
              deleted: false,
              global: false,
            }).save()

            await new TeamMember({
              userId: authorUser.id,
              teamId: newTeam.id,
            }).save()
          } else {
            await new Team({
              name: config.authsome.teams[role].name,
              objectId: authorBook.id,
              objectType: 'book',
              role,
              deleted: false,
              global: false,
            }).save()
          }
        }),
      )
      productionEditorBook = await new Book({
        collectionId: collection.id,
      }).save()
      await new BookTranslation({
        title: 'Production Editor Book',
        bookId: productionEditorBook.id,
        languageIso: 'en',
      }).save()

      await Promise.all(
        map(roles, async role => {
          if (role === 'productionEditor') {
            const newTeam = await new Team({
              name: config.authsome.teams[role].name,
              objectId: productionEditorBook.id,
              objectType: 'book',
              role,
              deleted: false,
              global: false,
            }).save()

            await new TeamMember({
              userId: productionEditorUser.id,
              teamId: newTeam.id,
            }).save()
          } else {
            await new Team({
              name: config.authsome.teams[role].name,
              objectId: productionEditorBook.id,
              objectType: 'book',
              role,
              deleted: false,
              global: false,
            }).save()
          }
        }),
      )

      copyEditorBook = await new Book({
        collectionId: collection.id,
      }).save()
      await new BookTranslation({
        title: 'Copy Editor Book',
        bookId: copyEditorBook.id,
        languageIso: 'en',
      }).save()

      await Promise.all(
        map(roles, async role => {
          if (role === 'copyEditor') {
            const newTeam = await new Team({
              name: config.authsome.teams[role].name,
              objectId: copyEditorBook.id,
              objectType: 'book',
              role,
              deleted: false,
              global: false,
            }).save()

            await new TeamMember({
              userId: copyEditorUser.id,
              teamId: newTeam.id,
            }).save()
          } else {
            await new Team({
              name: config.authsome.teams[role].name,
              objectId: copyEditorBook.id,
              objectType: 'book',
              role,
              deleted: false,
              global: false,
            }).save()
          }
        }),
      )
    } else {
      const authorBookTranslation = await BookTranslation.query()
        .where('title', 'Author Book')
        .andWhere('languageIso', 'en')

      authorBook = await Book.findById(authorBookTranslation[0].bookId)

      const productionEditorBookTranslation = await BookTranslation.query()
        .where('title', 'Production Editor Book')
        .andWhere('languageIso', 'en')

      productionEditorBook = await Book.findById(
        productionEditorBookTranslation[0].bookId,
      )

      const copyEditorBookTranslation = await BookTranslation.query()
        .where('title', 'Copy Editor Book')
        .andWhere('languageIso', 'en')

      copyEditorBook = await Book.findById(copyEditorBookTranslation[0].bookId)
    }

    logger.info('Seeding complete.')
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = createBooksWithUsersAndTeams

createBooksWithUsersAndTeams()
