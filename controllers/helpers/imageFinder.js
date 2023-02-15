const cheerio = require('cheerio')

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

module.exports = imageFinder
