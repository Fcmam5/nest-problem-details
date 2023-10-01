# A NestProblemDetails example (using defaults)

This example app uses [`HttpExceptionFilter`]() with no configuration.

## Examples

In `main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from '@nest-http-problem-details';
import { AppModule } from './app/app.module';

async function bootstrap() {
  ...

  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

  ...
}
```

---

### Default nest `NotFoundException` handler

```bash
# curl -i http://localhost:3333/some-wrong-path
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/problem+json; charset=utf-8
Content-Length: 92
Date: Sat, 05 Jun 2021 20:10:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "type": "not-found",
  "title": "Cannot GET /some-wrong-path",
  "status": 404,
  "detail": "Not Found"
}
```

---

### Default nest `HttpExceptions` handler

- Code:

```js
throw new NotFoundException();
```

- Result:

```bash
# curl -i http://localhost:3333/api/dragons/99

HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/problem+json; charset=utf-8
Content-Length: 53
Date: Sat, 05 Jun 2021 16:48:37 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "type": "not-found",
  "title": "Not Found",
  "status": 404
}
```

---

### Throwing a `HttpException` with no params

- Code:

```js
throw new NotFoundException('Dragon not found');
```

- Result:

```bash
# curl -i http://localhost:3333/api/dragons/99?title=true

HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/problem+json; charset=utf-8
Content-Length: 81
Date: Sat, 05 Jun 2021 20:15:58 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Not Found"
}
```

---

### Calling `HttpException` with an error title

- Code:

```js
throw new NotFoundException('Dragon not found');
```

- Result:

```bash
# curl -i http://localhost:3333/api/dragons/99?title=true

HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/problem+json; charset=utf-8
Content-Length: 81
Date: Sat, 05 Jun 2021 20:15:58 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Not Found"
}
```

---

### Calling `HttpException` with an error title and description

- Code:

```js
throw new NotFoundException(
  'Dragon not found',
  `Could not find any dragon with ID: ${id}`
);
```

- Result:

```bash
# curl -i http://localhost:3333/api/dragons/99?title=true&details=true

HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/problem+json; charset=utf-8
Content-Length: 109
Date: Sat, 05 Jun 2021 20:18:42 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Could not find any dragon with ID: 99"
}
```