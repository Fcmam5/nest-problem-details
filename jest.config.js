// Version-gated specs: nest-v12.spec.ts uses real v12 APIs and only compiles
// under v12 typings; nest-legacy.spec.ts pins the v11 contract. NEST_MAJOR is
// set from the CI matrix; locally (v12 devDeps) the legacy file is skipped.
const versionedSpecs =
  process.env.NEST_MAJOR === '11'
    ? ['tests/nest-v12\\.spec\\.ts$']
    : ['tests/nest-legacy\\.spec\\.ts$'];

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', ...versionedSpecs],
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
