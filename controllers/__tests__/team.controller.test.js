const clearDb = require('../../scripts/helpers/_clearDB')
const { createTeam, deleteTeam, getObjectTeam } = require('../team.controller')

describe('Team Controller', () => {
  beforeEach(async () => {
    await clearDb()
  })

  it('should create team based on name, id, role', async () => {
    // for global team
    const globalTeamDisplayName = 'Production Editor'
    const globalRole = 'productionEditor'

    const globalTeam = await createTeam(
      globalTeamDisplayName,
      undefined,
      undefined,
      globalRole,
      true,
    )

    // for non global
    const nonGlobalTeamDisplayName = 'Production Editor'
    const id = 'e19d775a-0456-11ee-be56-0242ac120002'
    const objectType = 'book'
    const nonGlobalRole = 'productionEditor'

    const nonGlobalTeam = await createTeam(
      nonGlobalTeamDisplayName,
      id,
      objectType,
      nonGlobalRole,
      false,
    )

    expect(createTeam).toBeDefined()
    expect(globalTeam.displayName).toBe(globalTeamDisplayName)
    expect(globalTeam.global).toBe(true)
    expect(globalTeam.role).toBe(globalRole)
    expect(nonGlobalTeam.displayName).toBe(nonGlobalTeamDisplayName)
    expect(nonGlobalTeam.global).toBe(false)
    expect(nonGlobalTeam.role).toBe(nonGlobalRole)
  })

  it('should fetch team object based on role, id', async () => {
    const displayName = 'Production Editor'
    const id = 'e19d775a-0456-11ee-be56-0242ac120002'
    const objectType = 'book'
    const role = 'productionEditor'

    await createTeam(displayName, id, objectType, role, false)

    const result = await getObjectTeam(role, id)

    expect(getObjectTeam).toBeDefined()
    expect(result.objectId).toBe(id)
  })

  it('should  delete team based on id', async () => {
    // for global team
    const globalTeamDisplayName = 'Production Editor'
    const globalRole = 'productionEditor'

    const globalTeam = await createTeam(
      globalTeamDisplayName,
      undefined,
      undefined,
      globalRole,
      true,
    )

    // for non global
    const nonGlobalDisplayName = 'Production Editor'
    const id = 'e19d775a-0456-11ee-be56-0242ac120002'
    const objectType = 'book'
    const nonGlobalRole = 'productionEditor'

    const nonGlobalTeam = await createTeam(
      nonGlobalDisplayName,
      id,
      objectType,
      nonGlobalRole,
      false,
    )

    const deleteGlobalTeam = await deleteTeam(globalTeam.id)
    const deleteNonGlobalTeam = await deleteTeam(nonGlobalTeam.id)

    expect(deleteTeam).toBeDefined()
    expect(deleteGlobalTeam).toBe(1)
    expect(deleteNonGlobalTeam).toBe(1)
  })
})
