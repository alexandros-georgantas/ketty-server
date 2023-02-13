const objectKeyExtractor = url => {
  const stage1 = url.split('?')
  const stage2 = stage1[0].split('/')
  const objectKey = stage2[stage2.length - 1]

  return objectKey
}

module.exports = objectKeyExtractor
