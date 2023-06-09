const { Identity } = require('@coko/server/src/models')
const clearDb = require('../../scripts/helpers/_clearDB')
const seedAdmin = require('../../scripts/seeds/admin')
const seedUser = require('../../scripts/seeds/user')
const seedGlobalTeams = require('../../scripts/seeds/globalTeams')

const {
  isAdmin,
  ketidaLogin,
  isGlobal,
  searchForUsers,
  ketidaResendVerificationEmail,
} = require('../user.controller')

describe('User Controller', () => {
  beforeEach(async () => {
    await clearDb()
    await seedGlobalTeams()
  }, 30000)

  it('should verify the user is admin or not', async () => {
    const adminUser = await seedAdmin({
      username: 'admin user',
      password: 'password',
      email: 'adminuser@example.com',
      givenNames: 'Admin',
      surname: 'Adminius',
    })

    const regularUser = await seedUser({
      username: 'user',
      password: 'password',
      email: 'user@example.com',
      givenNames: 'Test',
      surname: 'User',
    })

    const checkAdminUser = await isAdmin(adminUser.id)
    const checkNonAdminUser = await isAdmin(regularUser.id)

    expect(isAdmin).toBeDefined()
    expect(checkAdminUser).toBe(true)
    expect(checkNonAdminUser).toBe(false)
  })

  it('should login into ketida based on username and email', async () => {
    const user = await seedAdmin({
      username: 'admin',
      password: 'password',
      email: 'admin@example.com',
      givenNames: 'Admin',
      surname: 'Adminius',
    })

    const identity = await Identity.findOne({ userId: user.id })

    const ketidalogin = await ketidaLogin({
      username: user.username,
      email: identity.email,
      password: 'password',
    })

    expect(ketidaLogin).toBeDefined()
    expect(ketidalogin.token).toBeTruthy()
    expect(ketidalogin.user.id).toBe(user.id)
  })

  it('should verify user is from global team or not', async () => {
    const nonGlobalUser = await seedUser({
      username: 'regularuser',
      password: 'password',
      email: 'regularuser@example.com',
      givenNames: 'Test',
      surname: 'User',
    })

    const globalUser = await seedAdmin({
      username: 'Admin',
      password: 'password',
      email: 'admin@example.com',
      givenNames: 'Admin',
      surname: 'admin',
    })

    const checkNonGlobalUser = await isGlobal(nonGlobalUser.id, false)
    const checkGlobalUser = await isGlobal(globalUser.id, true)

    expect(isGlobal).toBeDefined()
    expect(checkNonGlobalUser).toBe(false)
    expect(checkGlobalUser).toBe(true)
  })

  it('should fetch user based on search, exclude', async () => {
    const user = await seedUser({
      username: 'user',
      password: 'password',
      email: 'user@example.com',
      givenNames: 'user',
      surname: 'userius',
    })

    const excludeUser = await seedUser({
      username: 'excludeuser',
      password: 'password',
      email: 'excludeUser@example.com',
      givenNames: 'user',
      surname: 'userius',
    })

    const search = 'user'
    const exclude = [excludeUser.id]

    const searchResult = await searchForUsers(search, exclude)

    expect(searchForUsers).toBeDefined()
    expect(searchResult[0].id).toBe(user.id)
    expect(searchResult[0].username).toBe(user.username)
  })

  it('should send verification email based on email', async () => {
    const user = await seedUser({
      username: 'user',
      password: 'password',
      email: 'user@example.com',
      givenNames: 'user',
      surname: 'users',
    })

    const identity = await Identity.findOne({ userId: user.id })

    const resendVerificationEmail = await ketidaResendVerificationEmail(
      identity.email,
    )

    expect(ketidaResendVerificationEmail).toBeDefined()
    expect(resendVerificationEmail).toBe(true)
  })
})
