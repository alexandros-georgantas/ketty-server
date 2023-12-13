module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        releaseRules: [
          {
            type: 'revert',
            release: 'patch',
          },
          {
            type: 'refactor',
            release: 'minor',
          },
          {
            type: 'chore',
            release: 'minor',
          },
        ],
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    [
      '@semantic-release/gitlab',
      {
        assets: [
          {
            label: 'Dockerhub release',
            url: 'https://hub.docker.com/r/cokoapps/ketida-server/tags',
          },
        ],
      },
    ],
  ],
}
