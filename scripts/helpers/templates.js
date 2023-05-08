const { logger, useTransaction } = require('@coko/server')
const { exec } = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const config = require('config')

const map = require('lodash/map')
const find = require('lodash/find')

const Template = require('../../models/template/template.model')

const { createFile } = require('../../controllers/file.controller')

const { dirContents } = require('../../utilities/filesystem')

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
    const whichTemplates = config.get('templates')
    const { name, author, target } = data
    const foundTemplate = find(whichTemplates, { label: name.toLowerCase() })

    if (!foundTemplate) {
      throw new Error(`template with name ${name} was not fetched from source`)
    }

    if (!foundTemplate.assetsRoot) {
      throw new Error(
        `template with name ${name} does not contain assetsRoot in its configuration`,
      )
    }

    const assetsRoot = path.join(sourceRoot, foundTemplate.assetsRoot)
    const areAssetsOK = await filesChecker(assetsRoot)

    const transactionWrapper = async trx => {
      logger.info('About to create a new template')

      const newTemplate = await Template.insert(
        {
          name: `${name} (${notes})`,
          author,
          target,
          notes,
        },
        { trx },
      )

      logger.info(`New template created with id ${newTemplate.id}`)

      const fontsPath = path.join(assetsRoot, 'fonts')

      if (fs.existsSync(fontsPath)) {
        const contents = await dirContents(fontsPath)
        await Promise.all(
          contents.map(async font => {
            const absoluteFontPath = path.join(fontsPath, font)

            return createFile(
              fs.createReadStream(absoluteFontPath),
              font,
              null,
              null,
              [],
              newTemplate.id,
              {
                trx,
                forceObjectKeyValue: `templates/${newTemplate.id}/${font}`,
              },
            )
          }),
        )
      }

      const cssPath = path.join(assetsRoot, 'css')

      if (fs.existsSync(path.join(assetsRoot, 'css'))) {
        const absoluteCSSPath = path.join(cssPath, cssFile)

        return createFile(
          fs.createReadStream(absoluteCSSPath),
          cssFile,
          null,
          null,
          [],
          newTemplate.id,
          {
            trx,
            forceObjectKeyValue: `templates/${newTemplate.id}/${cssFile}`,
          },
        )
      }

      return true
    }

    if (areAssetsOK) {
      logger.info('Checking if template with that name already exists')

      const { result: existingTemplates } = await Template.find({
        name: `${name} (${notes})`,
        target,
      })

      if (existingTemplates.length > 0) {
        logger.info(`Template with name ${name} (${notes}) already exists`)
      } else {
        await useTransaction(transactionWrapper)
      }
    } else {
      throw new Error(
        `an unsupported file exists in either ${foundTemplate.assetsRoot}/css, ${foundTemplate.assetsRoot}/fonts. The supported files are .css, .otf, .woff, .woff2, .ttf`,
      )
    }

    return true
  } catch (e) {
    throw new Error(e)
  }
}

const cleanTemplatesFolder = async () => {
  try {
    await execute(`rm -rf ${path.join(__dirname, '..', '..', 'templates')}`)
  } catch (e) {
    throw new Error(e.message)
  }
}

const getTemplates = async () => {
  try {
    const whichTemplates = config.get('templates')
    await cleanTemplatesFolder()
    return Promise.all(
      whichTemplates.map(async templateDetails => {
        const { url, label } = templateDetails
        return execute(`git clone ${url} ./templates/${label}`)
      }),
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  execute,
  createTemplate,
  getTemplates,
}
