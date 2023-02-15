const list = require('list-contents')

const dirContents = async pathArg =>
  new Promise((resolve, reject) => {
    list(pathArg, o => {
      if (o.error) reject(o.error)
      resolve(o.files)
    })
  })

module.exports = dirContents
