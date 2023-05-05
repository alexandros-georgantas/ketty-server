const path = require('path')

const components = require('./components')
const authsomeVanilla = require('./modules/authsomeVanilla')
const authsomeBooksprints = require('./modules/authsomeBooksprints')
const bbVanilla = require('./modules/bookBuilderVanilla')
const bbOEN = require('./modules/bookBuilderOEN')
const bbBooksprints = require('./modules/bookBuilderBooksprints')
// const permissions = require('./permissions')
const oenTeams = require('./modules/oenTeams')
const vanillaTeams = require('./modules/vanillaTeams')
const booksprintTeams = require('./modules/booksprintTeams')
const vanillaPermissions = require('./permissions/vanilla.permissions')
const booksprintPermissions = require('./permissions/booksprint.permissions')
const oenPermissions = require('./permissions/oen.permissions')

const flavour =
  process.env.KETIDA_FLAVOUR && process.env.KETIDA_FLAVOUR === 'BOOKSPRINTS'
    ? 'BOOKSPRINTS'
    : 'VANILLA'

const featureBookStructureEnabled =
  (process.env.FEATURE_BOOK_STRUCTURE &&
    JSON.parse(process.env.FEATURE_BOOK_STRUCTURE)) ||
  false

let bookBuilder
let permissions = vanillaPermissions

if (!featureBookStructureEnabled) {
  if (flavour === 'BOOKSPRINTS') {
    bookBuilder = bbBooksprints
    permissions = booksprintPermissions
  } else {
    bookBuilder = bbVanilla
  }
} else {
  permissions = oenPermissions
  bookBuilder = bbOEN
}

let flavorTeams = oenTeams

if (!featureBookStructureEnabled) {
  flavorTeams = flavour === 'BOOKSPRINTS' ? booksprintTeams : vanillaTeams
}

module.exports = {
  authsome: flavour === 'BOOKSPRINTS' ? authsomeBooksprints : authsomeVanilla,
  bookBuilder,
  'password-reset': {
    path: 'password-reset',
  },
  mailer: {
    from: 'info@ketida.com',
    path: path.join(__dirname, 'mailer'),
  },
  permissions,
  publicKeys: [
    'authsome',
    'bookBuilder',
    'pubsweet',
    'pubsweet-client',
    'pubsweet-server',
    'validations',
    'wax',
  ],
  pubsweet: {
    components,
  },
  'pubsweet-client': {
    API_ENDPOINT: '/api',
    'login-redirect': '/',
    navigation: 'app/components/Navigation/Navigation.jsx',
    routes: 'app/routes.jsx',
    theme: 'ThemeEditoria',
    port: 3000,
    protocol: 'http',
    host: 'localhost',
  },
  'pubsweet-server': {
    db: {},
    useGraphQLServer: true,
    useJobQueue: false,
    useFileStorage: true,
    serveClient: false,
    graphiql: true,
    tokenExpiresIn: '360 days',
    serverUrl: undefined,
    port: 3000,
    protocol: 'http',
    host: 'localhost',
    uploads: 'uploads',
    emailVerificationTokenExpiry: {
      amount: 24,
      unit: 'hours',
    },
    passwordResetTokenExpiry: {
      amount: 24,
      unit: 'hours',
    },
    pool: { min: 0, max: 10, idleTimeoutMillis: 1000 },
    cron: {
      path: path.join(__dirname, '..', 'services', 'cron.service.js'),
    },
  },
  teams: flavorTeams,
  fileStorage: {},
  services: {},
  templates: ['Atla'],
  seedTemplates: true,
  export: {
    rootFolder: 'config/exportScripts',
    scripts: [],
  },
  schema: {},
  featureBookStructure: false,
  featureUploadDOCXFiles: true,
  tempDirectoryCleanUp: true,
}
