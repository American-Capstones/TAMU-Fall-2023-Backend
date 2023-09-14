module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  testPathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    './src/**/*.ts',
    '!./src/@types/**',
    '!./src/env.ts',
    '!./src/slack/*',
    '!./src/run.ts',
    '!./src/service/standaloneServer.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
