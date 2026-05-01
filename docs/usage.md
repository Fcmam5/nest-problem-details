# Usage Documentation

## As a global filter

In `main.ts` add `app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)))` as the following:

```ts
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter } from 'nest-problem-details-filter';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));

  // ...
}
```

`HttpExceptionFilter` accepts a base URI if you want to return absolute URIs for your problem types, e.g:

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

## As a module

The library can be imported as a module, and then you can use `HTTP_EXCEPTION_FILTER_KEY` to set `APP_FILTER`:

```typescript
import { APP_FILTER } from '@nestjs/core';
import {
  NestProblemDetailsModule,
  HTTP_EXCEPTION_FILTER_KEY,
} from 'nest-problem-details-filter';

@Module({
  imports: [NestProblemDetailsModule],
  // ...
  providers: [
    {
      provide: APP_FILTER,
      useExisting: HTTP_EXCEPTION_FILTER_KEY,
    },
    // ...
  ],
})
```

See:

- [Custom providers: Alias providers (`useExisting`)](https://docs.nestjs.com/fundamentals/custom-providers#alias-providers-useexisting)
- [Using `APP_FILTER` token](https://docs.nestjs.com/exception-filters#binding-filters)

## Throwing exceptions

You can produce a Problem Details response in two ways.

### Recommended: `ProblemDetailsException`

A dedicated exception that accepts a flat RFC 9457 payload directly — no nesting required. Custom extension members (e.g. `balance`, `accounts`) are forwarded as-is.

```ts
import { ProblemDetailsException } from 'nest-problem-details-filter';

throw new ProblemDetailsException({
  type: 'out-of-credit',
  title: 'You do not have enough credit.',
  status: 403,
  detail: 'Your balance is 30, but that costs 50.',
  instance: '/account/12345/msgs/abc',
  balance: 30,
  accounts: ['/account/12345', '/account/67890'],
});
```

Produces:

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json; charset=utf-8

{
  "type": "out-of-credit",
  "title": "You do not have enough credit.",
  "status": 403,
  "detail": "Your balance is 30, but that costs 50.",
  "instance": "/account/12345/msgs/abc",
  "balance": 30,
  "accounts": ["/account/12345", "/account/67890"]
}
```

#### Optional `type`

`type` is the only optional field on `ProblemDetailsInput`. When omitted, the filter resolves it from its status-to-type map (or falls back to `about:blank`, per [RFC 9457 §4.2.1](https://datatracker.ietf.org/doc/html/rfc9457#section-4.2.1)).

```ts
throw new ProblemDetailsException({
  status: 404,
  title: 'Dragon not found',
});
// → { "type": "not-found", "title": "Dragon not found", "status": 404 }
```

### Alternative: native `HttpException`

The filter also recognizes the nested `{ message, error }` shape produced by NestJS built-ins (`NotFoundException`, `ForbiddenException`, etc.) and any custom `HttpException`:

```ts
throw new HttpException(
  {
    message: 'You do not have enough credit.',
    error: {
      type: 'out-of-credit',
      detail: 'Your balance is 30, but that costs 50.',
      balance: 30,
    },
  },
  403,
);
```

Both forms produce identical responses; prefer `ProblemDetailsException` for new code.

## Retry-After header

[RFC 9457 §4](https://datatracker.ietf.org/doc/html/rfc9457#section-4) permits problem types to specify the `Retry-After` response header (defined in [RFC 9110 §10.2.3](https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.3)). Common cases are `503 Service Unavailable` (maintenance / backpressure) and `429 Too Many Requests` (rate limiting, per [RFC 6585](https://datatracker.ietf.org/doc/html/rfc6585#section-4)). The library imposes no status restriction — set `retryAfter` on any error response where indicating a retry delay is appropriate.

`ProblemDetailsException` accepts an optional `retryAfter` field. The filter sets the `Retry-After` HTTP header and **strips the value from the JSON body** — `Retry-After` is header semantics, not problem-detail body semantics.

Three input forms are accepted:

| Type     | Meaning                                    | On-wire format                                |
|----------|--------------------------------------------|-----------------------------------------------|
| `number` | Non-negative delta-seconds                 | Integer string; fractional values rounded up  |
| `Date`   | Absolute retry instant                     | IMF-fixdate via `Date.toUTCString()`          |
| `string` | Caller-formatted, passed through unchanged | Whatever you supply (must be non-blank)       |

```ts
// Rate limiting — delta-seconds:
throw new ProblemDetailsException({
  type: 'rate-limit-exceeded',
  title: 'Too Many Requests',
  status: 429,
  detail: 'Quota exceeded.',
  retryAfter: 3600,
});
```

Produces:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json; charset=utf-8
Retry-After: 3600

{
  "type": "rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Quota exceeded."
}
```

```ts
// Scheduled maintenance — absolute date:
throw new ProblemDetailsException({
  type: 'service-maintenance',
  title: 'Service Unavailable',
  status: 503,
  detail: 'Maintenance window in progress.',
  retryAfter: new Date('2026-04-30T06:00:00Z'),
});
// → Retry-After: Thu, 30 Apr 2026 06:00:00 GMT
```

Invalid values (negative seconds, non-finite numbers, invalid `Date`) are silently dropped — no header is emitted rather than a malformed one.

> **Note**: `retryAfter` lives on the exception instance, not the JSON body. The filter reads it via `exception.retryAfter`, so any custom `HttpException` subclass that exposes the same field will also produce the header.

### With Nest's native exceptions

The duck-typed read means you can extend any built-in Nest exception (`ServiceUnavailableException`, `HttpException`, etc.) and expose `retryAfter` as an instance property — no need to switch to `ProblemDetailsException`:

```ts
import { ServiceUnavailableException } from '@nestjs/common';
import { RetryAfterValue } from 'nest-problem-details-filter';

export class MaintenanceException extends ServiceUnavailableException {
  constructor(
    public readonly retryAfter: RetryAfterValue,
    message = 'Maintenance window in progress.',
  ) {
    super(message);
  }
}

// Usage:
throw new MaintenanceException(300); // → Retry-After: 300
throw new MaintenanceException(new Date('2026-04-30T06:00:00Z'));
```

The filter sets `Retry-After` from `exception.retryAfter` regardless of which `HttpException` subclass produced the exception.

## Swagger / OpenAPI

If you use `@nestjs/swagger`, import `@ApiProblemResponse` from the `nest-problem-details-filter/swagger` subpath to document `application/problem+json` responses on your endpoints:

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

The decorator is stackable: apply once per status code you want documented. It auto-generates:

- The canonical `ProblemDetails` schema under `content['application/problem+json']`
- A response example with `type`, `title`, and `status`
- The `Retry-After` header schema when `retryAfter` is provided

### Aligning with `BASE_PROBLEMS_URI`

If your filter is configured with a `BASE_PROBLEMS_URI`, pass the same value as `baseUri` so the documented example matches the wire format:

```ts
@ApiProblemResponse({
  status: 404,
  type: 'not-found',
  baseUri: 'https://api.example.com/problems',
})
// OpenAPI example type → "https://api.example.com/problems/not-found"
```

Absolute references (`about:blank`, `https://…`) are passed through untouched per RFC 9457 §4.2.1.

> **Preview**: [`tests/fixtures/swagger-document.json`](../tests/fixtures/swagger-document.json) is a real OpenAPI 3.0 JSON generated by the integration test — copy it into [editor.swagger.io](https://editor.swagger.io) to see how the decorator renders.

## Example responses

### Default Nest `NotFoundException` handler

```bash
curl -i http://localhost:3333/some-wrong-path
```

Response:

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8

{
  "type": "not-found",
  "title": "Cannot GET /some-wrong-path",
  "status": 404,
  "detail": "Not Found"
}
```

### Throwing a `HttpException` with no parameters

Code:

```js
throw new NotFoundException();
```

Response:

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8

{
  "type": "not-found",
  "title": "Not Found",
  "status": 404
}
```

### Throwing a `HttpException` with a title

Code:

```js
throw new NotFoundException('Dragon not found');
```

Response:

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Not Found"
}
```

### Throwing a `HttpException` with a title and description

Code:

```js
throw new NotFoundException(
  'Dragon not found',
  `Could not find any dragon with ID: ${id}`
);
```

Response:

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Could not find any dragon with ID: 99"
}
```
