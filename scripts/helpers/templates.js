const { logger } = require('@coko/server')
const { exec } = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const config = require('config')

const map = require('lodash/map')
const find = require('lodash/find')

const {
  connectToFileStorage,
} = require('@coko/server/src/services/fileStorage')

const Template = require('../../models/template/template.model')

const { createFile, deleteFiles } = require('../../controllers/file.controller')

const { dirContents } = require('../../utilities/filesystem')

const File = require('../../models/file/file.model')

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

const createTemplate = async (
  sourceRoot,
  data,
  cssFile,
  notes,
  options = {},
) => {
  try {
    const { trx } = options

    await connectToFileStorage()

    const featurePODEnabled =
      config.has('featurePOD') &&
      ((config.get('featurePOD') && JSON.parse(config.get('featurePOD'))) ||
        false)

    const normalizedTemplates = config.get('templates').map(t => ({
      label: t.label.toLowerCase(),
      url: t.url,
      assetsRoot: t.assetsRoot.replace(/^\/+/, '').replace(/\/+$/, ''),
    }))

    const { isDefault, name, author, target, trimSize, thumbnailFile } = data

    const foundTemplate = find(normalizedTemplates, {
      label: name.toLowerCase(),
    })

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

    if (!areAssetsOK) {
      throw new Error(
        `an unsupported file exists in either ${foundTemplate.assetsRoot}/css, ${foundTemplate.assetsRoot}/fonts. The supported files are .css, .otf, .woff, .woff2, .ttf`,
      )
    }

    logger.info('Checking if template with that name already exists')

    let templateExists

    const constructedName = featurePODEnabled
      ? name
      : `${name} (${notes})`.toLowerCase()

    if (trimSize) {
      templateExists = await Template.query(trx)
        .whereRaw('lower("name") = ?', constructedName)
        .andWhere({ target, trimSize, notes })
    } else {
      templateExists = await Template.query(trx)
        .whereRaw('lower("name") = ?', constructedName)
        .andWhere({ target, notes })
    }

    if (templateExists.length > 1) {
      throw new Error('multiple records found for the same template')
    }

    if (templateExists.length === 0) {
      logger.info('About to create a new template')

      const newTemplate = await Template.insert(
        {
          name: featurePODEnabled ? name : `${name} (${notes})`,
          author,
          target,
          trimSize,
          default: isDefault,
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

      if (fs.existsSync(cssPath)) {
        const absoluteCSSPath = path.join(cssPath, cssFile)

        await createFile(
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

      if (thumbnailFile) {
        const thumbnailPath = path.join(assetsRoot, thumbnailFile)

        if (fs.existsSync(thumbnailPath)) {
          const thumbnail = await createFile(
            fs.createReadStream(thumbnailPath),
            thumbnailFile,
            null,
            null,
            [],
            newTemplate.id,
            {
              trx,
            },
          )

          await Template.patchAndFetchById(
            newTemplate.id,
            { thumbnailId: thumbnail.id },
            { trx },
          )
        }
      }

      return true
    }

    const files = await File.find({ objectId: templateExists[0].id }, { trx })

    const fileIds = files.result.map(file => file.id)

    logger.info(
      `deleting files with ids ${fileIds} associated with template id ${templateExists[0].id}`,
    )

    try {
      await deleteFiles(fileIds, true, { trx })
    } catch (e) {
      if (e.message.includes('The specified key does not exist.')) {
        logger.error(
          `Corrupted template with id ${templateExists[0].id}. All the associated files will be removed from the db and will be recreated`,
        )
        await File.deleteByIds(fileIds)
      }
    }

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
            templateExists[0].id,
            {
              trx,
              forceObjectKeyValue: `templates/${templateExists[0].id}/${font}`,
            },
          )
        }),
      )
    }

    const cssPath = path.join(assetsRoot, 'css')

    if (fs.existsSync(cssPath)) {
      const absoluteCSSPath = path.join(cssPath, cssFile)

      await createFile(
        fs.createReadStream(absoluteCSSPath),
        cssFile,
        null,
        null,
        [],
        templateExists[0].id,
        {
          trx,
          forceObjectKeyValue: `templates/${templateExists[0].id}/${cssFile}`,
        },
      )
    }

    if (thumbnailFile) {
      const thumbnailPath = path.join(assetsRoot, thumbnailFile)

      if (fs.existsSync(thumbnailPath)) {
        const thumbnail = await createFile(
          fs.createReadStream(thumbnailPath),
          thumbnailFile,
          null,
          null,
          [],
          templateExists[0].id,
          {
            trx,
          },
        )

        await Template.patchAndFetchById(
          templateExists[0].id,
          { thumbnailId: thumbnail.id, default: isDefault },
          { trx },
        )
      }
    }

    return true
  } catch (e) {
    throw new Error(e)
  }
}

const cleanTemplatesFolder = async () => {
  try {
    return execute(`rm -rf ${path.join(__dirname, '..', '..', 'templates')}`)
  } catch (e) {
    throw new Error(e.message)
  }
}

const getTemplates = async () => {
  try {
    const normalizedTemplates = config.has('templates')
      ? config.get('templates').map(t => ({
          label: t.label.toLowerCase(),
          url: t.url,
          branch: t.branch,
          assetsRoot: t.assetsRoot.replace(/^\/+/, '').replace(/\/+$/, ''),
        }))
      : []

    await cleanTemplatesFolder()

    return Promise.all(
      normalizedTemplates.map(async templateDetails => {
        const { url, label, branch } = templateDetails
        return execute(
          `git clone ${url} ${
            branch ? `--branch ${branch}` : ''
          } ./templates/${label} `,
        )
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
