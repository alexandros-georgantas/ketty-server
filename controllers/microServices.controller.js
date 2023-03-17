const { callMicroservice, logger, fileStorage } = require('@coko/server')
const fs = require('fs-extra')
const config = require('config')
const path = require('path')
const crypto = require('crypto')
const get = require('lodash/get')
const FormData = require('form-data')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const ServiceCallbackToken = require('../models/serviceCallbackToken/serviceCallbackToken.model')

const { getURL, upload, deleteFiles: fileStorageDeleteFiles } = fileStorage

const {
  zipper,
  saveDataLocally,
  writeLocallyFromReadStream,
} = require('../utilities/filesystem')

// CONSTANTS
const EPUBCHECKER = 'epubChecker'
const ICML = 'icml'
const PAGEDJS = 'pagedjs'
const XSWEET = 'xsweet'

const services = config.get('services')

const getServiceURL = which => {
  if (!services) {
    throw new Error('services are undefined')
  }

  const service = get(services, `${which}`)

  if (!service) {
    throw new Error(`service ${which} configuration is undefined `)
  }

  const { url } = service

  if (!url) {
    throw new Error(`service ${which} url is undefined `)
  }

  return url
}

const epubcheckerHandler = async epubPath => {
  try {
    const deconstruct = epubPath.split('/')
    const epubName = deconstruct[deconstruct.length - 1]

    const storedObjects = await upload(fs.createReadStream(epubPath), epubName)

    const EPUBPath = await getURL(storedObjects[0].key)

    return new Promise((resolve, reject) => {
      callMicroservice(EPUBCHECKER, {
        method: 'post',
        url: `${getServiceURL(EPUBCHECKER)}/api/epubchecker/link`,
        data: { EPUBPath },
      })
        .then(async ({ data }) => {
          await fileStorageDeleteFiles([storedObjects[0].key])
          resolve(data)
        })
        .catch(async err => {
          await fileStorageDeleteFiles([storedObjects[0].key])
          const { response } = err

          if (!response) {
            return reject(new Error(`Request failed with message: ${err.code}`))
          }

          const { status, data } = response
          const { msg } = data

          return reject(
            new Error(
              `Request failed with status ${status} and message: ${msg}`,
            ),
          )
        })
    })
  } catch (e) {
    logger.error(e.message)
    throw new Error(e.message)
  }
}

const icmlHandler = async icmlTempPath => {
  try {
    const form = new FormData()
    form.append('html', fs.createReadStream(`${icmlTempPath}/index.html`))

    return new Promise((resolve, reject) => {
      callMicroservice(ICML, {
        method: 'post',
        url: `${getServiceURL(ICML)}/api/htmlToICML`,
        headers: {
          ...form.getHeaders(),
        },
        data: form,
      })
        .then(async res => {
          await saveDataLocally(icmlTempPath, 'index.icml', res.data, 'utf-8')
          resolve()
        })
        .catch(async err => {
          const { response } = err

          if (!response) {
            return reject(new Error(`Request failed with message: ${err.code}`))
          }

          const { status, data } = response
          const { msg } = data

          return reject(
            new Error(
              `Request failed with status ${status} and message: ${msg}`,
            ),
          )
        })
    })
  } catch (e) {
    logger.error(e.message)
    throw new Error(e.message)
  }
}

const pdfHandler = async (zipPath, outputPath, PDFFilename) => {
  try {
    const form = new FormData()
    form.append('zip', fs.createReadStream(`${zipPath}`))
    form.append('onlySourceStylesheet', 'true')

    return new Promise((resolve, reject) => {
      callMicroservice(PAGEDJS, {
        method: 'post',
        url: `${getServiceURL(PAGEDJS)}/api/htmlToPDF`,
        headers: {
          ...form.getHeaders(),
        },
        responseType: 'stream',
        data: form,
      })
        .then(async res => {
          await fs.ensureDir(outputPath)
          await writeLocallyFromReadStream(
            outputPath,
            PDFFilename,
            res.data,
            'binary',
          )
          resolve()
        })
        .catch(async err => {
          const { response } = err

          if (!response) {
            return reject(new Error(`Request failed with message: ${err.code}`))
          }

          const { status, data } = response
          const { msg } = data

          return reject(
            new Error(
              `Request failed with status ${status} and message: ${msg}`,
            ),
          )
        })
    })
  } catch (e) {
    logger.error(e.message)
    throw new Error(e.message)
  }
}

const xsweetHandler = async (bookComponentId, filePath) => {
  try {
    const form = new FormData()
    form.append('docx', fs.createReadStream(filePath))
    form.append('objectId', bookComponentId)

    const serviceCallbackToken = await ServiceCallbackToken.insert({
      bookComponentId,
      responseToken: crypto.randomBytes(32).toString('hex'),
    })

    const { responseToken, id: serviceCallbackTokenId } = serviceCallbackToken
    form.append('responseToken', responseToken)
    form.append('serviceCallbackTokenId', serviceCallbackTokenId)
    const serverUrl = config.get('pubsweet-server.serverUrl')

    form.append('callbackURL', `${serverUrl}/api/xsweet`)

    return new Promise((resolve, reject) => {
      callMicroservice(XSWEET, {
        method: 'post',
        url: `${getServiceURL(XSWEET)}/api/v1/async/DOCXToHTML`,
        headers: {
          ...form.getHeaders(),
        },
        data: form,
      })
        .then(async ({ data }) => {
          const { msg } = data
          await fs.remove(filePath)
          resolve(msg)
        })
        .catch(async err => {
          const { response } = err
          await fs.remove(filePath)

          if (!response) {
            return reject(new Error(`Request failed with message: ${err.code}`))
          }

          const { status, data } = response
          const { msg } = data

          return reject(
            new Error(
              `Request failed with status ${status} and message: ${msg}`,
            ),
          )
        })
    })
  } catch (e) {
    throw new Error(e)
  }
}

const pagedPreviewerLink = async dirPath => {
  try {
    const zipPath = await zipper(
      path.join(`${process.cwd()}`, uploadsDir, 'temp', 'previewer', dirPath),
    )

    const form = new FormData()
    form.append('zip', fs.createReadStream(`${zipPath}`))

    return new Promise((resolve, reject) => {
      callMicroservice(PAGEDJS, {
        method: 'post',
        url: `${getServiceURL(PAGEDJS)}/api/getPreviewerLink`,
        headers: {
          ...form.getHeaders(),
        },
        data: form,
      })
        .then(async ({ data }) => {
          await fs.remove(zipPath)
          resolve(data)
        })
        .catch(async err => {
          const { response } = err

          if (!response) {
            return reject(new Error(`Request failed with message: ${err.code}`))
          }

          const { status, data } = response
          const { msg } = data

          return reject(
            new Error(
              `Request failed with status ${status} and message: ${msg}`,
            ),
          )
        })
    })
  } catch (e) {
    logger.error(e.message)
    throw new Error(e.message)
  }
}

module.exports = {
  epubcheckerHandler,
  icmlHandler,
  xsweetHandler,
  pdfHandler,
  pagedPreviewerLink,
}
