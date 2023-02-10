const { logger, useTransaction } = require('@coko/server')
const orderBy = require('lodash/orderBy')
const map = require('lodash/map')
const find = require('lodash/find')

const path = require('path')

const { writeFileSync, createReadStream } = require('fs')
const fs = require('fs-extra')
const config = require('config')
const mime = require('mime-types')

const uploadsPath = config.get('pubsweet-server').uploads
const { Template, File } = require('../../data-model/src').models

const { mimetypeHelpers } = require('../../common')

const { isSupportedAsset } = mimetypeHelpers

const { createFile } = require('./file')
const { uploadFile, locallyDownloadFile } = require('./objectStorage')

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
          const templates = await Template.query(tr).where('deleted', false)

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
          return Template.query(tr)
            .where('deleted', false)
            .andWhere('target', target)
            .andWhere('notes', notes)
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
    return useTransaction(async tr => Template.query(tr).findById(id), {
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
        const newTemplate = await Template.query(tr).insert({
          name,
          author,
          target,
          notes,
          trimSize,
          exportScripts,
        })

        logger.info(`>>> new template created with id ${newTemplate.id}`)

        if (files.length > 0) {
          logger.info(
            `>> there is/are ${files.length} file/s to be uploaded for the template`,
          )
          await Promise.all(
            map(files, async file => {
              const {
                createReadStream: fileReadStream,
                filename,
                encoding,
              } = await file

              const mimetype = mime.lookup(filename)
              if (!isSupportedAsset(mimetype, 'templates'))
                throw new Error('File extension is not allowed')
              const fileStream = fileReadStream()

              const { original } = await uploadFile(
                fileStream,
                filename,
                mimetype,
                encoding,
                `templates/${newTemplate.id}/${filename}`,
              )

              const { key, location, metadata, size, extension } = original
              return createFile(
                { name: filename, size, mimetype, metadata, extension },
                { location, key },
                'template',
                newTemplate.id,
                { trx: tr },
              )
            }),
          )
        }

        if (thumbnail) {
          logger.info(
            '>>> there is a thumbnail file to be uploaded for the template',
          )

          const {
            createReadStream: fileReadStream,
            filename,
            encoding,
          } = await thumbnail

          const mimetype = mime.lookup(filename)
          if (!isSupportedAsset(mimetype, 'templateThumbnails'))
            throw new Error('File extension is not allowed')
          const fileStream = fileReadStream()

          const { original } = await uploadFile(
            fileStream,
            filename,
            mimetype,
            encoding,
          )

          logger.info('>>> thumbnail uploaded to the server')
          const { key, location, metadata, size, extension } = original

          const newThumbnail = await createFile(
            { name: filename, size, mimetype, metadata, extension },
            { location, key },
            'template',
            newTemplate.id,
            { trx: tr },
          )

          logger.info(
            `>>> thumbnail representation created on the db with file id ${newThumbnail.id}`,
          )
          await Template.query(tr)
            .patch({ thumbnailId: newThumbnail.id })
            .findById(newTemplate.id)
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

        const template = await Template.query(tr).findById(id)

        const newTemplate = await Template.query(tr).insert({
          name,
          author: template.author,
          target: template.target,
          trimSize: template.trimSize,
          exportScripts: template.exportScripts,
          notes: template.notes,
          referenceId: template.id,
        })

        logger.info(`>>> new template created with id ${newTemplate.id}`)

        const files = await File.query(tr)
          .where('templateId', id)
          .andWhere({ deleted: false })

        await Promise.all(
          map(files, async file => {
            const { objectKey, name: fName, mimetype, extension } = file
            const filepath = path.join(tempFolder, `${fName}.${extension}`)

            if (mimetype === 'text/css') {
              writeFileSync(filepath, cssFile)
            } else {
              await locallyDownloadFile(objectKey, filepath)
            }

            const fileStream = createReadStream(filepath)

            const { original } = await uploadFile(
              fileStream,
              `${fName}.${extension}`,
              mimetype,
              undefined,
              `templates/${newTemplate.id}/${fName}.${extension}`,
            )

            const { key, location, metadata, size } = original

            const newFile = await createFile(
              {
                name: `${fName}.${extension}`,
                size,
                mimetype,
                metadata,
                extension,
              },
              { location, key },
              'template',
              newTemplate.id,
              { trx: tr },
            )

            logger.info(
              `>>> the path the the files will be stored is ${filepath}`,
            )
            logger.info(
              `>>> file representation created on the db with file id ${newFile.id}`,
            )

            if (template.thumbnailId === file.id) {
              await Template.query(tr).patchAndFetchById(newTemplate.id, {
                thumbnailId: newFile.id,
              })
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

          const deletedThumbnail = await File.query(tr).patchAndFetchById(
            deleteThumbnail,
            { deleted: true },
          )

          logger.info(`>>> file with id ${deletedThumbnail.id} was patched`)
          await Template.query(tr).patch({ thumbnailId: null }).findById(id)
          logger.info('>>> template thumbnailId property updated')
        }

        if (deleteFiles.length > 0) {
          logger.info(
            `>>> existing file/s with id/s ${deleteFiles} will be patched and set to deleted true`,
          )
          await Promise.all(
            map(deleteFiles, async fileId => {
              const deletedFile = await File.query(tr).patchAndFetchById(
                fileId,
                {
                  deleted: true,
                },
              )

              logger.info(`>>> file with id ${deletedFile.id} was patched`)
            }),
          )
        }

        if (files.length > 0) {
          logger.info(
            `>>> there is/are ${files.length} new file/s to be uploaded for the template`,
          )

          await Promise.all(
            map(files, async file => {
              const {
                createReadStream: fileReadStream,
                filename,
                encoding,
              } = await file

              const mimetype = mime.lookup(filename)
              if (!isSupportedAsset(mimetype, 'templates'))
                throw new Error('File extension is not allowed')
              const fileStream = fileReadStream()

              const { original } = await uploadFile(
                fileStream,
                filename,
                mimetype,
                encoding,
                `templates/${id}/${filename}`,
              )

              const { key, location, metadata, size, extension } = original
              return createFile(
                { name: filename, size, mimetype, metadata, extension },
                { location, key },
                'template',
                id,
                { trx: tr },
              )
            }),
          )
        }

        if (thumbnail) {
          logger.info(
            '>>> there is a new thumbnail file to be uploaded for the template',
          )

          const {
            createReadStream: fileReadStream,
            filename,
            encoding,
          } = await thumbnail

          const mimetype = mime.lookup(filename)
          if (!isSupportedAsset(mimetype, 'templateThumbnails'))
            throw new Error('File extension is not allowed')
          const fileStream = fileReadStream()

          const { original } = await uploadFile(
            fileStream,
            filename,
            mimetype,
            encoding,
          )

          logger.info('>>> thumbnail uploaded to the server')
          const { key, location, metadata, size, extension } = original

          const newThumbnail = await createFile(
            { name: filename, size, mimetype, metadata, extension },
            { location, key },
            'template',
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

        const updatedTemplate = await Template.query(tr).patchAndFetchById(id, {
          name,
          author,
          trimSize,
          exportScripts,
          target,
          notes,
        })

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
        const toBeDeleted = await Template.query(tr).patchAndFetchById(id, {
          deleted: true,
        })

        logger.info(
          `>>> template with id ${toBeDeleted.id} patched with deleted set to true`,
        )

        const files = await toBeDeleted.getFiles(tr)
        const thumbnail = await toBeDeleted.getThumbnail(tr)

        if (thumbnail) {
          const deletedThumbnail = await File.query(tr).patchAndFetchById(
            thumbnail.id,
            {
              deleted: true,
            },
          )

          logger.info(
            `>>> thumbnail with id ${deletedThumbnail.id} patched with deleted set to true`,
          )
        }

        logger.info(
          `>>> ${files.length} associated files should be patched with deleted set to true`,
        )
        await Promise.all(
          map(files, async file => {
            try {
              const deletedFile = await File.query(tr).patchAndFetchById(
                file.id,
                {
                  deleted: true,
                },
              )

              logger.info(
                `>>> file with id ${deletedFile.id} patched with deleted set to true`,
              )
              return deletedFile
            } catch (e) {
              throw new Error(e)
            }
          }),
        )
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
        const oldFile = await File.query(tr).patchAndFetchById(id, {
          deleted: true,
        })

        const { mimetype, name, extension, templateId } = oldFile

        fs.writeFileSync(
          path.join(
            uploadsPath,
            'temp',
            'previewer',
            hashed,
            `${name}.${extension}`,
          ),
          data,
        )

        const fileStream = createReadStream(
          path.join(
            uploadsPath,
            'temp',
            'previewer',
            hashed,
            `${name}.${extension}`,
          ),
        )

        const { original } = await uploadFile(
          fileStream,
          `${name}.${extension}`,
          mimetype,
          undefined,
          `templates/${templateId}/${name}.${extension}`,
        )

        const { key, location, metadata, size } = original
        await createFile(
          { name: `${name}.${extension}`, size, mimetype, metadata, extension },
          { location, key },
          'template',
          templateId,
          { trx: tr },
        )
        await fs.remove(path.join(uploadsPath, 'temp', 'previewer', hashed))
        return Template.query(tr).findById(templateId)
      },
      { trx },
    )
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
}
