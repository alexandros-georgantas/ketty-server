const fs = require('fs')
const path = require('path')
const { logger } = require('@coko/server')

const createTestFile = async () => {
  try {
    const filePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test.docx',
    )

    const copyFilePath = path.join(
      process.cwd(),
      'controllers',
      '__tests__',
      'files',
      'test1.docx',
    )

    fs.copyFileSync(filePath, copyFilePath)
    logger.info(`>>>>>file copied successfully`)

    return copyFilePath
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = createTestFile
