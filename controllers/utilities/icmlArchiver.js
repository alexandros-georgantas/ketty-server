const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const crypto = require('crypto')
const { dirContents } = require('./filesystem')

const icmlArchiver = async (
  ICMLtempFolderAssetsPath,
  ICMLtempFolderFilePath,
) => {
  try {
    await fse.ensureDir(ICMLtempFolderFilePath)
    const icmlFiles = await dirContents(ICMLtempFolderAssetsPath)
    return new Promise((resolve, reject) => {
      const tempFilename = `${crypto.randomBytes(32).toString('hex')}.zip`

      const destination = path.join(ICMLtempFolderFilePath, tempFilename)

      const output = fs.createWriteStream(destination)
      const archive = archiver('zip')
      // pipe archive data to the file
      archive.pipe(output)

      icmlFiles.forEach(item => {
        const absoluteFilePath = path.join(ICMLtempFolderAssetsPath, item)
        archive.append(fs.createReadStream(absoluteFilePath), { name: item })
      })
      archive.finalize()

      output.on('close', () => {
        resolve(tempFilename)
      })

      archive.on('error', async err => {
        await fs.remove(ICMLtempFolderAssetsPath)
        await fs.remove(ICMLtempFolderFilePath)
        reject(err)
      })
    })
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { icmlArchiver }
