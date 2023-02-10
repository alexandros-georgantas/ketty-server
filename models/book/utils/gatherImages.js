const cheerio = require('cheerio')
const { objectKeyExtractor } = require('../../../common')

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

module.exports = { imageGatherer }
