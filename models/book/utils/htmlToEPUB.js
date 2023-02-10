const cheerio = require('cheerio')
const path = require('path')
const builder = require('xmlbuilder')
const fs = require('fs-extra')
const tidy = require('libtidy-updated')
const mime = require('mime-types')
const map = require('lodash/map')
const filter = require('lodash/filter')
const beautify = require('js-beautify').html

const { writeFile, readFile } = require('./filesystem')
const { epubDecorator, fixFontFaceUrls } = require('./converters')

const { locallyDownloadFile, signURL } = require('../objectStorage')
const { imageGatherer } = require('./gatherImages')
const { objectKeyExtractor } = require('../../../common')

let images = []
let stylesheets = []
let fonts = []
let xhtmls = []

const createEPUBFolder = async EPUBtempFolderAssetsPath => {
  try {
    const result = {}
    await fs.ensureDir(EPUBtempFolderAssetsPath)
    result.root = EPUBtempFolderAssetsPath
    const metaPath = path.join(EPUBtempFolderAssetsPath, 'META-INF')
    await fs.ensureDir(metaPath)
    result.metaInf = metaPath
    const oebpsPath = path.join(EPUBtempFolderAssetsPath, 'OEBPS')
    await fs.ensureDir(oebpsPath)
    result.oebps = oebpsPath
    const imagesPath = path.join(oebpsPath, 'Images')
    await fs.ensureDir(imagesPath)
    result.images = imagesPath
    const fontsPath = path.join(oebpsPath, 'Fonts')
    await fs.ensureDir(fontsPath)
    result.fonts = fontsPath
    const stylesPath = path.join(oebpsPath, 'Styles')
    await fs.ensureDir(stylesPath)
    result.styles = stylesPath
    const textPath = path.join(oebpsPath, 'Text')
    await fs.ensureDir(textPath)
    result.texts = textPath

    return result
  } catch (e) {
    throw new Error(e)
  }
}

const createMimetype = async rootPath => {
  try {
    return writeFile(`${rootPath}/mimetype`, 'application/epub+zip')
  } catch (e) {
    throw new Error(e)
  }
}

const createContainer = async metaInfPath => {
  try {
    const container = builder
      .create(
        {
          container: {
            '@xmlns': 'urn:oasis:names:tc:opendocument:xmlns:container',
            '@version': '1.0',
            rootfiles: {
              rootfile: {
                '@full-path': 'OEBPS/content.opf',
                '@media-type': 'application/oebps-package+xml',
              },
            },
          },
        },
        { encoding: 'UTF-8' },
      )
      .end({
        pretty: true,
      })

    return writeFile(`${metaInfPath}/container.xml`, container)
  } catch (e) {
    throw new Error(e)
  }
}

const gatherAssets = async (book, templateFiles, epubFolder) => {
  for (let i = 0; i < templateFiles.length; i += 1) {
    const { id: dbId, objectKey, mimetype, extension, name } = templateFiles[i]
    const originalFilename = `${name}.${extension}`

    if (templateFiles[i].mimetype === 'text/css') {
      const target = `${epubFolder.styles}/${originalFilename}`
      const id = `stylesheet-${dbId}-${i}`
      stylesheets.push({
        id,
        objectKey,
        target,
        mimetype,
        originalFilename,
        extension,
      })
    } else {
      const target = `${epubFolder.fonts}/${originalFilename}`
      const id = `font-${dbId}-${i}`
      fonts.push({
        id,
        objectKey,
        target,
        mimetype,
        originalFilename,
        extension,
      })
    }
  }

  if (stylesheets.length === 0) {
    throw new Error(
      'No stylesheet file exists in the selected template, export aborted',
    )
  }

  const gatheredImages = imageGatherer(book)
  const freshImageLinkMapper = {}

  await Promise.all(
    map(gatheredImages, async image => {
      const { currentObjectKey } = image
      freshImageLinkMapper[currentObjectKey] = await signURL(
        'getObject',
        currentObjectKey,
      )
      return true
    }),
  )

  book.divisions.forEach((division, divisionId) => {
    division.bookComponents.forEach((bookComponent, bookComponentId) => {
      const { content, id } = bookComponent
      const $ = cheerio.load(content)

      $('img[src]').each((index, node) => {
        const $node = $(node)
        const constructedId = `image-${id}-${index}`
        const url = $node.attr('src')
        const objectKey = objectKeyExtractor(url)
        const extension = path.extname(objectKey)
        const mimetype = mime.lookup(objectKey)
        const target = `${epubFolder.images}/${objectKey}`

        images.push({
          id: constructedId,
          objectKey,
          target,
          mimetype,
          extension,
        })

        $node.attr('src', `../Images/${objectKey}`)
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
}

const transferAssets = async (imagesParam, stylesheetsParam, fontsParam) => {
  try {
    await Promise.all(
      map(imagesParam, async image => {
        const { objectKey, target } = image
        return locallyDownloadFile(objectKey, target)
      }),
    )
    await Promise.all(
      map(stylesheetsParam, async stylesheet => {
        const { objectKey, target } = stylesheet
        return locallyDownloadFile(objectKey, target)
      }),
    )
    await Promise.all(
      map(fontsParam, async font => {
        const { objectKey, target } = font
        return locallyDownloadFile(objectKey, target)
      }),
    )
    const stylesheetContent = await readFile(stylesheets[0].target)
    const fixedCSS = fixFontFaceUrls(stylesheetContent, fonts, '../Fonts')
    await writeFile(`${stylesheets[0].target}`, fixedCSS)
  } catch (e) {
    throw new Error(e)
  }
}

const decorateText = async (book, hasEndnotes) => {
  const backDivision = book.divisions.get('back')
  let endnotesComponent
  let id

  if (hasEndnotes) {
    endnotesComponent = backDivision.bookComponents.get('endnotes')

    if (endnotesComponent) {
      // for the case where there isn't any notes inside of the book
      id = endnotesComponent.id
    }
  }

  book.divisions.forEach((division, divisionId) => {
    division.bookComponents.forEach((bookComponent, bookComponentId) => {
      /* eslint-disable no-param-reassign */
      bookComponent.content = epubDecorator(
        bookComponent,
        book.title,
        stylesheets[0],
        hasEndnotes,
        id,
      )
      /* eslint-enable no-param-reassign */
    })
  })
}

const generateTOCNCX = async (book, epubFolder) => {
  const navPoints = []
  const { metadata } = book
  const { isbn, issn, issnL } = metadata

  const identifier = isbn || issn || issnL
  let counter = 0
  book.divisions.forEach((division, divisionId) => {
    division.bookComponents.forEach((bookComponent, bookComponentId) => {
      const { id, includeInTOC, title, componentType } = bookComponent

      if (includeInTOC) {
        navPoints.push({
          '@id': `nav-${counter}`,
          navLabel: {
            text: {
              '#text': title || componentType,
            },
          },
          content: {
            '@src': `Text/comp-number-${id}.xhtml`,
          },
        })
        counter += 1
      }
    })
  })

  const toc = {
    ncx: {
      '@xmlns': 'http://www.daisy.org/z3986/2005/ncx/',
      '@version': '2005-1',
      head: {
        meta: [
          {
            '@content': `urn:uuid:${identifier || book.id}`,
            '@name': 'dtb:uid',
          },
          {
            '@content': '1',
            '@name': 'dtb:depth',
          },
          {
            '@content': '0',
            '@name': 'dtb:totalPageCount',
          },
          {
            '@content': '0',
            '@name': 'dtb:maxPageNumber',
          },
        ],
      },
      docTitle: {
        text: {
          '#text': book.title,
        },
      },
      navMap: {
        navPoint: navPoints,
      },
    },
  }

  const output = builder.create(toc, { encoding: 'UTF-8' }).end({
    pretty: true,
  })

  return writeFile(`${epubFolder.oebps}/toc.ncx`, output)
}

const generateContentOPF = async (book, epubFolder) => {
  const { metadata, title, updated } = book

  const {
    isbn,
    issn,
    issnL,
    copyrightYear,
    copyrightHolder,
    copyrightStatement,
    authors,
    publicationDate,
  } = metadata

  const spineData = []
  const manifestData = []
  const identifier = isbn || issn || issnL

  const rights = filter(
    [copyrightYear, copyrightHolder, copyrightStatement],
    item => item && item.length > 0,
  ).join('. ')

  const metaTemp = []

  map(authors, (author, index) => {
    metaTemp.push({
      '@scheme': 'marc:relators',
      '@property': 'role',
      '@refines': `#creator${index}`,
      '#text': 'aut',
    })
  })
  metaTemp.push({
    '@property': 'dcterms:modified',
    '#text': updated.toISOString().replace(/\.\d+Z$/, 'Z'),
  })

  book.divisions.forEach((division, divisionId) => {
    division.bookComponents.forEach((bookComponent, bookComponentId) => {
      const { id, componentType, hasMath } = bookComponent
      spineData.push({
        '@idref': `comp-number-${id}`,
      })

      const tempManifestItem = {
        '@href': `Text/comp-number-${id}.xhtml`,
        '@id': `comp-number-${id}`,
        '@media-type': 'application/xhtml+xml',
      }

      if (hasMath) {
        tempManifestItem['@properties'] = 'mathml'
      }

      if (componentType === 'toc') {
        tempManifestItem['@properties'] = 'nav'
      }

      manifestData.push(tempManifestItem)
    })
  })

  for (let i = 0; i < images.length; i += 1) {
    manifestData.push({
      '@href': `Images/${images[i].objectKey}`,
      '@id': `${images[i].id}`,
      '@media-type': `${images[i].mimetype}`,
    })
  }

  for (let i = 0; i < fonts.length; i += 1) {
    manifestData.push({
      '@href': `Fonts/${fonts[i].originalFilename}`,
      '@id': `${fonts[i].id}`,
      '@media-type': `${fonts[i].mimetype}`,
    })
  }

  for (let i = 0; i < stylesheets.length; i += 1) {
    manifestData.push({
      '@href': `Styles/${stylesheets[i].originalFilename}`,
      '@id': `${stylesheets[i].id}`,
      '@media-type': `${stylesheets[i].mimetype}`,
    })
  }

  manifestData.push({
    '@href': `toc.ncx`,
    '@id': 'ncx',
    '@media-type': 'application/x-dtbncx+xml',
  })

  const contentOPF = {
    package: {
      '@prefix':
        'rendition: http://www.idpf.org/vocab/rendition/# schema: http://schema.org/ ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/ a11y: http://www.idpf.org/epub/vocab/package/a11y/#',
      '@xmlns': 'http://www.idpf.org/2007/opf',
      '@version': '3.0',
      '@unique-identifier': 'BookId',
      metadata: {
        '@xmlns:opf': 'http://www.idpf.org/2007/opf',
        '@xmlns:dcterms': 'http://purl.org/dc/terms/',
        '@xmlns:dc': 'http://purl.org/dc/elements/1.1/',
        '@xmlns:ibooks': 'http://apple.com/ibooks/html-extensions',
        'dc:title': { '#text': title },
        'dc:language': { '#text': 'en' },
        'dc:creator': map(authors, (author, index) => ({
          '@id': `creator${index}`,
          '#text': author,
        })),

        meta: metaTemp,
      },
      manifest: { item: manifestData },
      spine: {
        '@toc': 'ncx',
        itemref: spineData,
      },
    },
  }

  if (identifier) {
    contentOPF.package.metadata['dc:identifier'] = {
      '@id': 'BookId',
      '#text': `urn:uuid:${identifier}`,
    }

    metaTemp.push({
      '@refines': '#BookId',
      '@property': 'identifier-type',
      '@scheme': 'onix:codelist5',
      '#text': 15,
    })
  } else {
    contentOPF.package.metadata['dc:identifier'] = {
      '@id': 'BookId',
      '#text': `urn:uuid:${book.id}`,
    }
  }

  if (publicationDate) {
    contentOPF.package.metadata['dc:date'] = {
      '#text': publicationDate,
    }
  }

  if (rights) {
    contentOPF.package.metadata['dc:rights'] = {
      '#text': rights,
    }
  }

  if (copyrightHolder) {
    contentOPF.package.metadata['dc:publisher'] = { '#text': copyrightHolder }
  }

  const output = builder.create(contentOPF, { encoding: 'UTF-8' }).end({
    pretty: true,
  })

  return writeFile(`${epubFolder.oebps}/content.opf`, output)
}

const convertToXML = async content => {
  const options = {
    doctype: 'html5',
    output_xhtml: true,
    force_output: true,
    tidy_mark: false,
    drop_empty_elements: false,
    preserve_entities: true,
  }

  return new Promise((resolve, reject) => {
    tidy.tidyBuffer(content, options, (err, result) => {
      if (err) {
        reject(err)
      } else if (!result.output) {
        reject(new Error('The document failed to parse'))
      } else {
        // console.warn(result.errlog)
        try {
          resolve(result.output.toString())
        } catch (e) {
          console.error(e)
          reject(new Error('There was an error loading the document'))
        }
      }
    })
  })
}

const gatherTexts = async (book, epubFolder) => {
  try {
    book.divisions.forEach((division, divisionId) => {
      division.bookComponents.forEach((bookComponent, bookComponentId) => {
        const { content: dbContent, id, componentType } = bookComponent
        const constructedId = `comp-number-${id}`
        const source = undefined
        const extension = '.xhtml'
        const basename = `${constructedId}.xhtml`
        const filename = `${constructedId}`
        const mimetype = 'application/xhtml+xml'
        const target = `${epubFolder.texts}/${constructedId}.xhtml`
        const tempContent = cheerio.load(dbContent)
        const content = tempContent.xml()

        xhtmls.push({
          id: constructedId,
          source,
          target,
          mimetype,
          basename,
          filename,
          extension,
          componentType,
          content,
        })
      })
    })
  } catch (e) {
    throw new Error(e)
  }
}

const transferTexts = async texts => {
  try {
    await Promise.all(
      map(texts, async text => {
        const { content, target } = text

        const tidyContent = await convertToXML(
          `<?xml version="1.0" encoding="utf-8"?>${content}`,
        )

        return writeFile(target, beautify(tidyContent))
      }),
    )
  } catch (e) {
    throw new Error(e)
  }
}

const cleaner = () => {
  images = []
  stylesheets = []
  fonts = []
  xhtmls = []
}

const htmlToEPUB = async (book, template, EPUBtempFolderAssetsPath) => {
  try {
    const templateFiles = await template.getFiles()
    const hasEndnotes = template.notes === 'endnotes'
    const epubFolder = await createEPUBFolder(EPUBtempFolderAssetsPath)

    await createMimetype(epubFolder.root)
    await createContainer(epubFolder.metaInf)
    await gatherAssets(book, templateFiles, epubFolder)
    await transferAssets(images, stylesheets, fonts)
    await decorateText(book, hasEndnotes)
    await gatherTexts(book, epubFolder)
    await transferTexts(xhtmls)
    await generateTOCNCX(book, epubFolder)
    await generateContentOPF(book, epubFolder)
    cleaner()

    return epubFolder.root
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  htmlToEPUB,
}
