const axios = require('axios')
const config = require('config')

// const logger = require('@coko/server')

const openAi = async (input, history = []) => {
  try {
    const CHAT_GPT_URL = 'https://api.openai.com/v1/chat/completions'
    // const CHAT_GPT_URL = config.has('chatGPT.url') && config.get('chatGPT.url')

    const CHAT_GPT_KEY = config.has('chatGPT.key') && config.get('chatGPT.key')

    // if (!CHAT_GPT_URL) {
    //   throw new Error('Missing API URL')
    // }

    if (!CHAT_GPT_KEY) {
      throw new Error('Missing access key')
    }

    const response = await axios.post(
      CHAT_GPT_URL,
      {
        model: 'gpt-3.5-turbo',
        // model: 'gpt-4',
        messages: [
          ...history,
          {
            role: 'user',
            content: input,
          },
        ],
        temperature: 0,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHAT_GPT_KEY}`,
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
