const { pubsubManager } = require('@coko/server')
const fs = require('fs')
const fse = require('fs-extra')
const config = require('config')
const mime = require('mime-types')
const get = require('lodash/get')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const readFile = location =>
  new Promise((resolve, reject) => {
    fs.readFile(location, 'binary', (err, data) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })

const { BookComponent, ServiceCallbackToken } =
  require('../../data-model/src').models

const { BOOK_COMPONENT_UPLOADING_UPDATED } = require('../bookComponent/consts')

const {
  useCaseUpdateBookComponentContent,
  useCaseUpdateUploading,
  useCaseDeleteBookComponent,
} = require('../useCases')

const Controllers = app => {
  app.use('/api/xsweet', async (req, res, next) => {
    try {
      const pubsub = await pubsubManager.getPubsub()
      const { body } = req

      const {
        objectId: bookComponentId,
        responseToken,
        convertedContent,
        serviceCallbackTokenId,
        error,
      } = body

      if (!convertedContent && error) {
        const updatedBookComponent = await BookComponent.findById(
          bookComponentId,
        )

        await useCaseDeleteBookComponent(updatedBookComponent)
        await pubsub.publish(BOOK_COMPONENT_UPLOADING_UPDATED, {
          bookComponentUploadingUpdated: updatedBookComponent,
        })
        throw new Error('error in xsweet conversion')
      }

      const serviceCallbackToken = await ServiceCallbackToken.query().where({
        id: serviceCallbackTokenId,
        responseToken,
        bookComponentId,
      })

      if (serviceCallbackToken.length !== 1) {
        throw new Error('unknown service token or conflict')
      }

      const uploading = false
      await useCaseUpdateBookComponentContent(
        bookComponentId,
        convertedContent,
        'en',
      )

      await useCaseUpdateUploading(bookComponentId, uploading)
      const updatedBookComponent = await BookComponent.findById(bookComponentId)
      await ServiceCallbackToken.query().deleteById(serviceCallbackTokenId)

      await pubsub.publish(BOOK_COMPONENT_UPLOADING_UPDATED, {
        bookComponentUploadingUpdated: updatedBookComponent,
      })

      return res.status(200).json({
        msg: 'ok',
      })
    } catch (error) {
      // the service will not care if something went wrong in Ketida
      res.status(200).json({
        msg: 'ok',
      })
      // throw something which will only be displayed in server's logs
      throw new Error(error)
    }
  })
  app.use('/api/fileserver/cleanup/:scope/:hash', async (req, res, next) => {
    const { scope, hash } = req.params
    const path = `${process.cwd()}/${uploadsDir}/${scope}/${hash}`

    try {
      await fse.remove(path)
      res.end()
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
  app.use('/api/fileserver/:scope/:location/:file', async (req, res, next) => {
    const { location, file } = req.params

    try {
      const path = `${process.cwd()}/${uploadsDir}/temp/previewer/${location}/${file}`

      if (fse.existsSync(path)) {
        const mimetype = mime.lookup(path)
        const fileContent = await readFile(path)
        res.setHeader('Content-Type', `${mimetype}`)
        res.setHeader('Content-Disposition', `attachment; filename=${file}`)
        res.write(fileContent, 'binary')
        res.end()
      } else {
        throw new Error('file was cleaned')
      }
    } catch (error) {
      res.status(500).json({ error })
    }
  })
}

module.exports = Controllers
