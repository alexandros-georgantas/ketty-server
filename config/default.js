const path = require('path')

const components = require('./components')
const authsomeVanilla = require('./modules/authsomeVanilla')
const authsomeBooksprints = require('./modules/authsomeBooksprints')
const bbVanilla = require('./modules/bookBuilderVanilla')
const bbOEN = require('./modules/bookBuilderOEN')
const bbBooksprints = require('./modules/bookBuilderBooksprints')
const permissions = require('./permissions')

const flavour =
  process.env.KETIDA_FLAVOUR && process.env.KETIDA_FLAVOUR === 'BOOKSPRINTS'
    ? 'BOOKSPRINTS'
    : 'VANILLA'

const featureBookStructureEnabled =
  (process.env.FEATURE_BOOK_STRUCTURE &&
    JSON.parse(process.env.FEATURE_BOOK_STRUCTURE)) ||
  false

let bookBuilder

if (!featureBookStructureEnabled) {
  if (flavour === 'BOOKSPRINTS') {
    bookBuilder = bbBooksprints
  } else {
    bookBuilder = bbVanilla
  }
} else {
  bookBuilder = bbOEN
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
    converter: 'ucp',
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
  teams: {
    global: {
      productionEditor: {
        displayName: 'Production Editor',
        role: 'productionEditor',
      },
      admin: {
        displayName: 'Admin',
        role: 'admin',
      },
    },
    nonGlobal: {
      productionEditor: {
        displayName: 'Production Editor',
        role: 'productionEditor',
      },
      copyEditor: {
        displayName: 'Copy Editor',
        role: 'copyEditor',
      },
      author: {
        displayName: 'Author',
        role: 'author',
      },
    },
  },
  fileStorage: {},
  services: {},
  templates: ['Atla'],
  export: {
    rootFolder: 'config/exportScripts',
    scripts: [],
  },
  schema: {},
  featureBookStructure: false,
  featureUploadDOCXFiles: true,
  tempDirectoryCleanUp: true,
}
