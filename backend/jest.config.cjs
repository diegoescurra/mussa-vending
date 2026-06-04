module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
