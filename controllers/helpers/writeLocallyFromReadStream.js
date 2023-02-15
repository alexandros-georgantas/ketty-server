const fs = require('fs-extra')

const writeLocallyFromReadStream = async (
  pathArg,
  filename,
  readerStream,
  encoding,
) => {
  try {
    const pathExists = await fs.pathExists(pathArg)

    if (!pathExists) throw new Error(`path ${pathArg} does not exists`)

    return new Promise((resolve, reject) => {
      const writerStream = fs.createWriteStream(
        `${pathArg}/${filename}`,
        encoding,
      )

      writerStream.on('close', () => {
        resolve()
      })
      writerStream.on('error', err => {
        reject(err)
      })
      readerStream.pipe(writerStream)
    })
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = writeLocallyFromReadStream
