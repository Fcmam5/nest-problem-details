module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
    // Nest v12 ships ESM packages; @swc/jest transpiles them to CJS (config in
    // `.swcrc`) so Jest's CJS runtime can load them. Our own sources stay on
    // ts-jest, which also type-checks the test files.
    '^.+\\.js$': '@swc/jest',
  },
  // pnpm nests packages under `.pnpm/`, so match `@nestjs` anywhere in the
  // path rather than assuming `node_modules/@nestjs/` is a direct child.
  transformIgnorePatterns: ['/node_modules/(?!.*@nestjs)/'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    'node_modules/',
    'dist/',
    'src/index.ts',
    'src/swagger/index.ts',
    'src/class-validator-mappers/index.ts',
  ],
  coverageThreshold: {
    global: { branches: 99, functions: 99, lines: 99, statements: 99 },
  },
};
