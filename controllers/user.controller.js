const { logger, useTransaction } = require('@coko/server')

const {
  identityVerification,
} = require('@coko/server/src/models/_helpers/emailTemplates')

const {
  notify,
  notificationTypes: { EMAIL },
} = require('@coko/server/src//services')

const { login } = require('@coko/server/src/models/user/user.controller')
const includes = require('lodash/includes')
const get = require('lodash/get')
const startsWith = require('lodash/startsWith')
const crypto = require('crypto')
const config = require('config')

const Identity = require('@coko/server/src/models/identity/identity.model')
const User = require('../models/user/user.model')

const globalTeam = config.get('teams.global')

const isValidUser = ({ surname, givenNames }) => surname && givenNames

const isAdmin = async userId => {
  try {
    return User.hasGlobalRole(userId, 'admin')
  } catch (e) {
    throw new Error(e)
  }
}

const isGlobal = async userId => {
  try {
    const globalTeamsWithoutAdmin = Object.keys(globalTeam).filter(
      team => team !== 'admin',
    )

    const isGlobalList = await Promise.all(
      globalTeamsWithoutAdmin.map(async team =>
        User.hasGlobalRole(userId, team.role),
      ),
    )

    return isGlobalList.some(global => global)
  } catch (e) {
    throw new Error(e)
  }
}

const ketidaLogin = async input => {
  try {
    const { username, email } = input
    let verified
    let active
    let responseCode

    if (!username) {
      const identity = await Identity.findOne({ email })
      if (!identity) throw new Error('Wrong username or password.')
      verified = identity.isVerified
      const user = await User.findById(identity.userId)
      active = user.isActive
    } else {
      const user = await User.findOne({ username })
      if (!user) throw new Error('Wrong username or password.')
      active = user.isActive

      const identity = await Identity.findOne({
        userId: user.id,
        isDefault: true,
      })

      if (!identity) throw new Error('Something went wrong with provided info')

      verified = identity.isVerified
    }

    if (active && verified) {
      return login(input)
    }

    if (!active && !verified) {
      responseCode = 100
    } else if (!active && verified) {
      responseCode = 110
    } else if (active && !verified) {
      responseCode = 120
    }

    return { code: responseCode }
  } catch (e) {
    logger.error(`[USER CONTROLLER] - ketida login: ${e.message}`)
    throw new Error(e.message)
  }
}

const ketidaResendVerificationEmail = async (email, options = {}) => {
  try {
    const { trx } = options
    logger.info(
      `[USER CONTROLLER] - ketidaResendVerificationEmail: resending verification email to user`,
    )
    return useTransaction(
      async tr => {
        const identity = await Identity.findOne(
          {
            email,
          },
          { trx: tr },
        )

        if (!identity)
          throw new Error(
            `[USER CONTROLLER] - ketidaResendVerificationEmail: Token does not correspond to an identity`,
          )

        const verificationToken = crypto.randomBytes(64).toString('hex')
        const verificationTokenTimestamp = new Date()

        await identity.patch(
          {
            verificationToken,
            verificationTokenTimestamp,
          },
          { trx: tr },
        )

        const emailData = identityVerification({
          verificationToken,
          email: identity.email,
        })

        notify(EMAIL, emailData)

        return true
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    logger.error(
      `[USER CONTROLLER] - ketidaResendVerificationEmail: ${e.message}`,
    )
    throw new Error(e)
  }
}

const searchForUsers = async (search, exclude, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        if (!search) {
          return []
        }

        const { result: allUsers } = await User.find(
          { isActive: true },
          { trx: tr, related: 'defaultIdentity' },
        )

        const searchLow = search.toLowerCase()
        const res = []

        if (searchLow.length <= 3) {
          logger.info(
            `>>> searching for users where either their username, surname, or email starts with ${searchLow}`,
          )

          await Promise.all(
            allUsers.map(async user => {
              const userClone = { ...user }
              const isUserAdmin = await isAdmin(user.id)

              if (isUserAdmin) return
              userClone.email = userClone.defaultIdentity.email

              if (isValidUser(userClone)) {
                if (
                  (startsWith(
                    get(userClone, 'username', '').toLowerCase(),
                    searchLow,
                  ) ||
                    startsWith(
                      get(userClone, 'surname', '').toLowerCase(),
                      searchLow,
                    ) ||
                    startsWith(
                      get(userClone, 'email', '').toLowerCase(),
                      searchLow,
                    )) &&
                  !includes(exclude, userClone.id)
                ) {
                  logger.info(
                    `>>> found user with id ${userClone.id} who meets the criteria`,
                  )
                  res.push(userClone)
                }
              } else if (
                (startsWith(
                  get(userClone, 'username', '').toLowerCase(),
                  searchLow,
                ) ||
                  startsWith(
                    get(userClone, 'email', '').toLowerCase(),
                    searchLow,
                  )) &&
                !includes(exclude, userClone.id)
              ) {
                logger.info(
                  `>>> found user with id ${userClone.id} who meets the criteria`,
                )
                res.push(userClone)
              }
            }),
          )
        } else if (searchLow.length > 3) {
          logger.info(
            `>>> searching for users where either their username, surname, or email contains ${searchLow}`,
          )
          await Promise.all(
            allUsers.map(async user => {
              const userClone = { ...user }
              const isUserAdmin = await isAdmin(user.id)

              if (isUserAdmin) return

              userClone.email = userClone.defaultIdentity.email

              if (isValidUser(userClone)) {
                const fullname = `${userClone.givenNames} ${userClone.surname}`

                if (
                  (get(userClone, 'username', '')
                    .toLowerCase()
                    .includes(searchLow) ||
                    get(userClone, 'surname', '')
                      .toLowerCase()
                      .includes(searchLow) ||
                    get(userClone, 'email', '')
                      .toLowerCase()
                      .includes(searchLow) ||
                    fullname.toLowerCase().includes(searchLow)) &&
                  !includes(exclude, userClone.id)
                ) {
                  logger.info(
                    `>>> found user with id ${userClone.id} who meets the criteria`,
                  )
                  res.push(userClone)
                }
              } else if (
                (get(userClone, 'username', '')
                  .toLowerCase()
                  .includes(searchLow) ||
                  get(userClone, 'email', '')
                    .toLowerCase()
                    .includes(searchLow)) &&
                !includes(exclude, userClone.id)
              ) {
                logger.info(
                  `>>> found user with id ${userClone.id} who meets the criteria`,
                )
                res.push(userClone)
              }
            }),
          )
        }

        return res
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  searchForUsers,
  isAdmin,
  ketidaLogin,
  ketidaResendVerificationEmail,
  isGlobal,
}
