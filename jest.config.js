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
      testRegex: './models/__tests__/.+test.js$',
      globalSetup: './scripts/helpers/_setup.js',
      globalTeardown: './scripts/helpers/_teardown.js',
    },
    {
      displayName: 'controllers',
      testEnvironment: 'node',
      testRegex: './controllers/__tests__/.+test.js$',
      globalSetup: './scripts/helpers/_setup.js',
      globalTeardown: './scripts/helpers/_teardown.js',
    },
  ],
}
