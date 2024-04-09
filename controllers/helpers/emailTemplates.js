const config = require('config')

// TODO: this should be moved to @coko/server
const bookInvite = context => {
  const clientUrl = config.get('clientUrl')

  try {
    const { email, bookTitle, sharerEmail, sharerName, bookId, status } =
      context

    const link = `${clientUrl}/books/${bookId}/producer`

    const content = `
        <p>${sharerName} (${sharerEmail}) has invited you to ${status} the following book: <a href="${link}">${bookTitle}</a>.</p>
        <p></p>
        <p>
          If you cannot click the link above, paste the following into your browser to continue:
          <br/>
          ${link}
        </p>
      `

    const text = `
      Book shared with you: ${bookTitle}!\nCopy and paste the following link into your browser to view the book.\n\n${link}`

    const data = {
      content,
      text,
      subject: `Book shared with you: ${bookTitle}`,
      to: email,
    }

    return data
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { bookInvite }
