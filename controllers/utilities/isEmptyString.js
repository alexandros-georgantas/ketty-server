const isEmptyString = data => {
  let isEmpty = false

  if (!data) {
    isEmpty = true
  } else {
    isEmpty = data.trim().length === 0
  }

  return isEmpty
}

module.exports = isEmptyString
