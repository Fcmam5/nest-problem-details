# NestHttpProblemDetails (RFC 9457 / RFC 7807)

[![npm version](https://img.shields.io/npm/v/nest-problem-details-filter)](https://www.npmjs.com/package/nest-problem-details-filter)
[![install size](https://packagephobia.com/badge?p=nest-problem-details-filter)](https://packagephobia.com/result?p=nest-problem-details-filter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Main pipeline](https://github.com/Fcmam5/nest-problem-details/actions/workflows/main.yml/badge.svg)](https://github.com/Fcmam5/nest-problem-details/actions/workflows/main.yml) ![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Fcmam5/nest-problem-details?utm_source=oss&utm_medium=github&utm_campaign=Fcmam5%2Fnest-problem-details&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews) [![Coverage Status](https://coveralls.io/repos/github/Fcmam5/nest-problem-details/badge.svg?branch=develop)](https://coveralls.io/github/Fcmam5/nest-problem-details?branch=develop)

Make NestJS return [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457) (formerly [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807))-compliant **Problem Details for HTTP APIs**. Drop in one filter — no code changes — and every error in your app starts speaking `application/problem+json`.

> Keywords: RFC 9457, RFC 7807, Problem Details, HTTP API errors, NestJS, application/problem+json.

## Quick start

```bash
npm i nest-problem-details-filter
```

```ts
// main.ts
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from 'nest-problem-details-filter';
import { AppModule } from './app/app.module';

const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
```

Every `HttpException` your app throws now serializes to `application/problem+json`:

```diff
- HTTP/1.1 404 Not Found
- Content-Type: application/json
- { "statusCode": 404, "message": "Dragon not found" }
+ HTTP/1.1 404 Not Found
+ Content-Type: application/problem+json
+ { "type": "not-found", "title": "Dragon not found", "status": 404 }
```

See [Usage](#usage) for module setup, `Retry-After`, validation errors, and Swagger.

## Features

- **RFC 9457 / RFC 7807 Compliant** - Standardized Problem Details for HTTP APIs
- **Strict RFC 9457 defaults** - `strictRfcDefaults: true` opts into spec-correct `title`/`detail` mapping and `about:blank` type for any exception lacking an explicit caller-supplied type (see [Strict RFC 9457 defaults](#strict-rfc-9457-defaults))
- **`Retry-After` header support** - Per RFC 9110 §10.2.3, opt-in via `ProblemDetailsException` or any `HttpException` subclass exposing `retryAfter`
- **Swagger / OpenAPI decorator (optional)** - `@ApiProblemResponse()` via `nest-problem-details-filter/swagger` subpath auto-documents `application/problem+json` without forcing `@nestjs/swagger` on users who don't need it
- **Docs / runtime alignment** - Shared resolvers guarantee OpenAPI examples match the wire format (status-to-type map, title fallbacks, base-URI resolution)
- **Flexible validation error handling** - Three approaches from zero-config to full RFC 9457 JSON Pointer compliance (see [Validation errors](#validation-errors))
- **Machine-readable error codes** - NestJS 12's `errorCode` is surfaced as an RFC 9457 `errorCode` extension member (see [Throwing exceptions](#throwing-exceptions))
- **Zero runtime dependencies** - Core filter has no runtime dependencies

## Table of contents: <!-- omit from toc -->

- [NestHttpProblemDetails (RFC 9457 / RFC 7807)](#nesthttpproblemdetails-rfc-9457--rfc-7807)
  - [Quick start](#quick-start)
  - [Features](#features)
  - [Usage](#usage)
    - [As a global filter](#as-a-global-filter)
      - [Suppressing `detail` in production](#suppressing-detail-in-production)
      - [Strict RFC 9457 defaults](#strict-rfc-9457-defaults)
    - [As a module](#as-a-module)
    - [Throwing exceptions](#throwing-exceptions)
      - [`Retry-After` header](#retry-after-header)
    - [Swagger / OpenAPI](#swagger--openapi)
    - [Example response](#example-response)
    - [OpenAPI schema](#openapi-schema)
    - [Documentation](#documentation)
    - [Validation errors](#validation-errors)
      - [Approach 1 — Zero config](#approach-1--zero-config)
      - [Approach 2 — Field-map via `BadRequestException`](#approach-2--field-map-via-badrequestexception)
      - [Approach 3 — `ProblemDetailsException` (field-map or RFC pointer array)](#approach-3--problemdetailsexception-field-map-or-rfc-pointer-array)
  - [Development](#development)
    - [Tests](#tests)
    - [Mock app](#mock-app)
    - [Lint \& format](#lint--format)
    - [Build](#build)
  - [Resources](#resources)
  - [Contributing](#contributing)
  - [Security](#security)
  - [License](#license)

## Usage

Install the library with:

```bash
# npm
npm i nest-problem-details-filter

# or, pnpm
pnpm i nest-problem-details-filter
```

Then check [NestJS documentation](https://docs.nestjs.com/exception-filters#binding-filters) on how to bind exception filters.

### As a global filter

In `main.ts` add `app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)))` as the following

```ts
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter } from 'nest-problem-details-filter';
import { AppModule } from './app/app.module';

async function bootstrap() {
  ...

  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));

  ...
}
```

Note that the `app.get(HttpAdapterHost)` argument is needed because the `HttpExceptionFilter` works for any kind of [NestJS HTTP adapter](https://docs.nestjs.com/faq/http-adapter)!

`HttpExceptionFilter` accepts a base URI for if you want to return absolute URIs for your problem types, e.g:

```ts
app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost), 'https://example.org'));
```

Will return:

```json
{
  "type": "https://example.org/not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Could not find any dragon with ID: 99"
}
```

#### Suppressing `detail` in production

> **Recommended for production deployments.** The `detail` field can expose internal error messages to clients. Use the `suppressDetail` option to omit it — either always, or based on custom logic.

When you use Nest's built-in exceptions (e.g. `NotFoundException`, `BadRequestException`) or throw a plain `HttpException` without a custom `ProblemDetailsException`, the filter maps the exception's built-in message directly into `detail`. This means stack traces, database error strings, or other sensitive messages can leak to the client without any extra effort on your part.

For example, throwing `new InternalServerErrorException('Database connection timeout')` will produce:

```json
{
  "type": "internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Database connection timeout"
}
```

The `suppressDetail` option accepts either a boolean or a callback:

```ts
import { HttpExceptionFilter, SuppressDetail } from 'nest-problem-details-filter';

// Always suppress detail on every response:
app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost), '', undefined, true));

// Or suppress selectively with a callback:
app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost), '', undefined, ({ status }) => status >= 500));
```

With the callback above, `detail` is stripped from all 5xx responses while remaining visible on 4xx responses (where it is typically safe and useful, e.g. validation messages). See [`docs/usage.md`](./docs/usage.md#suppressing-detail-in-production) for the full API including the `SUPPRESS_DETAIL_KEY` DI token for module usage.

#### Strict RFC 9457 defaults

By default the filter preserves the legacy `title`/`detail` field mapping for backward compatibility. Enable `strictRfcDefaults` to get fully spec-compliant behavior for any exception that lacks an explicit caller-supplied type:

```ts
// global filter
app.useGlobalFilters(
  new HttpExceptionFilter(app.get(HttpAdapterHost), '', undefined, undefined, true),
);

// or via the module
NestProblemDetailsModule.register({ strictRfcDefaults: true })
```

With `strictRfcDefaults: true`:

| Throw | `type` | `title` | `detail` |
|---|---|---|---|
| `new NotFoundException('Baked goods not found')` | `about:blank` | `Not Found` | `Baked goods not found` |
| `new NotFoundException()` | `about:blank` | `Not Found` | `Not Found` |
| `new HttpException('Custom msg', 418)` | `about:blank` | `I'm a Teapot` | `Custom msg` |

Without the flag (default), the legacy mapping is used. For Nest built-in exceptions (object responses with a string `error` field such as `NotFoundException`), the caller message goes to `title` and the HTTP error string (e.g. `"Not Found"`) to `detail`. For plain string responses such as `new HttpException('Custom msg', 418)`, the message maps to `title` and `detail` remains unset.

> **Migration path:** `strictRfcDefaults` defaults to `false` in v1.x. In v2 (next major) it will default to `true` — pass `false` explicitly to keep legacy behavior. In the major release after that, the flag will be removed and strict mode will be the only behavior.
>
> **Note:** `strictRfcDefaults` applies to any exception without an explicit `type`: both plain `HttpException` / built-in Nest exceptions and `ProblemDetailsException` instances missing an explicit type emit `about:blank`. Explicit types and details set via `ProblemDetailsException` or the `error` object form are always preserved as-is.

See [`docs/usage.md`](./docs/usage.md#strict-rfc-9457-defaults) for more details.

### As a module

The library ships as a [dynamic module](https://docs.nestjs.com/fundamentals/dynamic-modules). Use `register()` (or `registerAsync()`) to configure it, and `HTTP_EXCEPTION_FILTER_KEY` to bind it to `APP_FILTER`:

```typescript
import { APP_FILTER } from '@nestjs/core';
import { NestProblemDetailsModule, HTTP_EXCEPTION_FILTER_KEY } from 'nest-problem-details-filter';

@Module({
  imports: [
    NestProblemDetailsModule.register({
      baseUri: 'https://api.example.org/problems',
      httpErrorsMap: { 418: 'teapot-error' },
      suppressDetail: ({ status }) => status >= 500,
      strictRfcDefaults: true,
    }),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useExisting: HTTP_EXCEPTION_FILTER_KEY,
    },
  ],
})
export class AppModule {}
```

For config-driven setups, `registerAsync()` resolves options from a factory:

```typescript
NestProblemDetailsModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    baseUri: config.get('PROBLEMS_BASE_URI'),
  }),
});
```

Importing `NestProblemDetailsModule` directly (without calling `register()`) still works and uses sensible defaults. The legacy pattern of overriding `BASE_PROBLEMS_URI_KEY`, `HTTP_ERRORS_MAP_KEY` and `SUPPRESS_DETAIL_KEY` providers manually is also still supported.

See:

- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [Custom providers: Alias providers (`useExisting`)](https://docs.nestjs.com/fundamentals/custom-providers#alias-providers-useexisting)
- [Using `APP_FILTER` token](https://docs.nestjs.com/exception-filters#binding-filters)

### Throwing exceptions

To produce a Problem Details response, throw either:

- `ProblemDetailsException` — accepts a flat RFC 9457 payload directly (recommended for new code), or
- a native `HttpException` (`NotFoundException`, `ForbiddenException`, custom subclasses, ...) — the filter recognizes the standard Nest payload shape.

```ts
import { ProblemDetailsException } from 'nest-problem-details-filter';

throw new ProblemDetailsException({
  type: 'out-of-credit',
  title: 'You do not have enough credit.',
  status: 403,
  detail: 'Your balance is 30, but that costs 50.',
  balance: 30,
});
```

`type` is optional; when omitted, the filter resolves it from its status-to-type map (or falls back to `about:blank`, per RFC 9457 §4.2.1).

#### `Retry-After` header

Pass `retryAfter` as a number (delta-seconds), `Date` (absolute), or pre-formatted string on any retriable error response. The filter sets the `Retry-After` header per [RFC 9110 §10.2.3](https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.3) and strips the value from the JSON body. Common cases are `429 Too Many Requests` (rate limiting) and `503 Service Unavailable` (maintenance / backpressure), but the library imposes no status restriction.

```ts
throw new ProblemDetailsException({
  type: 'rate-limit-exceeded',
  title: 'Too Many Requests',
  status: 429,
  detail: 'Quota exceeded.',
  retryAfter: 3600, // → "Retry-After: 3600"
});
```

The filter reads `retryAfter` from any `HttpException` instance (duck-typed), so you can extend Nest's built-in exceptions instead:

```ts
import { ServiceUnavailableException } from '@nestjs/common';
import { RetryAfterValue } from 'nest-problem-details-filter';

class MaintenanceException extends ServiceUnavailableException {
  constructor(public readonly retryAfter: RetryAfterValue) {
    super('Maintenance window in progress.');
  }
}

throw new MaintenanceException(300); // → "Retry-After: 300"
```

See [`docs/usage.md`](./docs/usage.md) for the full set of examples (including the native `HttpException` form and `Retry-After` details).

### Swagger / OpenAPI

If you use `@nestjs/swagger`, import `@ApiProblemResponse` from the `nest-problem-details-filter/swagger` subpath to document `application/problem+json` responses:

```ts
import { ApiProblemResponse } from 'nest-problem-details-filter/swagger';

@Controller('dragons')
export class DragonsController {
  @Get(':id')
  @ApiProblemResponse({ status: 404, type: 'not-found', title: 'Dragon not found' })
  @ApiProblemResponse({ status: 429, type: 'rate-limit-exceeded', retryAfter: 3600 })
  findOne(@Param('id') id: string) { ... }
}
```

The decorator is **stackable**: apply once per status code. It auto-generates:

- The canonical `ProblemDetails` schema under `content['application/problem+json']`
- A response example with `type`, `title`, and `status`
- The `Retry-After` header schema when `retryAfter` is provided

If your filter is configured with a `BASE_PROBLEMS_URI`, pass the same value as `baseUri` so the OpenAPI docs match the runtime wire format:

```ts
@ApiProblemResponse({ status: 404, type: 'not-found', baseUri: 'https://api.example.com/problems' })
// OpenAPI example type → "https://api.example.com/problems/not-found"
```

Likewise, if you override the default status-to-type map via `HTTP_ERRORS_MAP_KEY`, pass the same map as `httpErrors`:

```ts
@ApiProblemResponse({ status: 404, httpErrors: { 404: 'missing-resource' } })
// OpenAPI example type → "missing-resource" (not the built-in default)
```

By default the decorator inlines the schema in every response so it works out of the box. If you want a named `ProblemDetails` entry in Swagger UI's **Schemas** section, call `addProblemDetailsSchema()` after creating the document:

```ts
import { addProblemDetailsSchema } from 'nest-problem-details-filter/swagger';

const document = SwaggerModule.createDocument(app, builder);
addProblemDetailsSchema(document);
```

See [`docs/usage.md`](./docs/usage.md) for the full decorator API (custom schemas, explicit `examples`, `headers`, etc.).

> **Preview**: copy [`tests/fixtures/swagger-document.json`](./tests/fixtures/swagger-document.json) and paste it into [editor.swagger.io](https://editor.swagger.io) to see how the decorator renders in Swagger UI.

### Example response

```bash
# curl -i http://localhost:3333/api/dragons/99?title=true&details=true

HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8
Content-Length: 109
...

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Could not find any dragon with ID: 99"
}
```

### OpenAPI schema

Full JSON Schema and OpenAPI 3.0 definitions are available in [`docs/openapi.md`](./docs/openapi.md).

```yaml
components:
  schemas:
    ProblemDetails:
      type: object
      description: >
        Problem Details object as defined by RFC 9457 (formerly RFC 7807).
        Returned with media type `application/problem+json`.
      required:
        - type
        - title
        - status
      properties:
        type:
          type: string
          format: uri-reference
          maxLength: 1024
          default: 'about:blank'
          description: >
            A URI reference that identifies the problem type. Per RFC 9457
            this is a URI-reference (may be relative). Defaults to
            "about:blank" when not provided.
          example: 'about:blank'
        title:
          type: string
          maxLength: 1024
          description: >
            A short, human-readable summary of the problem type. It should
            not change from occurrence to occurrence of the problem, except
            for purposes of localization.
          example: 'Not Found'
        status:
          type: integer
          format: int32
          minimum: 100
          maximum: 599
          description: >
            The HTTP status code generated by the origin server for this
            occurrence of the problem.
          example: 404
        detail:
          type: string
          maxLength: 4096
          description: >
            A human-readable explanation specific to this occurrence of the
            problem.
          example: 'Could not find any dragon with ID: 99'
        instance:
          type: string
          format: uri-reference
          maxLength: 1024
          description: >
            A URI reference that identifies the specific occurrence of the
            problem.
          example: '/dragons/99'
      additionalProperties: true
```

### Documentation

Check the [`docs/`](./docs/) folder for usage examples, the [OpenAPI schema](./docs/openapi.md), and the [RFC 9457 compliance test suite](./docs/rfc9457-compliance.md).

### Validation errors

The filter ships three flexible approaches for surfacing `class-validator` validation errors — all using the `errors` RFC 9457 extension member (not `detail`, per §3.1.4).

> **Peer dependency:** the helpers below require `class-validator` (already a NestJS validation standard). Install it alongside the filter:
>
> ```bash
> npm install class-validator
> ```

#### Approach 1 — Zero config

Just register `ValidationPipe` + `HttpExceptionFilter`. The filter detects the `string[]` message Nest emits and moves it to `errors` automatically ([why not using `details` as array?](./docs/usage.md#validation-error-handling)):

```json
{
  "type": "bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "Bad Request",
  "errors": ["username must be longer than or equal to 3 characters", "email must be an email"]
}
```

#### Approach 2 — Field-map via `BadRequestException`

Use `mapClassValidatorErrors()` in `exceptionFactory` for per-field grouping with dotted-path nesting:

```ts
import { mapClassValidatorErrors } from 'nest-problem-details-filter/class-validator-mappers';

new ValidationPipe({
  exceptionFactory: (e) => new BadRequestException({ message: 'Validation failed', errors: mapClassValidatorErrors(e) }),
});
```

```json
{
  "type": "bad-request",
  "title": "Validation failed",
  "status": 400,
  "errors": {
    "email": ["must be an email"],
    "address.street": ["should not be empty"]
  }
}
```

#### Approach 3 — `ProblemDetailsException` (field-map or RFC pointer array)

Use `toValidationProblemDetails()` for a one-liner that returns a `ProblemDetailsException` directly:

```ts
import { toValidationProblemDetails } from 'nest-problem-details-filter/class-validator-mappers';

// Field-map (default)
new ValidationPipe({ exceptionFactory: (e) => toValidationProblemDetails(e) });

// RFC 9457 JSON Pointer array
new ValidationPipe({ exceptionFactory: (e) => toValidationProblemDetails(e, { usePointers: true }) });
```

Pointer format output:

```json
{
  "type": "validation-error",
  "title": "Validation Failed",
  "status": 400,
  "errors": [
    { "detail": "must be an email", "pointer": "#/email" },
    { "detail": "should not be empty", "pointer": "#/address/street" }
  ]
}
```

See [`docs/usage.md`](./docs/usage.md#validation-error-handling) for the full walkthrough including nested objects, custom validators, and all options.

## Development

### Tests

The library includes reusable integration tests that run against real NestJS applications backed by **Express** and **Fastify** to verify that the filter works correctly with each HTTP adapter.

```bash
# Run all tests (unit + integration)
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:cov
```

A dedicated suite in [`tests/rfc9457/`](./tests/rfc9457/) checks the wire
format against the normative text of RFC 9457, section by section — see
[`docs/rfc9457-compliance.md`](./docs/rfc9457-compliance.md) for the layout,
what's covered, and known gaps (tracked via `TODO #<issue>` markers on any
skipped test).

> **Disclaimer:** the RFC 9457 compliance suite was generated with AI
> assistance, prompted to read the RFC directly and derive tests from
> its MUST/SHOULD statements for #44, then reviewed by a maintainer. It isn't
> guaranteed to be a complete or perfectly faithful reading of the spec — if
> you find a gap or a misreading, please
> [file an issue](https://github.com/Fcmam5/nest-problem-details/issues/new)
> and/or a PR.

### Mock app

A local NestJS server is available for manual testing and exploring the Swagger / OpenAPI output. It reuses the same controllers as the integration tests, decorated with `@ApiProblemResponse` so the generated spec includes `application/problem+json` response examples.

```bash
# Start the mock app (reuses the same controllers as the integration tests)
npm run start:mock
```

- API endpoints: `http://localhost:3000/api/test/...`
- Swagger UI: `http://localhost:3000/api`

The mock app automatically restarts when you edit `tests/mock-main.ts` or `tests/test-app.module.ts`.

### Lint & format

```bash
npm run lint        # ESLint check (no auto-fix; fails on issues)
npm run lint:fix    # ESLint with --fix
npm run format      # Prettier (src/**/*.ts)
```

### Build

```bash
npm run build       # Compiles src/ → dist/ via nest build
```

## Resources

- [IETF RFC 9457: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457) (obsoletes RFC 7807)
- [IETF RFC 7807: Problem Details for HTTP APIs (obsoleted)](https://datatracker.ietf.org/doc/html/rfc7807)
- [Zalando RESTful API:](https://opensource.zalando.com/restful-api-guidelines/#176)
- And of course, Nest's awesome community:
  - [Exception filters](https://docs.nestjs.com/exception-filters#exception-filters-1)
  - [@kamilmysliwiec's comment](https://github.com/nestjs/nest/issues/2953#issuecomment-531678153)

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Security

For security-related issues, please review our [SECURITY.md](./SECURITY.md) for responsible disclosure guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details
