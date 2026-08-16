# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Full release notes including code examples are published on [GitHub Releases](https://github.com/Fcmam5/nest-problem-details/releases).

## [Unreleased]

## [1.9.0] - 2026-08-16

### Added

- `tests/rfc9457/` — a dedicated RFC 9457 compliance test suite checking the wire format against the spec's normative statements section by section (#44). See [`docs/rfc9457-compliance.md`](./docs/rfc9457-compliance.md) for the layout, coverage, and known gaps. AI-generated (with maintainer review) — see the disclaimer in the docs page.
- `strictRfcDefaults` option — opt-in flag for strict RFC 9457 compliance (fixes #41 and #42):
  - When `true`, plain HTTP exceptions emit `type: "about:blank"` instead of a status-code slug, as required by RFC 9457 §4.2.1.
  - When `true`, the caller-supplied message lands in `detail` and the HTTP reason phrase becomes `title` (the RFC-correct mapping).
  - Defaults to `false` to preserve existing behavior. Migration path: defaults to `true` in the next major release, flag removed in the release after that.
- `STRICT_RFC_DEFAULTS_KEY` injection token exported from the public API.

### Fixed

- Throwing with a non-finite status, such as `new HttpException('Oops', NaN)` from a failed `parseInt`, returned **HTTP 200** with an error body (#52). Nest's adapters only apply the status when it is truthy (`if (statusCode)`), and `NaN` is falsy, so the status was never set and the body carried `"status": null`. Clients checking `res.ok` read the failure as success. Non-finite statuses now become `500`. Finite codes are unchanged. Note this also happens in stock Nest without this filter, and `status: 0` is still affected by it.
- `.npmrc`: corrected the config key from `minimum-release-age` to `min-release-age` (npm ≥ 11.10.0; value in days) and shortened the window from 3 days to 12 hours (`min-release-age=0.5`).

### Changed

- Non-string `type`, `detail` and `instance` values are no longer copied into the response. `HttpException` takes `Record<string, any>`, so nothing type-checks the nested `error` object: `error: { detail: null }` compiles fine and used to emit `"detail": null`. Wrong-typed `detail` and `instance` are now dropped, and `type` falls back to its usual default. RFC 9457 §3.1 requires ignoring members of the wrong type. Values passed through `ProblemDetailsException` were already rejected at compile time.
- Under `strictRfcDefaults`, an error object whose `type` is not a string is now treated as having no type at all: `message` becomes `detail`, and `title` comes from the HTTP reason phrase. Previously the mere presence of an error object sent `message` to `title`, even when its `type` was unusable.
- CI (`main.yml`, `release.yml`) installs with pnpm instead of npm, so the pipeline applies the same dependency policies contributors get locally. Publishing still uses `npm publish --provenance`.
- `devDependencies` refreshed: NestJS 11.2.1, `@nestjs/swagger` 11.4.6, ESLint 10.8.1, `typescript-eslint` 8.67.0, Prettier 3.9.6, `ts-jest` 29.4.12, `@types/node` 26, `@types/supertest` 7. No runtime dependencies exist, so nothing changes for consumers.
- `typescript` stays on 6.x: TypeScript 7 no longer exposes the JavaScript compiler API `ts-jest` 29 needs, so the whole test suite fails to run under it. Revisit once `ts-jest` supports the `@typescript/native` split.

### Security

- `pnpm-workspace.yaml` is now committed (previously hidden by an over-broad `pnpm-*` entry in `.gitignore`, which also concealed the pnpm-only supply-chain settings). It pins `minimumReleaseAge: 1440` so pnpm refuses versions published less than 24 hours ago, mirroring the intent of `.npmrc`'s `min-release-age` for npm users. Lockfiles remain untracked.

## [1.8.0] - 2026-05-12

### Added

- `NestProblemDetailsModule.register(options)` — configure `baseUri`, `httpErrorsMap` and `suppressDetail` through a typed options object instead of manually overriding provider tokens
- `NestProblemDetailsModule.registerAsync({ imports, inject, useFactory })` — resolve options from an injectable factory (e.g. `ConfigService`)
- `NestProblemDetailsModuleOptions` and `NestProblemDetailsModuleAsyncOptions` exported from the public API
- README "Quick start" section with copy-paste install + binding snippet and result diff
- `packagephobia` install-size badge in README

### Changed

- Static `NestProblemDetailsModule` import and manual token overrides remain supported (backward compatible)
- `HttpExceptionFilter` now omits the `detail` key from the response body entirely when no detail is available or `suppressDetail` returned `true` (previously the key was set to `undefined` and dropped only at JSON serialization)
- `suppressDetail` documentation now leads with `NestProblemDetailsModule.register({ suppressDetail })`; the legacy `SUPPRESS_DETAIL_KEY` token override is documented as a fallback

### Security

- Repo ships `.npmrc` with `min-release-age=0.5` (12 hours) to defend contributor machines and CI against supply-chain attacks via freshly-published malicious dependency versions. Honored by npm ≥ 11.5; pnpm users can mirror via `minimumReleaseAge` (in minutes). See `CONTRIBUTING.md` for the escape hatch.

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
- `httpErrors` option on `@ApiProblemResponse()` so the documented example matches a custom status-to-type map
- `Retry-After` header support (RFC 9110 §10.2.3) — set via `ProblemDetailsException.retryAfter` or any `HttpException` subclass exposing the same field
- Coveralls coverage reporting in CI

### Fixed

- `type` resolution now uses WHATWG URL (RFC 9457 §3.1.1); `baseUri` query and hash are stripped before path resolution
- Plain string schema for the `Retry-After` Date header in Swagger output

## [1.3.0] - 2026-04-29

### Added

- `HttpExceptionFilter` aligned with RFC 9457 — `type` (URI reference), `title`, `status`, `detail`, `instance` are surfaced according to the spec (closes #24)
- `ProblemDetailsException` — dedicated exception class accepting a flat RFC 9457 payload directly (resolves #19)
- ESLint enforcement of TODO comment ticket references via `eslint-plugin-todo-tickets`

### Changed

- Monorepo flattened to single-package layout
- Strict TypeScript mode enabled
- `isErrorObject` type guard extracted to separate utility file
- Repository references renamed from `nest-http-problem-details` to `nest-problem-details`

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
