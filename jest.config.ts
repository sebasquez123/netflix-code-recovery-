import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  collectCoverage: false,
  roots: ['<rootDir>/tests'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  prettierPath: null,
  silent: true,
  reporters: ['default', 'github-actions'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
  verbose: true,
};

export default jestConfig;
