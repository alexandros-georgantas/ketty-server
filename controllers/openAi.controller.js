const axios = require('axios')
const { ApplicationParameter } = require('../models').models

// const logger = require('@coko/server')

const openAi = async (input, history = []) => {
  try {
    const CHAT_GPT_URL = 'https://api.openai.com/v1/chat/completions'

    const CHAT_GPT_KEY = await ApplicationParameter.findOne({
      context: 'bookBuilder',
      area: 'chatGptApiKey',
    })

    if (!CHAT_GPT_KEY?.config) {
      throw new Error('Missing access key')
    }

    const response = await axios.post(
      CHAT_GPT_URL,
      {
        // model: 'gpt-3.5-turbo',
        model: 'gpt-4-1106-preview',
        messages: [
          ...history,
          {
            role: 'user',
            content: input,
          },
        ],
        // history is being used in the AI studio calls only, so let's use it as a discriminator for now
        // TODO: a more specific way to set response_format
        ...(history.length ? { response_format: { type: 'json_object' } } : {}),
        temperature: 0,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHAT_GPT_KEY.config}`,
        },
      },
    )

    return response.data.choices[0].message.content
  } catch (e) {
    console.error('openAi:', e)
    throw new Error(e)
  }
}

module.exports = openAi
