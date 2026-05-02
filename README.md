# NestHttpProblemDetails (RFC 9457 / RFC 7807)

[![npm version](https://img.shields.io/npm/v/nest-problem-details-filter)](https://www.npmjs.com/package/nest-problem-details-filter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Main pipeline](https://github.com/Fcmam5/nest-problem-details/actions/workflows/main.yml/badge.svg)](https://github.com/Fcmam5/nest-problem-details/actions/workflows/main.yml) ![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Fcmam5/nest-problem-details?utm_source=oss&utm_medium=github&utm_campaign=Fcmam5%2Fnest-problem-details&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews) [![Coverage Status](https://coveralls.io/repos/github/Fcmam5/nest-problem-details/badge.svg?branch=develop)](https://coveralls.io/github/Fcmam5/nest-problem-details?branch=develop)

Make NestJS return [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457) (formerly [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807))-compliant **Problem Details for HTTP APIs**.

> Keywords: RFC 9457, RFC 7807, Problem Details, HTTP API errors, NestJS, application/problem+json.

## Features

- **RFC 9457 / RFC 7807 Compliant** - Standardized Problem Details for HTTP APIs
- **`Retry-After` header support** - Per RFC 9110 §10.2.3, opt-in via `ProblemDetailsException` or any `HttpException` subclass exposing `retryAfter`
- **Swagger / OpenAPI decorator (optional)** - `@ApiProblemResponse()` via `nest-problem-details-filter/swagger` subpath auto-documents `application/problem+json` without forcing `@nestjs/swagger` on users who don't need it
- **Docs / runtime alignment** - Shared resolvers guarantee OpenAPI examples match the wire format (status-to-type map, title fallbacks, base-URI resolution)
- **Flexible validation error handling** - Three approaches from zero-config to full RFC 9457 JSON Pointer compliance (see [Validation errors](#validation-errors))
- **Zero runtime dependencies** - Core filter has no runtime dependencies

<!-- omit from toc --> 
## Table of contents:

- [NestHttpProblemDetails (RFC 9457 / RFC 7807)](#nesthttpproblemdetails-rfc-9457--rfc-7807)
  - [Features](#features)
  - [Usage](#usage)
    - [As a global filter](#as-a-global-filter)
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

### As a module

The library can be imported as a module, and then can use `HTTP_EXCEPTION_FILTER_KEY` to set `APP_FILTER`

```typescript
import { APP_FILTER } from '@nestjs/core';
import {
  NestProblemDetailsModule,
  HTTP_EXCEPTION_FILTER_KEY,
} from 'nest-problem-details-filter';

@Module({
  imports: [NestProblemDetailsModule],
  ...
  providers: [
    {
      provide: APP_FILTER,
      useExisting: HTTP_EXCEPTION_FILTER_KEY,
    },
    ...
  ],
})
```

See:

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

Check the [`docs/`](./docs/) folder for usage examples and the [OpenAPI schema](./docs/openapi.md).

### Validation errors

The filter ships three flexible approaches for surfacing `class-validator` validation errors — all using the `errors` RFC 9457 extension member (not `detail`, per §3.1.4).

> **Peer dependency:** the helpers below require `class-validator` (already a NestJS validation standard). Install it alongside the filter:
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
  "errors": [
    "username must be longer than or equal to 3 characters",
    "email must be an email"
  ]
}
```

#### Approach 2 — Field-map via `BadRequestException`

Use `mapClassValidatorErrors()` in `exceptionFactory` for per-field grouping with dotted-path nesting:

```ts
import { mapClassValidatorErrors } from 'nest-problem-details-filter/class-validator-mappers';

new ValidationPipe({
  exceptionFactory: (e) =>
    new BadRequestException({ message: 'Validation failed', errors: mapClassValidatorErrors(e) }),
})
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
new ValidationPipe({ exceptionFactory: (e) => toValidationProblemDetails(e) })

// RFC 9457 JSON Pointer array
new ValidationPipe({ exceptionFactory: (e) => toValidationProblemDetails(e, { usePointers: true }) })
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
npm run lint        # ESLint with auto-fix
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
