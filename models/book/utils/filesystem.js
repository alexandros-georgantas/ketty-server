const fs = require('fs')
const list = require('list-contents')
const { exec } = require('child_process')

const writeFile = (location, content) =>
  new Promise((resolve, reject) => {
    fs.writeFile(location, content, 'utf8', err => {
      if (err) return reject(err)
      return resolve()
    })
  })

const readFile = location =>
  new Promise((resolve, reject) => {
    fs.readFile(location, 'utf8', (err, data) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })

const dirContents = async path =>
  new Promise((resolve, reject) => {
    list(path, { exclude: ['mimetype'] }, o => {
      if (o.error) reject(o.error)
      resolve(o.files)
    })
  })

const execCommand = cmd =>
  new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(error)
      }

      return resolve(stdout || stderr)
    })
  })

module.exports = {
  writeFile,
  readFile,
  dirContents,
  execCommand,
}
