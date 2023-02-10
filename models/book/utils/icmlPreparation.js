const cheerio = require('cheerio')
const fs = require('fs-extra')
const path = require('path')
const mime = require('mime-types')
const map = require('lodash/map')

const { writeFile } = require('./filesystem')

const { getFile } = require('../file')
const { locallyDownloadFile } = require('../objectStorage')

const { generatePagedjsContainer } = require('./htmlGenerators')
const { objectKeyExtractor } = require('../../../common')
const { imageGatherer } = require('./gatherImages')

const icmlPreparation = async (book, tempFolderPath) => {
  try {
    const images = []

    await fs.ensureDir(tempFolderPath)
    const gatheredImages = imageGatherer(book)
    const originalImageLinkMapper = {}

    await Promise.all(
      map(gatheredImages, async image => {
        const { currentObjectKey, fileId } = image
        const file = await getFile(fileId)
        const { objectKey } = file
        originalImageLinkMapper[currentObjectKey] = objectKey
        return true
      }),
    )
    book.divisions.forEach(division => {
      division.bookComponents.forEach(bookComponent => {
        const { content, id } = bookComponent
        const $ = cheerio.load(content)

        $('img[src]').each((index, node) => {
          const $node = $(node)
          const constructedId = `image-${id}-${index}`

          const url = $node.attr('src')
          const objectKey = objectKeyExtractor(url)
          const extension = path.extname(objectKey)
          const mimetype = mime.lookup(objectKey)
          const target = `${tempFolderPath}/${originalImageLinkMapper[objectKey]}`

          images.push({
            id: constructedId,
            objectKey: originalImageLinkMapper[objectKey],
            target,
            mimetype,
            extension,
          })

          $node.attr('src', `./${originalImageLinkMapper[objectKey]}`)
        })
        $('figure').each((index, node) => {
          const $node = $(node)
          const srcExists = $node.attr('src')

          if (srcExists) {
            $node.removeAttr('src')
          }
        })
        /* eslint-disable no-param-reassign */
        bookComponent.content = $.html('body')
        /* eslint-enable no-param-reassign */
      })
    })

    await Promise.all(
      map(images, async image => {
        const { objectKey, target } = image
        return locallyDownloadFile(objectKey, target)
      }),
    )
    const output = cheerio.load(generatePagedjsContainer(book.title))
    book.divisions.forEach(division => {
      division.bookComponents.forEach(bookComponent => {
        const { content } = bookComponent
        output('body').append(content)
      })
    })

    await writeFile(`${tempFolderPath}/index.html`, output.html())
    return true
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { icmlPreparation }
