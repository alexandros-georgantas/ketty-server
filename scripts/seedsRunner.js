const {
  createApplicationParams,
  createBookCollection,
  createGlobalTeams,
} = require('./seeds')

const run = async () => {
  try {
    await createGlobalTeams()
    await createApplicationParams()
    await createBookCollection()
  } catch (e) {
    throw new Error(e.message)
  }
}

run()
