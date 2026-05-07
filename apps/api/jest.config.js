/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {
    // Map .js imports to actual files for test resolution
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Workspace packages
    '^@primaria/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@primaria/database$': '<rootDir>/../../packages/database/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
      },
    }],
  },
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageThreshold: { global: { lines: 60 } },
};

module.exports = config;
