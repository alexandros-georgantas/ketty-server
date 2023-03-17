const { logger, useTransaction, fileStorage } = require('@coko/server')
const fs = require('fs-extra')
const path = require('path')
const config = require('config')
const mime = require('mime-types')
const orderBy = require('lodash/orderBy')
const map = require('lodash/map')
const find = require('lodash/find')
const forEach = require('lodash/forEach')

const scripts = config.get('export.scripts')
const uploadsPath = config.get('pubsweet-server').uploads

const { Template, File } = require('../models').models

const { download } = fileStorage

const {
  createFile,
  deleteFiles: deleteFilesController,
} = require('./file.controller')

const { isSupportedAsset } = require('../utilities/mimetype')

const getTemplates = async (
  ascending,
  sortKey,
  target,
  notes,
  options = {},
) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching templates`)
    return useTransaction(
      async tr => {
        if (!target) {
          const { result: templates } = await Template.find(
            { deleted: false },
            { trx: tr },
          )

          const sortable = map(templates, template => {
            const { id, name, author, target: innerTarget } = template

            return {
              id,
              name: name.toLowerCase().trim(),
              author,
              targetType: innerTarget,
            }
          })

          const order = ascending ? 'asc' : 'desc'
          logger.info(
            `>>> without target and orderedBy ${sortKey} and direction ${order}`,
          )

          const sorted = orderBy(sortable, sortKey, [order])
          const result = map(sorted, item => find(templates, { id: item.id }))
          return result
        }

        logger.info(`>>> with target ${target} and notes ${notes}`)

        if (notes && notes === 'endnotes') {
          const { result } = await Template.find(
            { deleted: false, target, notes },
            { trx: tr },
          )

          return result
        }

        return Template.query(tr)
          .where('deleted', false)
          .andWhere('target', target)
          .whereNot('notes', 'endnotes')
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getTemplate = async (id, options = {}) => {
  try {
    const { trx } = options
    logger.info(`>>> fetching template with id ${id}`)
    return useTransaction(async tr => Template.findById(id, { trx: tr }), {
      trx,
      passedTrxOnly: true,
    })
  } catch (e) {
    throw new Error(e)
  }
}

const createTemplate = async (
  name,
  author,
  files,
  target,
  trimSize,
  thumbnail,
  notes,
  exportScripts,
  options = {},
) => {
  try {
    const { trx } = options

    logger.info('>>> creating new template')
    return useTransaction(
      async tr => {
        const newTemplate = await Template.insert(
          {
            name,
            author,
            target,
            notes,
            trimSize,
            exportScripts,
          },
          { trx: tr },
        )

        logger.info(`>>> new template created with id ${newTemplate.id}`)

        if (files.length > 0) {
          logger.info(
            `>> there is/are ${files.length} file/s to be uploaded for the template`,
          )
          await Promise.all(
            map(files, async file => {
              const { createReadStream: fileReadStream, filename } = await file

              const mimetype = mime.lookup(filename)
              if (!isSupportedAsset(mimetype, 'templates'))
                throw new Error('File extension is not allowed')
              const fileStream = fileReadStream()
              return createFile(
                fileStream,
                filename,
                null,
                null,
                [],
                newTemplate.id,
                {
                  trx: tr,
                  forceObjectKeyValue: `templates/${newTemplate.id}/${filename}`,
                },
              )
            }),
          )
        }

        if (thumbnail) {
          logger.info(
            '>>> there is a thumbnail file to be uploaded for the template',
          )

          const { createReadStream: fileReadStream, filename } = await thumbnail

          const mimetype = mime.lookup(filename)
          if (!isSupportedAsset(mimetype, 'templateThumbnails'))
            throw new Error('File extension is not allowed')
          const fileStream = fileReadStream()

          const newThumbnail = createFile(
            fileStream,
            filename,
            null,
            null,
            [],
            newTemplate.id,
            { trx: tr },
          )

          logger.info('>>> thumbnail uploaded to the server')

          logger.info(
            `>>> thumbnail representation created on the db with file id ${newThumbnail.id}`,
          )
          await Template.patchAndFetchById(
            newTemplate.id,
            { thumbnailId: newThumbnail.id },
            { trx: tr },
          )
        }

        return newTemplate
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const cloneTemplate = async (id, name, cssFile, hashed, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const tempFolder = `${uploadsPath}/temp/previewer`

        await fs.ensureDir(uploadsPath)
        await fs.ensureDir(tempFolder)

        const template = await Template.findById(id, { trx: tr })

        const newTemplate = await Template.insert(
          {
            name,
            author: template.author,
            target: template.target,
            trimSize: template.trimSize,
            exportScripts: template.exportScripts,
            notes: template.notes,
            referenceId: template.id,
          },
          { trx: tr },
        )

        logger.info(`>>> new template created with id ${newTemplate.id}`)

        const { result: files } = await File.find({ objectId: id }, { trx: tr })

        await Promise.all(
          map(files, async file => {
            const { name: fName } = file

            const { key, mimetype } =
              file.getStoredObjectBasedOnType('original')

            const filepath = path.join(tempFolder, `${fName}`)

            if (mimetype === 'text/css') {
              fs.writeFileSync(filepath, cssFile)
            } else {
              await download(key, filepath)
            }

            const fileStream = fs.createReadStream(filepath)

            const newFile = await createFile(
              fileStream,
              `${fName}`,
              null,
              null,
              [],
              newTemplate.id,
              {
                trx: tr,
                forceObjectKeyValue: `templates/${newTemplate.id}/${fName}`,
              },
            )

            logger.info(
              `>>> the path the the files will be stored is ${filepath}`,
            )
            logger.info(
              `>>> file representation created on the db with file id ${newFile.id}`,
            )

            if (template.thumbnailId === file.id) {
              await Template.patchAndFetchById(
                newTemplate.id,
                {
                  thumbnailId: newFile.id,
                },
                { trx: tr },
              )
            }
          }),
        )
        await fs.remove(tempFolder)
        await fs.remove(`${uploadsPath}/temp/previewer/${hashed}`)
        return newTemplate
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateTemplate = async (data, options = {}) => {
  try {
    const {
      id,
      name,
      author,
      files,
      target,
      trimSize,
      notes,
      thumbnail,
      deleteFiles,
      deleteThumbnail,
      exportScripts,
    } = data

    const { trx } = options
    return useTransaction(
      async tr => {
        if (deleteThumbnail) {
          logger.info(
            `>>> existing thumbnail with id ${deleteThumbnail} will be patched and set to deleted true`,
          )

          const affectedRows = await deleteFilesController(
            [deleteThumbnail],
            true,
            { trx: tr },
          )

          if (affectedRows > 0) {
            logger.info(`>>> file with id ${deleteThumbnail} was deleted`)
          }

          await Template.query(tr).patch({ thumbnailId: null }).findById(id)
          logger.info('>>> template thumbnailId property updated')
        }

        if (deleteFiles.length > 0) {
          logger.info(
            `>>> existing file/s with id/s ${deleteFiles} will be patched and set to deleted true`,
          )

          const affectedRows = await deleteFilesController(deleteFiles, true, {
            trx: tr,
          })

          if (deleteFiles.length === affectedRows) {
            logger.info(`>>> all files deleted`)
          }
        }

        if (files.length > 0) {
          logger.info(
            `>>> there is/are ${files.length} new file/s to be uploaded for the template`,
          )

          await Promise.all(
            map(files, async file => {
              const { createReadStream: fileReadStream, filename } = await file

              const mimetype = mime.lookup(filename)
              if (!isSupportedAsset(mimetype, 'templates'))
                throw new Error('File extension is not allowed')
              const fileStream = fileReadStream()
              return createFile(fileStream, filename, null, null, [], id, {
                trx: tr,
                forceObjectKeyValue: `templates/${id}/${filename}`,
              })
            }),
          )
        }

        if (thumbnail) {
          logger.info(
            '>>> there is a new thumbnail file to be uploaded for the template',
          )

          const { createReadStream: fileReadStream, filename } = await thumbnail

          const mimetype = mime.lookup(filename)
          if (!isSupportedAsset(mimetype, 'templateThumbnails'))
            throw new Error('File extension is not allowed')
          const fileStream = fileReadStream()

          const newThumbnail = await createFile(
            fileStream,
            filename,
            null,
            null,
            [],
            id,
            { trx: tr },
          )

          logger.info(
            `>>> thumbnail representation created on the db with file id ${newThumbnail.id}`,
          )
          await Template.query(tr)
            .patch({ thumbnailId: newThumbnail.id })
            .findById(id)
        }

        const updatedTemplate = await Template.patchAndFetchById(
          id,
          {
            name,
            author,
            trimSize,
            exportScripts,
            target,
            notes,
          },
          { trx: tr },
        )

        return updatedTemplate
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const deleteTemplate = async (id, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const toBeDeleted = await Template.patchAndFetchById(
          id,
          {
            deleted: true,
          },
          { trx: tr },
        )

        logger.info(
          `>>> template with id ${toBeDeleted.id} patched with deleted set to true`,
        )

        const files = await toBeDeleted.getFiles(tr)
        const fileIds = files.map(file => file.id)
        const thumbnail = await toBeDeleted.getThumbnail(tr)

        if (thumbnail) {
          const affectedRows = await deleteFilesController(
            [thumbnail.id],
            true,
            { trx: tr },
          )

          if (affectedRows > 0) {
            logger.info(`>>> thumbnail with id ${thumbnail.id} deleted`)
          }
        }

        logger.info(`>>> ${files.length} associated files should be deleted`)

        const affectedRows = await deleteFilesController(fileIds, true, {
          trx: tr,
        })

        if (files.length === affectedRows) {
          logger.info(`>>> all the files of this template were deleted`)
        }

        return toBeDeleted
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateTemplateCSSFile = async (id, data, hashed, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const oldFile = await File.findById(id, { trx: tr })
        const { name, objectId } = oldFile

        // const { key,  } =
        //   oldFile.getStoredObjectBasedOnType('original')

        fs.writeFileSync(
          path.join(uploadsPath, 'temp', 'previewer', hashed, name),
          data,
        )

        const fileStream = fs.createReadStream(
          path.join(uploadsPath, 'temp', 'previewer', hashed, name),
        )

        await createFile(fileStream, name, null, null, [], objectId, {
          trx: tr,
          forceObjectKeyValue: `templates/${objectId}/${name}`,
        })
        await fs.remove(path.join(uploadsPath, 'temp', 'previewer', hashed))
        return Template.findById(objectId, { trx: tr })
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getExportScripts = async (scope = undefined) => {
  try {
    let res = []

    if (!scripts || scripts.length === 0) {
      return res
    }

    if (!scope) {
      res = scripts.map(script => ({
        label: `${script.label} (${script.scope})`,
        value: `${script.label}-${script.scope}`,
        scope: script.scope,
      }))
      return res
    }

    forEach(scripts, script => {
      if (script.scope.toLowerCase() === scope.toLowerCase()) {
        res.push({
          label: `${script.label} (${script.scope})`,
          value: `${script.label}-${script.scope}`,
          scope: script.scope,
        })
      }
    })
    return res
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  cloneTemplate,
  updateTemplate,
  deleteTemplate,
  updateTemplateCSSFile,
  getExportScripts,
}
