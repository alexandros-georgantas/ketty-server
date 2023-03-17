#!/usr/bin/env node
const { createTemplates } = require('./seeds')

const run = async () => {
  try {
    await createTemplates()
  } catch (e) {
    throw new Error(e.message)
  }
}

run()
