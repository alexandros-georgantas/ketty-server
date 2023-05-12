module.exports = {
  global: {
    owner: {
      displayName: 'Owner',
      role: 'owner',
    },
    admin: {
      displayName: 'Admin',
      role: 'admin',
    },
  },
  nonGlobal: {
    collaborator: {
      displayName: 'Collaborator',
      role: 'collaborator',
      status: {
        read: 'Read',
        write: 'Write',
      },
    },
  },
}
