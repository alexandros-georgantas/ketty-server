const controllers = require('./controllers')

module.exports = {
  server: () => app => controllers(app),
}
