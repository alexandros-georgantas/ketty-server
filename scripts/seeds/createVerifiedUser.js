/* eslint-disable import/newline-after-import */
const { logger } = require('@coko/server')
const Identity = require('@coko/server/src/models/identity/identity.model')

const User = require('../../models/user/user.model')

;(async () => {
  try {
    const email = process.argv[2]
    // const username = process.argv[3]
    const givenNames = process.argv[3]
    const surname = process.argv[4]
    const username = process.argv[5]

    const newUser = await User.insert({
      // username: 'user',
      password: 'Test@123',
      agreedTc: true,
      isActive: true,
      givenNames,
      surname,
    })

    // eslint-disable-next-line no-console
    console.log(newUser)

    const verifiedUser = await Identity.insert({
      userId: newUser.id,
      email,
      isVerified: true,
      isDefault: true,
    })

    // eslint-disable-next-line no-console
    console.log(verifiedUser)
  } catch (err) {
    logger.error(err)
  }
})()
