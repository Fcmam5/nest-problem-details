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
