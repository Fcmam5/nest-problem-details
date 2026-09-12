# Usage Documentation

- [Usage Documentation](#usage-documentation)
  - [As a global filter](#as-a-global-filter)
    - [Suppressing `detail` in production](#suppressing-detail-in-production)
    - [Strict RFC 9457 defaults](#strict-rfc-9457-defaults)
  - [As a module](#as-a-module)
    - [`registerAsync()`](#registerasync)
    - [Static (zero-config) usage](#static-zero-config-usage)
  - [Throwing exceptions](#throwing-exceptions)
    - [Recommended: `ProblemDetailsException`](#recommended-problemdetailsexception)
      - [Optional `type`](#optional-type)
    - [Alternative: native `HttpException`](#alternative-native-httpexception)
    - [Machine-readable error codes (`errorCode`)](#machine-readable-error-codes-errorcode)
  - [Retry-After header](#retry-after-header)
    - [With Nest's native exceptions](#with-nests-native-exceptions)
  - [Swagger / OpenAPI](#swagger--openapi)
    - [Registering a named `ProblemDetails` model](#registering-a-named-problemdetails-model)
    - [Aligning with `BASE_PROBLEMS_URI`](#aligning-with-base_problems_uri)
    - [Aligning with `HTTP_ERRORS_MAP_KEY`](#aligning-with-http_errors_map_key)
  - [Example responses](#example-responses)
    - [Default Nest `NotFoundException` handler](#default-nest-notfoundexception-handler)
    - [Throwing a `HttpException` with no parameters](#throwing-a-httpexception-with-no-parameters)
    - [Throwing a `HttpException` with a title](#throwing-a-httpexception-with-a-title)
    - [Throwing a `HttpException` with a title and description](#throwing-a-httpexception-with-a-title-and-description)
  - [Validation error handling](#validation-error-handling)
    - [Approach 1 — Zero config (default `ValidationPipe`)](#approach-1--zero-config-default-validationpipe)
    - [Approach 2 — `BadRequestException` with `exceptionFactory`](#approach-2--badrequestexception-with-exceptionfactory)
    - [Approach 3A — `ProblemDetailsException` with field-map (shorthand)](#approach-3a--problemdetailsexception-with-field-map-shorthand)
    - [Approach 3B — `ProblemDetailsException` with RFC 9457 JSON Pointer array](#approach-3b--problemdetailsexception-with-rfc-9457-json-pointer-array)
    - [Exported helpers summary](#exported-helpers-summary)

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

### Suppressing `detail` in production

> **Recommended for production deployments.** The `detail` field can expose internal error messages to clients. Use the `suppressDetail` option to omit it — either always, or based on custom logic.

Pass `true` as the fourth constructor argument to suppress `detail` on every response:

```ts
import { HttpExceptionFilter } from 'nest-problem-details-filter';

app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost), '', undefined, true));
```

Or pass a callback for conditional suppression. When the callback returns `true`, `detail` is omitted:

```ts
import { HttpExceptionFilter, SuppressDetail } from 'nest-problem-details-filter';

const suppress: SuppressDetail = ({ status }) => status >= 500;

app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost), '', undefined, suppress));
```

The callback receives a `SuppressDetailContext` with three fields:

| Field       | Type            | Description                      |
| ----------- | --------------- | -------------------------------- |
| `status`    | `number`        | HTTP status code of the response |
| `type`      | `string`        | Resolved problem type URI        |
| `exception` | `HttpException` | The original caught exception    |

This allows fine-grained control:

```ts
// Hide detail for all 5xx errors
({ status }) => status >= 500

// Hide detail only for a specific problem type
({ type }) => type === 'about:blank'

// Keep detail visible for known safe exceptions, hide for everything else 5xx
({ status, exception }) =>
  status >= 500 && !(exception instanceof MyKnownSafeException)
```

When using the module, pass `suppressDetail` to `register()`:

```ts
import { NestProblemDetailsModule, HTTP_EXCEPTION_FILTER_KEY } from 'nest-problem-details-filter';

@Module({
  imports: [
    NestProblemDetailsModule.register({
      suppressDetail: ({ status }) => status >= 500, // or: true
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

> **Legacy:** if you import `NestProblemDetailsModule` statically, you can still override the `SUPPRESS_DETAIL_KEY` provider directly:
>
> ```ts
> { provide: SUPPRESS_DETAIL_KEY, useValue: true }
> ```

When `detail` is suppressed, the response omits the field entirely:

```json
{
  "type": "internal-server-error",
  "title": "Something went wrong",
  "status": 500
}
```

### Strict RFC 9457 defaults

By default the filter uses a legacy `title`/`detail` mapping for backward compatibility. Enable `strictRfcDefaults` to opt into fully spec-correct behavior for any exception that lacks an explicit caller-supplied `type`.

**What it changes:**

| Aspect | Default (`false`) | Strict (`true`) |
|---|---|---|
| `type` for plain exceptions | status-code slug (e.g. `not-found`) | `about:blank` (RFC 9457 §4.2.1) |
| Caller message (`NotFoundException('Baked goods not found')`) | → `title` | → `detail` |
| `title` for plain exceptions | caller message | HTTP reason phrase (`Not Found`) |

**Global filter:**

```ts
app.useGlobalFilters(
  new HttpExceptionFilter(
    app.get(HttpAdapterHost),
    '',        // baseUri
    undefined, // httpErrorsMap
    undefined, // suppressDetail
    true,      // strictRfcDefaults
  ),
);
```

**Module:**

```ts
NestProblemDetailsModule.register({ strictRfcDefaults: true })
```

**Before and after:**

```ts
throw new NotFoundException('Baked goods not found');
```

```diff
- { "type": "not-found",    "title": "Baked goods not found", "status": 404, "detail": "Not Found" }
+ { "type": "about:blank",  "title": "Not Found",             "status": 404, "detail": "Baked goods not found" }
```

**Rules:**

- Only applies when the caller has not explicitly set a `type` or `detail` (via `ProblemDetailsException` or the `error` object form). Explicit values are always preserved.
- When no explicit message is passed (e.g. `new NotFoundException()`), NestJS sets `message` to the HTTP reason phrase; in strict mode that still goes to `detail`, so `title` and `detail` will both be `"Not Found"`. Use `suppressDetail` if the redundancy is unwanted.
- **Migration path:** `strictRfcDefaults` defaults to `false` in v1.x. In the next major release (v2) it will default to `true` — pass `false` explicitly to keep legacy behavior. In the release after that, the flag will be removed and strict mode will be the only behavior.

> **Legacy token override:** if you import `NestProblemDetailsModule` statically you can still override the provider directly:
>
> ```ts
> { provide: STRICT_RFC_DEFAULTS_KEY, useValue: true }
> ```

## As a module

The library ships as a [dynamic module](https://docs.nestjs.com/fundamentals/dynamic-modules). The recommended pattern is `NestProblemDetailsModule.register()`:

```typescript
import { APP_FILTER } from '@nestjs/core';
import { NestProblemDetailsModule, HTTP_EXCEPTION_FILTER_KEY } from 'nest-problem-details-filter';

@Module({
  imports: [
    NestProblemDetailsModule.register({
      baseUri: 'https://api.example.org/problems',
      httpErrorsMap: { 418: 'teapot-error' },
      suppressDetail: ({ status }) => status >= 500,
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

`register()` accepts:

| Option              | Type                          | Default               | Description                                                                        |
| ------------------- | ----------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `baseUri`           | `string`                      | `''`                  | Base URI prepended to every problem `type`.                                        |
| `httpErrorsMap`     | `Record<number, string>`      | `DEFAULT_HTTP_ERRORS` | Status-to-type slug overrides; merged on top of the defaults.                      |
| `suppressDetail`    | `boolean \| (ctx) => boolean` | `undefined`           | See [Suppressing `detail` in production](#suppressing-detail-in-production).       |
| `strictRfcDefaults` | `boolean`                     | `false`               | Opt-in to spec-correct `title`/`detail` mapping and `about:blank` type. See [Strict RFC 9457 defaults](#strict-rfc-9457-defaults). |

### `registerAsync()`

For options sourced from a `ConfigService` or another injectable:

```typescript
NestProblemDetailsModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    baseUri: config.get('PROBLEMS_BASE_URI'),
    suppressDetail: config.get('NODE_ENV') === 'production',
  }),
});
```

### Static (zero-config) usage

Importing `NestProblemDetailsModule` directly without calling `register()` still works and uses sensible defaults (empty `baseUri`, `DEFAULT_HTTP_ERRORS`, no `suppressDetail`):

```typescript
@Module({
  imports: [NestProblemDetailsModule],
  providers: [{ provide: APP_FILTER, useExisting: HTTP_EXCEPTION_FILTER_KEY }],
})
export class AppModule {}
```

The legacy pattern of overriding `BASE_PROBLEMS_URI_KEY`, `HTTP_ERRORS_MAP_KEY` and `SUPPRESS_DETAIL_KEY` providers manually is also still supported for advanced use cases.

See:

- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
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

`type` is optional on `ProblemDetailsInput`. When omitted, the filter resolves it from its status-to-type map (or falls back to `about:blank`, per [RFC 9457 §4.2.1](https://datatracker.ietf.org/doc/html/rfc9457#section-4.2.1)).

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

### Machine-readable error codes (`errorCode`)

NestJS 12 added `HttpExceptionOptions.errorCode` — a stable identifier clients can branch on instead of parsing message strings. The filter surfaces it as an RFC 9457 extension member named `errorCode`:

```ts
throw new BadRequestException('Password is too weak', {
  errorCode: 'WEAK_PASSWORD',
});
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "bad-request",
  "title": "Password is too weak",
  "status": 400,
  "detail": "Bad Request",
  "errorCode": "WEAK_PASSWORD"
}
```

The `errorCode` member is omitted when no code is set.

## Retry-After header

[RFC 9457 §4](https://datatracker.ietf.org/doc/html/rfc9457#section-4) permits problem types to specify the `Retry-After` response header (defined in [RFC 9110 §10.2.3](https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.3)). Common cases are `503 Service Unavailable` (maintenance / backpressure) and `429 Too Many Requests` (rate limiting, per [RFC 6585](https://datatracker.ietf.org/doc/html/rfc6585#section-4)). The library imposes no status restriction — set `retryAfter` on any error response where indicating a retry delay is appropriate.

`ProblemDetailsException` accepts an optional `retryAfter` field. The filter sets the `Retry-After` HTTP header and **strips the value from the JSON body** — `Retry-After` is header semantics, not problem-detail body semantics.

Three input forms are accepted:

| Type     | Meaning                                    | On-wire format                               |
| -------- | ------------------------------------------ | -------------------------------------------- |
| `number` | Non-negative delta-seconds                 | Integer string; fractional values rounded up |
| `Date`   | Absolute retry instant                     | IMF-fixdate via `Date.toUTCString()`         |
| `string` | Caller-formatted, passed through unchanged | Whatever you supply (must be non-blank)      |

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

### Registering a named `ProblemDetails` model

By default the decorator inlines the schema in every response so it works out of the box. If you want a named `ProblemDetails` entry to appear in Swagger UI's **Schemas** section, call `addProblemDetailsSchema()` after creating the document:

```ts
import { addProblemDetailsSchema } from 'nest-problem-details-filter/swagger';

const document = SwaggerModule.createDocument(app, builder);
addProblemDetailsSchema(document);
```

This registers `ProblemDetails` under `components.schemas` so Swagger UI shows it as a reusable model.

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

### Aligning with `HTTP_ERRORS_MAP_KEY`

If you override the built-in status-to-type map via `HTTP_ERRORS_MAP_KEY`, pass the same map as `httpErrors` so the documented example uses your custom defaults instead of the built-ins:

```ts
@ApiProblemResponse({
  status: 404,
  httpErrors: { 404: 'missing-resource' },
})
// OpenAPI example type → "missing-resource"
```

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

Response (default, `strictRfcDefaults: false`):

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

Response with `strictRfcDefaults: true` (RFC 9457-correct):

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8

{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Dragon not found"
}
```

### Throwing a `HttpException` with a title and description

Code:

```js
throw new NotFoundException('Dragon not found', `Could not find any dragon with ID: ${id}`);
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

---

## Validation error handling

The library supports three approaches for surfacing `class-validator` errors. Choose the one that fits your use case.

> **Peer dependency:** these helpers require `class-validator` (already a NestJS validation standard). Install it alongside the filter:
>
> ```bash
> npm install class-validator
> ```

> **Why `errors` and not `detail`?**
> RFC 9457 §3.1.4 states: _"Consumers SHOULD NOT parse the `detail` member for information; extensions are more suitable and less error-prone ways to obtain such information."_
> All three approaches use the `errors` extension member, not `detail`.

> **Why not `invalid-params`?**
> `invalid-params` appeared only in an RFC 7807 example and was not standardised in RFC 9457. Avoid it.

---

### Approach 1 — Zero config (default `ValidationPipe`)

Register `HttpExceptionFilter` as usual. When Nest's default `ValidationPipe` rejects a request it throws `BadRequestException` with `message: string[]`. The filter detects this and moves the array into the `errors` extension — **no extra configuration needed**.

```ts
// main.ts
app.useGlobalPipes(new ValidationPipe());
app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
```

```json
{
  "type": "bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "Bad Request",
  "errors": ["username must be longer than or equal to 3 characters", "email must be an email", "address.street should not be empty"]
}
```

Messages are flat (no field grouping) because Nest's default pipe does not expose field keys in its output.

---

### Approach 2 — `BadRequestException` with `exceptionFactory`

Use `mapClassValidatorErrors()` inside `exceptionFactory` to group messages by field name, then throw Nest's built-in `BadRequestException`. The filter picks up the `errors` object and passes it through.

```ts
import { mapClassValidatorErrors } from 'nest-problem-details-filter/class-validator-mappers';

app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (validationErrors) =>
      new BadRequestException({
        message: 'Validation failed',
        errors: mapClassValidatorErrors(validationErrors),
      }),
  }),
);
```

```json
{
  "type": "bad-request",
  "title": "Validation failed",
  "status": 400,
  "errors": {
    "username": ["must be longer than or equal to 3 characters"],
    "email": ["must be an email"],
    "address.street": ["should not be empty"],
    "address.city": ["should not be empty"]
  }
}
```

Nested objects are flattened with dotted-path keys (e.g. `address.street`). Custom validator messages appear under the correct field key just like built-in constraints.

---

### Approach 3A — `ProblemDetailsException` with field-map (shorthand)

Use `toValidationProblemDetails()` for the shortest possible factory. It wraps `mapClassValidatorErrors()` and builds a fully-formed `ProblemDetailsException` in one call.

```ts
import { toValidationProblemDetails } from 'nest-problem-details-filter/class-validator-mappers';

app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (e) => toValidationProblemDetails(e),
  }),
);
```

```json
{
  "type": "validation-error",
  "title": "Validation Failed",
  "status": 400,
  "errors": {
    "username": ["must be longer than or equal to 3 characters"],
    "address.city": ["should not be empty"]
  }
}
```

You can override the defaults:

```ts
exceptionFactory: (e) =>
  toValidationProblemDetails(e, {
    status: 422,
    title: 'Unprocessable Entity',
    type: 'unprocessable-entity',
  });
```

---

### Approach 3B — `ProblemDetailsException` with RFC 9457 JSON Pointer array

Pass `{ usePointers: true }` to `toValidationProblemDetails()` to get strict RFC 9457 compliance. Each violation becomes a `{ detail, pointer }` object where `pointer` is a JSON Pointer (`#/field` or `#/nested/field`).

```ts
import { toValidationProblemDetails } from 'nest-problem-details-filter/class-validator-mappers';

app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (e) => toValidationProblemDetails(e, { usePointers: true }),
  }),
);
```

```json
{
  "type": "validation-error",
  "title": "Validation Failed",
  "status": 400,
  "errors": [
    { "detail": "must be longer than or equal to 3 characters", "pointer": "#/username" },
    { "detail": "must be an email", "pointer": "#/email" },
    { "detail": "should not be empty", "pointer": "#/address/street" }
  ]
}
```

You can also build the pointer array manually via `mapToPointerErrors()` if you need custom filtering or sorting:

```ts
import { mapToPointerErrors, ProblemDetailsException } from 'nest-problem-details-filter/class-validator-mappers';

exceptionFactory: (validationErrors) =>
  new ProblemDetailsException({
    status: 400,
    title: 'Validation Failed',
    type: 'validation-error',
    errors: mapToPointerErrors(validationErrors),
  });
```

---

### Exported helpers summary

| Export                                         | Returns                    | Use case                                                                        |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `mapClassValidatorErrors(errors)`              | `Record<string, string[]>` | Build a field-map to pass to `BadRequestException` or `ProblemDetailsException` |
| `mapToPointerErrors(errors)`                   | `PointerError[]`           | Build an RFC 9457 pointer array manually                                        |
| `toValidationProblemDetails(errors, options?)` | `ProblemDetailsException`  | One-liner `exceptionFactory` for approaches 3A and 3B                           |
