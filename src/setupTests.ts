import '@testing-library/jest-dom';

// import.meta.env へのアクセスを env.ts に集約しているため、
// このモジュールだけをモックすれば Jest で動作する
jest.mock('./services/env', () => ({
  getEnvStoreUrl: jest.fn(() => undefined),
}));

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substring(7),
}));

// Suppress console.error during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (..._args: unknown[]) => {
    // Suppress all console.error calls during tests
    // If you need to see specific errors, you can filter them here
    return;
  };
});

afterAll(() => {
  console.error = originalError;
});
