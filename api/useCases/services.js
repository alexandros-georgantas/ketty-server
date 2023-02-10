const fs = require('fs-extra')
const config = require('config')
const get = require('lodash/get')
const path = require('path')
const FormData = require('form-data')
const crypto = require('crypto')
const { callMicroservice } = require('@coko/server')

const uploadsDir = get(config, ['pubsweet-server', 'uploads'], 'uploads')

const { ServiceCallbackToken } = require('../../data-model/src').models

const {
  saveDataLocally,
  writeLocallyFromReadStream,
  zipper,
} = require('../helpers/utils')

const { uploadFile, signURL, deleteFiles } = require('./objectStorage')

// CONSTS
const EPUBCHECKER = 'epub-checker'
const ICML = 'icml'
const PAGEDJS = 'pagedjs'
const XSWEET = 'xsweet'

const services = config.get('services')

const getServerURL = which => {
  if (!services) {
    throw new Error('services are undefined')
  }

  const service = get(services, `${which}`)

  if (!service) {
    throw new Error(`service ${which} configuration is undefined `)
  }

  const { port, protocol, host } = service
  const serverUrl = `${protocol}://${host}${port ? `:${port}` : ''}`
  return serverUrl
}

const epubcheckerHandler = async epubPath => {
  const deconstruct = epubPath.split('/')
  const epubName = deconstruct[deconstruct.length - 1]

  const { original } = await uploadFile(
    fs.createReadStream(epubPath),
    epubName,
    'application/epub+zip',
  )

  const EPUBPath = await signURL('getObject', original.key)

  return new Promise((resolve, reject) => {
    callMicroservice(EPUBCHECKER, {
      method: 'post',
      url: `${getServerURL(EPUBCHECKER)}/api/epubchecker/link`,
      data: { EPUBPath },
    })
      .then(async ({ data }) => {
        await deleteFiles([original.key])
        resolve(data)
      })
      .catch(async err => {
        await deleteFiles([original.key])
        const { response } = err

        if (!response) {
          return reject(new Error(`Request failed with message: ${err.code}`))
        }

        const { status, data } = response
        const { msg } = data

        return reject(
          new Error(`Request failed with status ${status} and message: ${msg}`),
        )
      })
  })
}

const icmlHandler = async icmlTempPath => {
  const form = new FormData()
  form.append('html', fs.createReadStream(`${icmlTempPath}/index.html`))

  return new Promise((resolve, reject) => {
    callMicroservice(ICML, {
      method: 'post',
      url: `${getServerURL(ICML)}/api/htmlToICML`,
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
          new Error(`Request failed with status ${status} and message: ${msg}`),
        )
      })
  })
}

const pdfHandler = async (zipPath, outputPath, PDFFilename) => {
  const form = new FormData()
  form.append('zip', fs.createReadStream(`${zipPath}`))
  form.append('onlySourceStylesheet', 'true')

  return new Promise((resolve, reject) => {
    callMicroservice(PAGEDJS, {
      method: 'post',
      url: `${getServerURL(PAGEDJS)}/api/htmlToPDF`,
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
          new Error(`Request failed with status ${status} and message: ${msg}`),
        )
      })
  })
}

const xsweetHandler = async (bookComponentId, filePath) => {
  try {
    const form = new FormData()
    form.append('docx', fs.createReadStream(filePath))
    form.append('objectId', bookComponentId)

    const serviceCallbackToken = await ServiceCallbackToken.query().insert({
      bookComponentId,
      responseToken: crypto.randomBytes(32).toString('hex'),
    })

    const { responseToken, id: serviceCallbackTokenId } = serviceCallbackToken
    form.append('responseToken', responseToken)
    form.append('serviceCallbackTokenId', serviceCallbackTokenId)
    const publicURL = config.get('pubsweet-server.publicURL')

    form.append('callbackURL', `${publicURL}/api/xsweet`)

    return new Promise((resolve, reject) => {
      callMicroservice(XSWEET, {
        method: 'post',
        url: `${getServerURL(XSWEET)}/api/v1/async/DOCXToHTML`,
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

const pagedPreviewerLinkHandler = async dirPath => {
  const zipPath = await zipper(
    path.join(`${process.cwd()}`, uploadsDir, 'temp', 'previewer', dirPath),
  )

  const form = new FormData()
  form.append('zip', fs.createReadStream(`${zipPath}`))

  return new Promise((resolve, reject) => {
    callMicroservice(PAGEDJS, {
      method: 'post',
      url: `${getServerURL(PAGEDJS)}/api/getPreviewerLink`,
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
          new Error(`Request failed with status ${status} and message: ${msg}`),
        )
      })
  })
}

module.exports = {
  epubcheckerHandler,
  icmlHandler,
  xsweetHandler,
  pdfHandler,
  pagedPreviewerLinkHandler,
}
