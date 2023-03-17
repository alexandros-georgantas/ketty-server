#!/usr/bin/env node
const config = require('config')

const { createAdminUser } = require('./seeds')

const adminUser = config.get('pubsweet-server.admin')

const run = async () => {
  try {
    await createAdminUser({
      ...adminUser,
    })
  } catch (e) {
    throw new Error(e.message)
  }
}

run()
