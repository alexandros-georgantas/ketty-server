const { logger, useTransaction } = require('@coko/server')
const Identity = require('@coko/server/src/models/identity/identity.model')
const Team = require('../../models/team/ketidaTeam.model')
const User = require('../../models/user/user.model')

const createAdmin = async userData => {
  try {
    logger.info('### CREATING ADMIN USER ###')
    logger.info(
      '>>> checking if admin user with provided email and username already exists...',
    )

    const { username, password, email, givenName, surname } = userData

    await useTransaction(async trx => {
      let adminUser

      const existingUsers = await User.query(trx)
        .leftJoin('identities', 'users.id', 'identities.user_id')
        .distinctOn('users.id')
        .where({
          'users.username': username,
          'identities.email': email,
        })

      if (existingUsers.length !== 0) {
        await Promise.all(
          existingUsers.map(async user => {
            const isAdmin = await User.hasGlobalRole(user.id, 'admin', { trx })

            if (isAdmin) {
              logger.warn(
                '>>> an admin user already exists with that credentials in the system',
              )
              return false
            }

            logger.warn(
              '>>> user already exists but will be added in the Admins team',
            )
            adminUser = user
            return Team.addMemberToGlobalTeam(user.id, 'admin', { trx })
          }),
        )
      } else {
        logger.info('creating user')

        const newAdminUser = await User.insert(
          {
            password,
            givenNames: givenName,
            surname,
            agreedTc: true,
            isActive: true,
            username,
          },
          { trx },
        )

        await Identity.insert(
          {
            userId: newAdminUser.id,
            isDefault: true,
            isVerified: true,
            email,
          },
          { trx },
        )

        await Team.addMemberToGlobalTeam(newAdminUser.id, 'admin', { trx })

        logger.info(
          `>>> admin user  with username "${username}" successfully created.`,
        )
        adminUser = newAdminUser
        return newAdminUser
      }

      return adminUser
    })

    return true
  } catch (e) {
    logger.error(e.message)
    throw new Error(e)
  }
}

module.exports = createAdmin
