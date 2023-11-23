const cheerio = require('cheerio')

// const bookConstructor = require('./bookConstructor')
const { generatePagedjsContainer } = require('./htmlGenerators')

const createBookHTML = async book => {
  // const book = await bookConstructor(book.id)

  // console.log('the book', book)

  book.divisions.forEach(division => {
    // console.log('d comps', division.bookComponents)

    division.bookComponents.forEach(bookComponent => {
      const { content } = bookComponent
      // console.log('before load')
      // console.log(content)
      const $ = cheerio.load(content)

      // console.log('before img')

      $('img').each((_, node) => {
        const $node = $(node)
        const dataFileId = $node.attr('data-fileid')
        const srcExists = $node.attr('src')

        if (dataFileId) {
          if (srcExists) {
            $node.removeAttr('src') // remove src as it is irrelevant/volatile info
          }
        }
      })

      // console.log('after img')

      $('figure').each((_, node) => {
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

    // console.log('after fig')
  })

  const output = cheerio.load(generatePagedjsContainer(book.title))
  // console.log('after output')

  book.divisions.forEach(division => {
    division.bookComponents.forEach(bc => {
      const { content } = bc
      output('body').append(content)
    })
  })

  // console.log('before html')

  return output.html()
}

module.exports = createBookHTML
