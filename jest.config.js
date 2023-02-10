module.exports = {
  collectCoverage: false,
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/*test.{js,jsx}',
    '!**/test/**',
    '!**/node_modules/**',
    '!**/config/**',
    '!**/coverage/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  projects: [
    {
      displayName: 'models',
      testEnvironment: 'node',
      testRegex: './data-model/__tests__/.+test.js$',
    },
  ],
}
