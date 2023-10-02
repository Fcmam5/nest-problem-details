# A NestProblemDetails example (using defaults)

This example app uses [`HttpExceptionFilter`]() with no configuration.

## Examples

In `main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from 'nest-problem-details-filter';
import { AppModule } from './app/app.module';

async function bootstrap() {
  ...

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  ...
}
```

---

### Default nest `NotFoundException` handler

```bash
# curl -i http://localhost:3333/some-wrong-path
HTTP/1.1 404 Not Found
content-type: application/problem+json; charset=utf-8
content-length: 92
Date: Mon, 02 Oct 2023 08:36:31 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{ 
  "type":"not-found",
  "title":"Cannot GET /some-wrong-path",
  "status":404,
  "detail":"Not Found"
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
content-type: application/problem+json; charset=utf-8
content-length: 53
Date: Mon, 02 Oct 2023 08:37:29 GMT
Connection: keep-alive
Keep-Alive: timeout=72

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
content-type: application/problem+json; charset=utf-8
content-length: 81
Date: Mon, 02 Oct 2023 08:37:57 GMT
Connection: keep-alive
Keep-Alive: timeout=72

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
content-type: application/problem+json; charset=utf-8
content-length: 81
Date: Mon, 02 Oct 2023 08:38:16 GMT
Connection: keep-alive
Keep-Alive: timeout=72

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
content-type: application/problem+json; charset=utf-8
content-length: 109
Date: Mon, 02 Oct 2023 08:39:01 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{
  "type": "not-found",
  "title": "Dragon not found",
  "status": 404,
  "detail": "Could not find any dragon with ID: 99"
}
```