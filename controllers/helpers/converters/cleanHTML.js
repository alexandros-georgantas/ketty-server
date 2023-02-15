const hljs = require('highlight.js')
const cheerio = require('cheerio')
const find = require('lodash/find')

module.exports = (
  container,
  bookComponent,
  notesType,
  tocComponent,
  bookComponentsWithMath,
  endnotesComponent = undefined,
  level = undefined,
) => {
  const { title, componentType, content, includeInTOC, division, id } =
    bookComponent

  const levelClass = level ? `toc-level-${level}` : undefined
  const toc = cheerio.load(tocComponent.content)
  let hasMath = false

  if (includeInTOC) {
    const li = `<li class="toc-${division} ${
      levelClass || ''
    } toc-${componentType}"><a href="#comp-number-${id}"><span class="name">${
      title || componentType
    }</span></a></li>`

    toc('ol').append(li)
    /* eslint-disable no-param-reassign */
    tocComponent.content = toc('body').html()
    /* eslint-enable no-param-reassign */
  }

  if (!content) return { content: container, hasMath }

  let $

  if (bookComponent && content) {
    $ = cheerio.load(bookComponent.content)
  }

  if (componentType === 'endnotes') {
    $('math-inline').each((i, elem) => {
      const found = find(bookComponentsWithMath, {
        bookComponentId: 'endnotes',
      })

      if (!found) {
        bookComponentsWithMath.push({ bookComponentId: 'endnotes', division })
      }

      hasMath = true
    })

    $('math-display').each(async (i, elem) => {
      const found = find(bookComponentsWithMath, {
        bookComponentId: 'endnotes',
      })

      if (!found) {
        bookComponentsWithMath.push({ bookComponentId: 'endnotes', division })
      }

      hasMath = true
    })
    return { content: $('body').html(), hasMath }
  }

  let chapterEndnotes

  if (notesType === 'chapterEnd') {
    chapterEndnotes = cheerio.load(
      `<aside class="footnotes"><h2 class="notes-title">Notes</h2></aside>`,
    )
  }

  const endnotes = endnotesComponent && cheerio.load(endnotesComponent.content)

  const outerContainer = cheerio.load(container)

  $('pre code').each((i, elem) => {
    const $elem = $(elem)
    const res = hljs.highlightAuto($elem.text())
    const { language, value } = res
    const pre = $(`<pre class="${language}"/>`)
    const code = $('<code/>').append(value)
    pre.append(code)
    $elem.replaceWith(pre)
  })

  $('math-inline').each((i, elem) => {
    const found = find(bookComponentsWithMath, { bookComponentId: id })

    if (!found) {
      bookComponentsWithMath.push({ bookComponentId: id, division })
    }

    hasMath = true
  })

  $('math-display').each(async (i, elem) => {
    const found = find(bookComponentsWithMath, { bookComponentId: id })

    if (!found) {
      bookComponentsWithMath.push({ bookComponentId: id, division })
    }

    hasMath = true
  })

  // chapter title
  $('h1').each((i, elem) => {
    const $elem = $(elem)

    const h1 = $('<h1/>').attr('class', 'component-title').html($elem.html())

    $elem.replaceWith(h1)

    outerContainer('header').append(h1)
    $elem.remove()
  })
  // subtitle
  $('p').each((i, elem) => {
    const $elem = $(elem)
    const p = $('<p/>')

    if ($elem.attr('class') === 'component-subtitle') {
      p.attr('class', 'cst').html($elem.html())
      outerContainer('header').append(p)
      $elem.remove()
    }
  })

  $('span').each((i, elem) => {
    const $elem = $(elem)

    // trackChange Addition
    if ($elem.attr('class') === 'insertion') {
      $elem.replaceWith($elem.html())
    }

    // trackChange Deletion
    if ($elem.attr('class') === 'deletion') {
      $elem.remove()
    }

    // comment
    if ($elem.attr('class') === 'comment') {
      $elem.replaceWith($elem.html())
    }
  })

  const hasNotesOuter = outerContainer('footnote').length > 0

  const hasNotesInner = $('footnote').length > 0

  // only notes in header tag
  if (hasNotesOuter && !hasNotesInner) {
    if (notesType === 'footnotes') {
      let noteNumberFoot = 0

      if (hasNotesOuter) {
        // if notes exist in header area. this  should be done in a better way
        outerContainer('footnote').each((i, elem) => {
          const $elem = $(elem)

          const elementId = $elem.attr('id')
          noteNumberFoot += 1
          const elementContent = `${$elem.html()}`

          const callout = outerContainer(
            `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberFoot}</a><span class="footnote" id="${bookComponent.id}-${elementId}">${elementContent}</span>`,
          )

          $elem.replaceWith(callout)
        })
      }
    } else if (notesType === 'endnotes') {
      const notesSectionHeader = endnotes('<h2/>')
        .attr('class', 'notes-title')
        .html(title || componentType)

      endnotes('section').append(notesSectionHeader)
      const notesList = endnotes('<ol/>').attr('class', 'end-notes')
      // replace inline notes with endnotes
      let noteNumberEnd = 0

      if (hasNotesOuter) {
        // if notes exist in header area. this should be done in a better way
        outerContainer('footnote').each((i, elem) => {
          const $elem = $(elem)

          const elementId = $elem.attr('id')
          noteNumberEnd += 1
          const elementContent = `${$elem.html()}`
          const li = endnotes('<li/>').html(elementContent)
          li.attr('id', `${bookComponent.id}-${elementId}`)
          notesList.append(li)

          const callout = outerContainer(
            `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberEnd}</a>`,
          )

          $elem.replaceWith(callout)
        })
      }

      endnotes('section').append(notesList)
      /* eslint-disable no-param-reassign */
      endnotesComponent.content = endnotes('body').html()
      /* eslint-enable no-param-reassign */
    } else {
      const notesList = chapterEndnotes('<ol/>').attr(
        'class',
        `${componentType}-notes`,
      )

      let noteNumberChpEnd = 0

      if (hasNotesOuter) {
        outerContainer('footnote').each((i, elem) => {
          const $elem = $(elem)
          const elementId = $elem.attr('id')
          noteNumberChpEnd += 1
          const elementContent = `${$elem.html()}`

          const li = chapterEndnotes('<li/>').html(elementContent)
          li.attr('id', `${bookComponent.id}-${elementId}`)
          notesList.append(li)

          const callout = outerContainer(
            `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberChpEnd}</a>`,
          )

          $elem.replaceWith(callout)
        })
      }

      chapterEndnotes('aside').append(notesList)
    }
  }

  if (hasNotesInner) {
    if (notesType === 'footnotes') {
      let noteNumberFoot = 0

      if (hasNotesOuter) {
        // if notes exist in header area. this  should be done in a better way
        outerContainer('footnote').each((i, elem) => {
          const $elem = $(elem)

          const elementId = $elem.attr('id')
          noteNumberFoot += 1
          const elementContent = `${$elem.html()}`

          const callout = outerContainer(
            `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberFoot}</a><span class="footnote" id="${bookComponent.id}-${elementId}">${elementContent}</span>`,
          )

          $elem.replaceWith(callout)
        })
      }

      $('footnote').each((i, elem) => {
        const $elem = $(elem)

        const elementId = $elem.attr('id')
        noteNumberFoot += 1
        const elementContent = `${$elem.html()}`

        const callout = $(
          `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberFoot}</a><span class="footnote" id="${bookComponent.id}-${elementId}">${elementContent}</span>`,
        )

        $elem.replaceWith(callout)
      })
    } else if (notesType === 'endnotes') {
      const notesSectionHeader = endnotes('<h2/>')
        .attr('class', 'notes-title')
        .html(title || componentType)

      endnotes('section').append(notesSectionHeader)
      const notesList = endnotes('<ol/>').attr('class', 'end-notes')
      // replace inline notes with endnotes
      let noteNumberEnd = 0

      if (hasNotesOuter) {
        // if notes exist in header area. this should be done in a better way
        outerContainer('footnote').each((i, elem) => {
          const $elem = $(elem)

          const elementId = $elem.attr('id')
          noteNumberEnd += 1
          const elementContent = `${$elem.html()}`
          const li = endnotes('<li/>').html(elementContent)
          li.attr('id', `${bookComponent.id}-${elementId}`)
          notesList.append(li)

          const callout = outerContainer(
            `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberEnd}</a>`,
          )

          $elem.replaceWith(callout)
        })
      }

      $('footnote').each((i, elem) => {
        const $elem = $(elem)

        const elementId = $elem.attr('id')
        noteNumberEnd += 1
        const elementContent = `${$elem.html()}`

        const li = endnotes('<li/>').html(elementContent)
        li.attr('id', `${bookComponent.id}-${elementId}`)
        notesList.append(li)

        const callout = $(
          `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberEnd}</a>`,
        )

        $elem.replaceWith(callout)
      })
      endnotes('section').append(notesList)
      /* eslint-disable no-param-reassign */
      endnotesComponent.content = endnotes('body').html()
      /* eslint-enable no-param-reassign */
    } else {
      const notesList = chapterEndnotes('<ol/>').attr(
        'class',
        `${componentType}-notes`,
      )

      let noteNumberChpEnd = 0

      if (hasNotesOuter) {
        outerContainer('footnote').each((i, elem) => {
          const $elem = $(elem)
          const elementId = $elem.attr('id')
          noteNumberChpEnd += 1
          const elementContent = `${$elem.html()}`

          const li = chapterEndnotes('<li/>').html(elementContent)
          li.attr('id', `${bookComponent.id}-${elementId}`)
          notesList.append(li)

          const callout = outerContainer(
            `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberChpEnd}</a>`,
          )

          $elem.replaceWith(callout)
        })
      }

      $('footnote').each((i, elem) => {
        const $elem = $(elem)

        const elementId = $elem.attr('id')
        noteNumberChpEnd += 1
        const elementContent = `${$elem.html()}`

        const li = chapterEndnotes('<li/>').html(elementContent)
        li.attr('id', `${bookComponent.id}-${elementId}`)
        notesList.append(li)

        const callout = $(
          `<a class="note-callout" href="#${bookComponent.id}-${elementId}">${noteNumberChpEnd}</a>`,
        )

        $elem.replaceWith(callout)
      })
      chapterEndnotes('aside').append(notesList)
    }
  }

  // clean empty p tags
  $('p').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })

  // clean empty h1 tags
  $('h1').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })

  // clean empty h2 tags
  $('h2').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })

  // clean empty h3 tags
  $('h3').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })

  // clean empty h4 tags
  $('h4').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })
  // clean empty h5 tags
  $('h5').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })
  // clean empty h6 tags
  $('h6').each((i, elem) => {
    const $elem = $(elem)

    if ($elem.text() === '') {
      $elem.remove()
    }
  })
  const bodyContent = $.html()

  outerContainer(`section.component-${division}`).append(bodyContent)

  if (notesType === 'chapterEnd') {
    if (chapterEndnotes('ol > li').length > 0) {
      outerContainer(`section.component-${division}`).append(
        chapterEndnotes('body').html(),
      )
    }
  }

  return { content: outerContainer('body').html(), hasMath }
}
