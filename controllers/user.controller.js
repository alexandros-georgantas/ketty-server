const { logger, useTransaction } = require('@coko/server')
const includes = require('lodash/includes')
const get = require('lodash/get')
const startsWith = require('lodash/startsWith')

const User = require('../models/user/user.model')

const isValidUser = ({ surname, givenNames }) => surname && givenNames

const isAdmin = async userId => {
  try {
    return User.hasGlobalRole(userId, 'admin')
  } catch (e) {
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
}
