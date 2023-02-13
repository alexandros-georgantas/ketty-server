const cheerio = require('cheerio')
const find = require('lodash/find')
const { getContentFiles } = require('../file.controller')

const replaceImageSource = async content => {
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
    const files = await getContentFiles(fileIds)

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

module.exports = replaceImageSource
