const controllers = require('./RESTEndpoints')

module.exports = {
  server: () => app => controllers(app),
}
