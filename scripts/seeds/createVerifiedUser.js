const { logger } = require('@coko/server')
const Identity = require('@coko/server/src/models/identity/identity.model')

const User = require('../../models/user/user.model')

;(async () => {
  try {
    const email = process.argv[2]
    const username = process.argv[3]

    const newUser = await User.insert({
      username,
      password: 'Password@123',
      agreedTc: true,
      isActive: true,
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
