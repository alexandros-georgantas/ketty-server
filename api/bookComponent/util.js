const cheerio = require('cheerio')
const find = require('lodash/find')

const { useCaseGetContentFiles } = require('../useCases')

const replaceImageSrc = async content => {
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
    const files = await useCaseGetContentFiles(fileIds)

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
  extractFragmentProperties: fileName => {
    const nameSpecifier = fileName.slice(0, 1)

    let label

    if (nameSpecifier === 'a') {
      label = 'Frontmatter'
    } else if (nameSpecifier === 'w') {
      label = 'Backmatter'
    } else {
      label = 'Body'
    }

    let componentType

    if (label !== 'Body') {
      componentType = 'component'
    } else if (fileName.includes('00')) {
      componentType = 'unnumbered'
    } else if (fileName.includes('pt0')) {
      componentType = 'part'
    } else {
      componentType = 'chapter'
    }

    return {
      label,
      componentType,
    }
  },
  replaceImageSrc,
}
