const openAi = require('../../../controllers/openAi.controller')

const openAiResolver = async (_, { input, history }) => {
  return openAi(input, history)
}

module.exports = {
  Query: {
    openAi: openAiResolver,
  },
}
