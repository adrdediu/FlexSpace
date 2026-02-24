import '@testing-library/jest-dom';

// --------------------------------------------------------------------------
// Global fetch mock — every test file starts with a clean slate because
// beforeEach in individual suites calls jest.resetAllMocks().
// --------------------------------------------------------------------------
global.fetch = jest.fn();

// Silence console noise from the service's own console.error calls so that
// test output stays clean. Individual tests can spy / restore if needed.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});