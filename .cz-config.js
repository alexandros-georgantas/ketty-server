const { commitizen } = require('@coko/lint')

commitizen.scopes = [
  'api/graphql',
  'api/rest',
  'controllers',
  'docker',
  'models',
  'services',
  '*',
]

module.exports = commitizen
