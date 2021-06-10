module.exports = {
  roots: ['<rootDir>/snykTask/src/', '<rootDir>/ui/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    'snykTask/src/__tests__/_test-mock-config-*',
    'snykTask/src/__tests__/test-task.ts',
  ],
};
