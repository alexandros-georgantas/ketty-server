const { pubsubManager } = require('@coko/server')
const fs = require('fs-extra')
const config = require('config')
const mime = require('mime-types')
const get = require('lodash/get')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')
const { readFile } = require('../../utilities/filesystem')
const { xsweetImagesHandler } = require('../../utilities/image')

const { BookComponent, ServiceCallbackToken } = require('../../models').models

const {
  BOOK_COMPONENT_UPLOADING_UPDATED,
  BOOK_COMPONENT_DELETED,
} = require('../graphql/bookComponent/constants')

const {
  updateContent,
  updateUploading,
  deleteBookComponent,
  getBookComponent,
} = require('../../controllers/bookComponent.controller')

const RESTEndpoints = app => {
  app.use('/api/xsweet', async (req, res) => {
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
        throw new Error('error in xsweet conversion')
      }

      const { result: serviceCallbackToken } = await ServiceCallbackToken.find({
        id: serviceCallbackTokenId,
        responseToken,
        bookComponentId,
      })

      if (serviceCallbackToken.length !== 1) {
        throw new Error('unknown service token or conflict')
      }

      const contentWithImagesHandled = await xsweetImagesHandler(
        convertedContent,
        bookComponentId,
      )

      const uploading = false
      await updateContent(bookComponentId, contentWithImagesHandled, 'en')

      await updateUploading(bookComponentId, uploading)
      const updatedBookComponent = await BookComponent.findById(bookComponentId)
      await ServiceCallbackToken.deleteById(serviceCallbackTokenId)

      await pubsub.publish(BOOK_COMPONENT_UPLOADING_UPDATED, {
        bookComponentUploadingUpdated: updatedBookComponent,
      })

      return res.status(200).json({
        msg: 'ok',
      })
    } catch (error) {
      // the service will not care if something went wrong in Ketida
      const pubsub = await pubsubManager.getPubsub()
      const { body } = req

      const { objectId: bookComponentId } = body
      res.status(200).json({
        msg: 'ok',
      })
      const bookComp = await getBookComponent(bookComponentId)

      await deleteBookComponent(bookComp)
      await pubsub.publish(BOOK_COMPONENT_DELETED, {
        bookComponentDeleted: { id: bookComponentId },
      })
      // throw something which will only be displayed in server's logs
      throw new Error(error)
    }
  })
  app.use('/api/fileserver/cleanup/:scope/:hash', async (req, res, next) => {
    const { scope, hash } = req.params
    const path = `${process.cwd()}/${uploadsDir}/${scope}/${hash}`

    try {
      await fs.remove(path)
      res.end()
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
  app.use('/api/fileserver/:scope/:location/:file', async (req, res, next) => {
    const { location, file } = req.params

    try {
      const path = `${process.cwd()}/${uploadsDir}/temp/previewer/${location}/${file}`

      if (fs.existsSync(path)) {
        const mimetype = mime.lookup(path)
        const fileContent = await readFile(path, 'binary')
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

module.exports = RESTEndpoints
