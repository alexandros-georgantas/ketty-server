const { exec } = require('child_process')
const { logger, useTransaction } = require('@coko/server')

const map = require('lodash/map')
const path = require('path')
const fs = require('fs-extra')
const mime = require('mime-types')

const { ketidaDataModel } = require('../../data-model')
const { dirContents } = require('../../api/helpers/utils')

const { useCaseCreateFile, useCaseUploadFile } = require('../../api/useCases')

const { models } = ketidaDataModel

const { Template } = models

const execute = async command =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error.message)
      }

      return resolve(stdout)
    })
  })

const filesChecker = async folder => {
  // the .map has no place in the below array but exists there as it is
  // created during the build process of template's css
  const allowedFiles = ['.css', '.otf', '.woff', '.woff2', '.ttf', '.map']

  const regexFiles = new RegExp(
    `([a-zA-Z0-9s_\\.-:])+(${allowedFiles.join('|')})$`,
  )

  const availableAssets = []

  if (fs.existsSync(path.join(folder, 'fonts'))) {
    availableAssets.push(path.join(folder, 'fonts'))
  }

  if (fs.existsSync(path.join(folder, 'css'))) {
    availableAssets.push(path.join(folder, 'css'))
  }

  const everythingChecked = await Promise.all(
    map(availableAssets, async parentFolder => {
      const dirFiles = await fs.readdir(parentFolder)

      const checkedFiles = map(dirFiles, file => {
        if (!regexFiles.test(file)) {
          return false
        }

        return true
      })

      return !checkedFiles.includes(false)
    }),
  )

  return !everythingChecked.includes(false)
}

const createTemplate = async (sourceRoot, data, cssFile, notes) => {
  try {
    const assetsRoot = path.join(sourceRoot, 'dist')
    const areAssetsOK = await filesChecker(assetsRoot)
    const { name, author, target } = data

    const transactionWrapper = async trx => {
      logger.info('About to create a new template')

      const newTemplate = await Template.query(trx).insert({
        name: `${name} (${notes})`,
        author,
        target,
        notes,
      })

      logger.info(`New template created with id ${newTemplate.id}`)

      const fontsPath = path.join(assetsRoot, 'fonts')

      if (fs.existsSync(fontsPath)) {
        const contents = await dirContents(fontsPath)
        await Promise.all(
          contents.map(async font => {
            const absoluteFontPath = path.join(fontsPath, font)
            const mimetype = mime.lookup(font)

            const { original } = await useCaseUploadFile(
              fs.createReadStream(absoluteFontPath),
              font,
              mimetype,
              undefined,
              `templates/${newTemplate.id}/${font}`,
            )

            const { key, location, metadata, size, extension } = original
            const options = {}
            options.trx = trx
            return useCaseCreateFile(
              { name: font, size, mimetype, metadata, extension },
              { location, key },
              'template',
              newTemplate.id,
              options,
            )
          }),
        )
      }

      const cssPath = path.join(assetsRoot, 'css')

      if (fs.existsSync(path.join(assetsRoot, 'css'))) {
        const absoluteCSSPath = path.join(cssPath, cssFile)
        const mimetype = mime.lookup(cssFile)

        const { original } = await useCaseUploadFile(
          fs.createReadStream(absoluteCSSPath),
          cssFile,
          mimetype,
          undefined,
          `templates/${newTemplate.id}/${cssFile}`,
        )

        const { key, location, metadata, size, extension } = original
        const options = {}
        options.trx = trx
        return useCaseCreateFile(
          { name: cssFile, size, mimetype, metadata, extension },
          { location, key },
          'template',
          newTemplate.id,
          options,
        )
      }

      return true
    }

    if (areAssetsOK) {
      logger.info('Checking if template with that name already exists')

      const existingTemplate = await Template.query()
        .where({
          name: `${name} (${notes})`,
        })
        .andWhere({ target })

      if (existingTemplate.length > 0) {
        logger.info(`Template with name ${name} (${notes}) already exists`)
      } else {
        await useTransaction(transactionWrapper)
      }
    } else {
      throw new Error(
        'an unsupported file exists in either dist/css, dist/fonts, dist/img. The supported files are .css, .otf, .woff, .woff2, .ttf',
      )
    }

    return true
  } catch (e) {
    throw new Error(e)
  }
}

const getTemplates = async () => {
  try {
    // await cleanTemplatesFolder()
    await execute(`. ${path.join(__dirname, 'fetchTemplates.sh')}`)
  } catch (e) {
    throw new Error(e)
  }
}
// const cleanTemplatesFolder = async () => {
//   try {
//     await execute(`rm -rf ${path.join(__dirname, '..', '..', 'templates')}`)
//   } catch (e) {
//     throw new Error(e.message)
//   }
// }

module.exports = {
  execute,
  createTemplate,
  getTemplates,
}
