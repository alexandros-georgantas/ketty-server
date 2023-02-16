const cheerio = require('cheerio')
const find = require('lodash/find')

const objectKeyExtractor = url => {
  const stage1 = url.split('?')
  const stage2 = stage1[0].split('/')
  const objectKey = stage2[stage2.length - 1]

  return objectKey
}

const imageGatherer = book => {
  const images = []
  book.divisions.forEach((division, divisionId) => {
    division.bookComponents.forEach((bookComponent, bookComponentId) => {
      const { content } = bookComponent
      const $ = cheerio.load(content)

      $('img[src]').each((index, node) => {
        const $node = $(node)

        const url = $node.attr('src')

        if (!url.includes('data:image')) {
          if ($node.attr('data-fileid')) {
            images.push({
              currentObjectKey: objectKeyExtractor(url),
              fileId: $node.attr('data-fileid'),
            })
          }
        }
      })
    })
  })
  return images
}

const imageFinder = (content, fileId) => {
  let found = false

  if (content && content.length > 0) {
    const $ = cheerio.load(content)

    $('img').each((i, elem) => {
      const $elem = $(elem)
      const fId = $elem.attr('data-fileid')

      if (fId === fileId) {
        found = true
      }
    })
  }

  return found
}

const replaceImageSource = async (content, filesFetcher) => {
  const $ = cheerio.load(content)
  const fileIds = []

  $('img').each((i, elem) => {
    const $elem = $(elem)
    const fileId = $elem.attr('data-fileid')

    if (fileId && fileId !== 'null') {
      fileIds.push(fileId)
    }
  })

  if (fileIds.length > 0) {
    const files = await filesFetcher(fileIds)

    $('img').each((i, elem) => {
      const $elem = $(elem)
      const fileId = $elem.attr('data-fileid')

      const correspondingFile = find(files, { id: fileId })

      if (correspondingFile) {
        const { source, alt } = correspondingFile

        $elem.attr('src', source)

        if (alt) {
          $elem.attr('alt', alt)
        }
      } else {
        $elem.attr('src', '')
        $elem.attr('alt', '')
      }
    })
  }

  return $('body').html()
}

module.exports = {
  objectKeyExtractor,
  imageGatherer,
  imageFinder,
  replaceImageSource,
}
