const cheerio = require('cheerio')
const config = require('config')

const paginationExtractor = pagination => {
  const both = pagination.left && pagination.right

  if (both) {
    return 'start-left start-right'
  }

  if (pagination.left) {
    return 'start-left'
  }

  if (pagination.right) {
    return 'start-right'
  }

  return ''
}

const featureBookStructureEnabled =
  config.has('featureBookStructure') &&
  ((config.get('featureBookStructure') &&
    JSON.parse(config.get('featureBookStructure'))) ||
    false)

const featurePODEnabled =
<<<<<<< HEAD
  config.has('featurePOD') &&
  ((config.get('featurePOD') && JSON.parse(config.get('featurePOD'))) || false)
=======
  (process.env.FEATURE_POD && JSON.parse(process.env.FEATURE_POD)) || false
>>>>>>> 5fa4175 (feat(*): for POD client auto generate copyright page)

const runningHeadersGenerator = (runningHeadersLeft, runningHeadersRight) => {
  if (!featureBookStructureEnabled) {
    return `<div class="running-left">${runningHeadersLeft || '&#xA0;'}</div>
        <div class="running-right">${runningHeadersRight || '&#xA0;'}</div>`
  }

  return ''
}

const generateContainer = (
  bookComponent,
  firstInBody = false,
  level = undefined,
) => {
  const {
    id,
    title,
    componentType,
    runningHeadersLeft,
    runningHeadersRight,
    pagination,
    division,
    number,
    includeInTOC,
  } = bookComponent

  let output
  const levelClass = level ? `level-${level}` : undefined

  if (componentType === 'toc') {
    output = cheerio.load(
      `<section id="comp-number-${id}"  class="component-${division} ${componentType} ${
        !featureBookStructureEnabled ? paginationExtractor(pagination) : ''
      }">${runningHeadersGenerator(
        runningHeadersLeft,
        runningHeadersRight,
      )}<header><h1 class="component-title">${title}</h1></header><nav>
      <ol id="toc-ol"></ol></nav></section>`,
    )
  } else if (componentType === 'endnotes') {
    output = cheerio.load(
      `<section id="comp-number-${id}"  class="$component-${division} ${componentType} ${
        !featureBookStructureEnabled ? paginationExtractor(pagination) : ''
      }">${runningHeadersGenerator(runningHeadersLeft, runningHeadersRight)}
      <header><h1 class="component-title">${title}</h1></header></section>`,
    )
  } else {
    let componentNumber

    if (componentType === 'chapter' || componentType === 'part') {
      componentNumber = `<span class="${componentType}-number">${number}</span>`
    }

    output = cheerio.load(
      `<section id="comp-number-${id}"  class="component-${division} ${
        levelClass || ''
      } ${componentType} ${
        !featureBookStructureEnabled ? paginationExtractor(pagination) : ''
      } ${!includeInTOC ? 'toc-ignore' : ''}">${
        firstInBody ? '<span class="restart-numbering"></span>' : ''
      }${runningHeadersGenerator(
        runningHeadersLeft,
        runningHeadersRight,
      )}<header>${componentNumber || ''}</header></section>`,
    )
  }

  return output('body').html()
}

const generatePagedjsContainer = bookTitle => {
  const output = cheerio.load(
    `<!DOCTYPE html><html><head><title>${bookTitle}</title>
    <meta charset="UTF-8"></head><body class="hyphenate" lang="en-us"></body></html>`,
  )

  return output.html()
}

<<<<<<< HEAD
const generateTitlePage = (
  bookComponent,
  subtitle = undefined,
  authors = [],
) => {
  const {
    id,
    componentType,
    division,
    pagination,
    runningHeadersLeft,
    runningHeadersRight,
    title,
  } = bookComponent

  const output = cheerio.load(
    `<section id="comp-number-${id}" class="component-${division} ${componentType} ${
      !featurePODEnabled ? paginationExtractor(pagination) : ''
    }">${runningHeadersGenerator(
      runningHeadersLeft,
      runningHeadersRight,
    )}<header>
        ${title ? `<h1 class="component-title">${title}</h1>` : 'Untitled'}
        ${subtitle ? `<h2 class="component-subtitle">${subtitle}</h2>` : ''}
        ${authors ? `<h2 class="component-subtitle">${authors}</h2>` : ''}
      </header>
    </section>`,
  )

  return output('body').html()
}

=======
>>>>>>> 5fa4175 (feat(*): for POD client auto generate copyright page)
const generateCopyrightsPage = (bookComponent, podMetadata) => {
  const {
    id,
    componentType,
    division,
    pagination,
    runningHeadersLeft,
    runningHeadersRight,
    title,
  } = bookComponent

  const output = cheerio.load(
    `<section id="comp-number-${id}"  class="component-${division} ${componentType} ${
<<<<<<< HEAD
      !featurePODEnabled ? paginationExtractor(pagination) : ''
    }">${runningHeadersGenerator(
      runningHeadersLeft,
      runningHeadersRight,
    )}<header><h1 class="component-title">${
      title || 'Copyrights'
    }</h1></header></section>`,
=======
      !featureBookStructureEnabled ? paginationExtractor(pagination) : ''
    }">${runningHeadersGenerator(
      runningHeadersLeft,
      runningHeadersRight,
    )}<header><h1 class="component-title">${title}</h1></header></section>`,
>>>>>>> 5fa4175 (feat(*): for POD client auto generate copyright page)
  )

  return output.html()
}

module.exports = {
  generatePagedjsContainer,
  generateContainer,
<<<<<<< HEAD
  generateTitlePage,
=======
>>>>>>> 5fa4175 (feat(*): for POD client auto generate copyright page)
  generateCopyrightsPage,
}
