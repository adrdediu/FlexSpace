/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.ts',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/src/__tests__/__mocks__/fileMock.ts',
    '.*[wW]eb[sS]ocket[sS]ervice.*': '<rootDir>/src/__tests__/__mocks__/webSocketService.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.(ts|tsx)'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/contexts/**/*.tsx',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    '<rootDir>/src/__tests__/reporter/htmlReporter.cjs',
  ],
};

module.exports = config;
