# NestHttpProblemDetails (RFC 9457 / RFC 7807)

[![npm version](https://img.shields.io/npm/v/nest-problem-details-filter)](https://www.npmjs.com/package/nest-problem-details-filter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Main pipeline](https://github.com/Fcmam5/nest-problem-details/actions/workflows/main.yml/badge.svg)](https://github.com/Fcmam5/nest-problem-details/actions/workflows/main.yml) ![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Fcmam5/nest-problem-details?utm_source=oss&utm_medium=github&utm_campaign=Fcmam5%2Fnest-problem-details&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

Make NestJS return [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457) (formerly [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807))-compliant **Problem Details for HTTP APIs**.

> Keywords: RFC 9457, RFC 7807, Problem Details, HTTP API errors, NestJS, application/problem+json.

## Features

- **RFC 9457 / RFC 7807 Compliant** - Standardized Problem Details for HTTP APIs
- **Zero Dependencies** - No runtime dependencies
- **TypeScript** - Full type support

<!-- omit from toc --> 
## Table of contents:

- [NestHttpProblemDetails (RFC 9457 / RFC 7807)](#nesthttpproblemdetails-rfc-9457--rfc-7807)
  - [Features](#features)
  - [Usage](#usage)
    - [As a global filter](#as-a-global-filter)
    - [As a module](#as-a-module)
  - [Throwing exceptions](#throwing-exceptions)
  - [Example response](#example-response)
  - [OpenAPI schema](#openapi-schema)
  - [Documentation](#documentation)
  - [Integration tests](#integration-tests)
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

See [`docs/usage.md`](./docs/usage.md) for the full set of examples (including the native `HttpException` form).

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

## Integration tests

The library includes reusable integration tests that run against real NestJS applications backed by Express and Fastify to verify that the problem-details filter works correctly with each HTTP adapter. Tests are defined once in a shared suite and executed per platform.

See the test files under [`tests/`](./tests/) for details.

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
