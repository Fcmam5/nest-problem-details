module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    'node_modules/',
    'dist/',
    'src/index.ts',
    'src/swagger/index.ts',
  ],
  coverageThreshold: {
    global: { branches: 99, functions: 99, lines: 99, statements: 99 },
  },
};
