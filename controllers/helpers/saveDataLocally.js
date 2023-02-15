const fs = require('fs-extra')

const saveDataLocally = async (pathArg, filename, data, encoding) => {
  try {
    const pathExists = await fs.pathExists(pathArg)

    if (!pathExists) throw new Error(`path ${pathArg} does not exists`)

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(`${pathArg}/${filename}`, {
        encoding,
      })

      // write some data with a base64 encoding
      writeStream.write(data)

      // the finish event is emitted when all data has been flushed from the stream
      writeStream.on('finish', () => {
        resolve()
      })

      // close the stream
      writeStream.end()
    })
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = saveDataLocally
