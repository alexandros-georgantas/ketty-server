const cheerio = require('cheerio')
const find = require('lodash/find')

const fileStorageImageGatherer = book => {
  const images = []
  book.divisions.forEach(division => {
    division.bookComponents.forEach(bookComponent => {
      const { content } = bookComponent
      const $ = cheerio.load(content)

      $('img').each((_, node) => {
        const $node = $(node)

        if ($node.attr('data-fileid')) {
          images.push($node.attr('data-fileid'))
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
        const { url, alt } = correspondingFile

        $elem.attr('src', url)

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
  fileStorageImageGatherer,
  imageFinder,
  replaceImageSource,
}
