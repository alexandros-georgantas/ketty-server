const { logger, useTransaction, sendEmail } = require('@coko/server')
const includes = require('lodash/includes')
const forEach = require('lodash/forEach')
const get = require('lodash/get')
const startsWith = require('lodash/startsWith')
const querystring = require('querystring')
const config = require('config')
const crypto = require('crypto')

const { User } = require('../../data-model/src').models

const isValidUser = ({ surname, givenName }) => surname && givenName

const searchForUsers = async (search, exclude, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        if (!search) {
          return []
        }

        const allUsers = await User.query(tr).where({ deleted: false })
        const searchLow = search.toLowerCase()
        const res = []

        if (searchLow.length <= 3) {
          logger.info(
            `>>> searching for users where either their username, surname, or email starts with ${searchLow}`,
          )
          forEach(allUsers, user => {
            if (user.admin) return

            if (isValidUser(user)) {
              if (
                (startsWith(
                  get(user, 'username', '').toLowerCase(),
                  searchLow,
                ) ||
                  startsWith(
                    get(user, 'surname', '').toLowerCase(),
                    searchLow,
                  ) ||
                  startsWith(
                    get(user, 'email', '').toLowerCase(),
                    searchLow,
                  )) &&
                !includes(exclude, user.id)
              ) {
                logger.info(
                  `>>> found user with id ${user.id} who meets the criteria`,
                )
                res.push(user)
              }
            } else if (
              (startsWith(get(user, 'username', '').toLowerCase(), searchLow) ||
                startsWith(get(user, 'email', '').toLowerCase(), searchLow)) &&
              !includes(exclude, user.id)
            ) {
              logger.info(
                `>>> found user with id ${user.id} who meets the criteria`,
              )
              res.push(user)
            }
          })
        } else if (searchLow.length > 3) {
          logger.info(
            `>>> searching for users where either their username, surname, or email contains ${searchLow}`,
          )
          forEach(allUsers, user => {
            if (user.admin) return

            if (isValidUser(user)) {
              const fullname = `${user.givenName} ${user.surname}`

              if (
                (get(user, 'username', '').toLowerCase().includes(searchLow) ||
                  get(user, 'surname', '').toLowerCase().includes(searchLow) ||
                  get(user, 'email', '').toLowerCase().includes(searchLow) ||
                  fullname.toLowerCase().includes(searchLow)) &&
                !includes(exclude, user.id)
              ) {
                logger.info(
                  `>>> found user with id ${user.id} who meets the criteria`,
                )
                res.push(user)
              }
            } else if (
              (get(user, 'username', '').toLowerCase().includes(searchLow) ||
                get(user, 'email', '').toLowerCase().includes(searchLow)) &&
              !includes(exclude, user.id)
            ) {
              logger.info(
                `>>> found user with id ${user.id} who meets the criteria`,
              )
              res.push(user)
            }
          })
        }

        return res
      },
      { trx, passedTrxOnly: true },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const createKetidaUser = async (
  username,
  givenName,
  surname,
  email,
  password,
  admin = false,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        logger.info('>>> checking if user already exists')

        const usersExist = await User.query(tr).where({
          username,
          email,
          deleted: false,
        })

        const errors = []
        forEach(usersExist, user => {
          if (user.username === username) {
            errors.push('username')
          }

          if (user.surname === surname && user.givenName === givenName) {
            errors.push('name')
          }

          if (user.email === email) {
            errors.push('email')
          }
        })

        if (errors.length !== 0) {
          throw new Error(`User with same ${errors} already exists!`)
        }

        const newUser = await User.query(tr).insert({
          admin,
          password,
          givenName,
          surname,
          email,
          username,
        })

        logger.info(`>>> user created with id ${newUser.id}`)
        return newUser
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updatePassword = async (
  userId,
  currentPassword,
  newPassword,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const u = await User.updatePassword(
          userId,
          currentPassword,
          newPassword,
          { trx: tr },
        )

        logger.info(`>>> password updated for user with id ${u.id}`)
        return u.id
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updatePersonalInformation = async (
  userId,
  givenName,
  surname,
  options = {},
) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const updatedUser = await User.query(tr).patchAndFetchById(userId, {
          givenName,
          surname,
        })

        logger.info(`>>> user info updated for user with id ${userId}`)
        return updatedUser
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

const sendPasswordResetEmail = async (username, options = {}) => {
  try {
    const { trx } = options
    return useTransaction(
      async tr => {
        const url = config.get('pubsweet-server.clientURL')

        const configSender = config.get('mailer.from')

        const pathToPage = config.has('password-reset.path')
          ? config.get('password-reset.path')
          : '/password-reset'

        const tokenLength = config.has('password-reset.token-length')
          ? config.get('password-reset.token-length')
          : 32

        const result = await User.query(tr).where({ username, deleted: false })

        if (result.length !== 1) {
          throw new Error(`user with username ${username} does not exist`)
        }

        const user = result[0]

        const passwordResetToken = crypto
          .randomBytes(tokenLength)
          .toString('hex')

        const passwordResetTimestamp = new Date()

        logger.info(
          `>>> password reset token created for user with id ${user.id}`,
        )

        await User.query(tr)
          .patch({ passwordResetToken, passwordResetTimestamp })
          .where({ id: user.id })
        logger.info(
          `>>> user with id ${user.id} patched with password reset token info`,
        )

        const token = querystring.encode({
          username,
          token: passwordResetToken,
        })

        const passwordResetURL = `${url}/${pathToPage}?${token}`

        logger.info(
          `>>> sending password reset email to user with id ${user.id}`,
        )

        await sendEmail({
          from: configSender,
          to: user.email,
          subject: 'Password reset',
          text: `Reset your password: ${passwordResetURL}`,
          html: `<p><a href="${passwordResetURL}">Reset your password</a></p>`,
        })
        return true
      },
      { trx },
    )
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  searchForUsers,
  createKetidaUser,
  updatePassword,
  updatePersonalInformation,
  sendPasswordResetEmail,
}
