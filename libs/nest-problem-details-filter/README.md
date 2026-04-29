# NestHttpProblemDetails (RFC 9457 / RFC 7807)

A NestJS exception filter to convert JSON responses to [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457) (formerly [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807))-compliant **Problem Details for HTTP APIs**. This standardizes HTTP API error responses and sets `Content-Type` to `application/problem+json`.

> Keywords: RFC 9457, RFC 7807, Problem Details, HTTP API errors, NestJS, application/problem+json.

#### Usage

Install the library with:

```bash
# npm
npm i nest-problem-details-filter

# or, pnpm
pnpm i nest-problem-details-filter
```

Then check [NestJS documentation](https://docs.nestjs.com/exception-filters#binding-filters) on how to bind exception filters.

##### As a global filter

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

##### As a module

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

See [`docs/usage.md`](https://github.com/Fcmam5/nest-problem-details/blob/develop/docs/usage.md) for the full set of examples (including the native `HttpException` form).

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

Full JSON Schema and OpenAPI 3.0 definitions are available in [`docs/openapi.md`](https://github.com/Fcmam5/nest-problem-details/blob/develop/docs/openapi.md).

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

Check the [`docs/`](https://github.com/Fcmam5/nest-problem-details/tree/develop/docs) folder for [usage examples](https://github.com/Fcmam5/nest-problem-details/blob/develop/docs/usage.md) and the [OpenAPI schema](https://github.com/Fcmam5/nest-problem-details/blob/develop/docs/openapi.md).

## Integration tests

The library includes reusable integration tests that run against real NestJS applications backed by Express and Fastify to verify that the problem-details filter works correctly with each HTTP adapter.

## Resources

- [IETF RFC 9457: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457) (obsoletes RFC 7807)
- [IETF RFC 7807: Problem Details for HTTP APIs (obsoleted)](https://datatracker.ietf.org/doc/html/rfc7807)
- [Zalando RESTful API:](https://opensource.zalando.com/restful-api-guidelines/#176)
- And of course, Nest's awesome community:
  - [Exception filters](https://docs.nestjs.com/exception-filters#exception-filters-1)
  - [@kamilmysliwiec's comment](https://github.com/nestjs/nest/issues/2953#issuecomment-531678153)

- This library was generated using [Nx](https://nx.dev).

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details
