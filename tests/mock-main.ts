import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TestAppModuleWithModule } from './test-app.module';
import { PROBLEM_DETAILS_SCHEMA } from '../src/swagger';

async function bootstrap() {
  const app = await NestFactory.create(TestAppModuleWithModule);

  const config = new DocumentBuilder()
    .setTitle('nest-problem-details mock API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ProblemDetails = PROBLEM_DETAILS_SCHEMA;

  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Mock app running at http://localhost:3000');
  console.log('Swagger UI available at http://localhost:3000/api');
}
bootstrap();
