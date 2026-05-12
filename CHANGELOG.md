# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Full release notes including code examples are published on [GitHub Releases](https://github.com/Fcmam5/nest-problem-details/releases).

## [1.8.0] - 2026-05-12

### Added

- `NestProblemDetailsModule.register(options)` — configure `baseUri`, `httpErrorsMap` and `suppressDetail` through a typed options object instead of manually overriding provider tokens
- `NestProblemDetailsModule.registerAsync({ imports, inject, useFactory })` — resolve options from an injectable factory (e.g. `ConfigService`)
- `NestProblemDetailsModuleOptions` and `NestProblemDetailsModuleAsyncOptions` exported from the public API

### Changed

- Static `NestProblemDetailsModule` import and manual token overrides remain supported (backward compatible)

## [1.7.0] - 2026-05-11

### Added

- `suppressDetail` option on `HttpExceptionFilter` and `NestProblemDetailsModule` — pass `true` or a `(ctx: SuppressDetailContext) => boolean` callback to omit the `detail` field from responses
- `SuppressDetail`, `SuppressDetailContext`, `SUPPRESS_DETAIL_KEY` exported from the public API

### Changed

- `HttpExceptionFilter` now normalizes `suppressDetail` to a predicate at construction time; a throwing callback is swallowed and treated as "do not suppress"
- Type URIs for `defaultHttpErrors` entries are precomputed once at construction into a `Map<number, string>`, eliminating repeated `new URL()` allocations on the request hot path

## [1.6.0] - 2026-05-04

### Added

- `addProblemDetailsSchema()` helper — registers the canonical `ProblemDetails` schema under `components.schemas` in an OpenAPI document

### Changed

- Removed `invalid-params` from `PROBLEM_DETAILS_SCHEMA` (appeared only in RFC 7807 example, not standardised in RFC 9457)
- CI format check added to both `main.yml` and `release.yml`

## [1.5.0] - 2026-05-02

### Added

- `nest-problem-details-filter/class-validator-mappers` subpath — three validation error mapping helpers: `mapClassValidatorErrors()`, `mapToPointerErrors()`, `toValidationProblemDetails()`
- `HttpExceptionFilter` detects `string[]` messages from Nest's default `ValidationPipe` and moves them to the `errors` extension member (per RFC 9457 §3.1.4)
- `IExceptionResponse.message` now accepts `string | string[]`
- `class-validator` declared as optional peer dependency
- Mock dev server (`npm run start:mock`) with Swagger UI playground

## [1.4.0] - 2026-05-01

### Added

- `@ApiProblemResponse()` decorator via `nest-problem-details-filter/swagger` subpath — documents `application/problem+json` responses without forcing `@nestjs/swagger` on users who don't need it
- `Retry-After` header support (RFC 9110 §10.2.3) — set via `ProblemDetailsException.retryAfter` or any `HttpException` subclass exposing the same field

### Fixed

- `type` resolution now uses WHATWG URL (RFC 9457 §3.1.1); `baseUri` query and hash are stripped before path resolution

## [1.3.0] - 2026-04-29

### Added

- `ProblemDetailsException` — dedicated exception class accepting a flat RFC 9457 payload directly (resolves #19)

### Changed

- Monorepo flattened to single-package layout
- Strict TypeScript mode enabled
- `isErrorObject` type guard extracted to separate utility file

### Fixed

- Guard against non-object `errorResponse.error` payloads
- Correct typo in `mockHttpAdapterHost` variable

## [1.2.4] - 2026-04-28

### Fixed

- TypeScript build not emitting output files (#16)
- Release workflow: build verification step added; manual publish control via `workflow_dispatch`

## [1.2.3] - 2026-04-27

### Fixed

- Empty package on publish; export missing symbols (#16)

## [1.2.2] - 2026-04-27

### Fixed

- CI: force install latest npm to unblock release

## [1.2.1] - 2026-04-27

### Fixed

- CI: update `.nvmrc` to fix npm release step

## [1.2.0] - 2026-04-27

### Added

- Missing HTTP status codes added to the default error map
- `PROBLEM_CONTENT_TYPE` moved to constants and exported
- `IExceptionResponse` and other interfaces exported from public API

### Fixed

- Allow arbitrary custom fields in `IErrorDetail.error`
- Extract `detail` from nested error object in exception response
- `objectExtras` destructuring to avoid wasteful overwrites

### Changed

- `HttpExceptionFilter` constructor simplified; dual adapter support removed

## [1.1.1] - 2026-04-26

### Fixed

- CI fix for npm release step

## [1.1.0] - 2026-04-26

### Fixed

- Correct error type extraction from nested error object

### Changed

- Documentation reorganised; example projects removed
- Migrated to flat ESLint config

## [1.0.0] - 2025-01-23

### Added

- 💥 **BREAKING**: Support any kind of [NestJS HTTP adapters](https://docs.nestjs.com/faq/http-adapter)

### Updated

- 💥 **BREAKING**: Update dependencies and use `Node 20`

### Updated

- Improved documentation
- Update `devDependencies`

## [0.1.0] - 2023-10-02

### Updated

- Improved documentation
- Removed NX workspaces

### Fixed

- :sparkles: support Fastify


## [0.0.1] - 2021-06-06

- Initial release
