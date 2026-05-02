import type { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { PROBLEM_DETAILS_SCHEMA } from './problem-schema';

/**
 * Register the canonical Problem Details schema under
 * `components.schemas.ProblemDetails` in an OpenAPI document.
 *
 * After calling this, Swagger UI will show a named **ProblemDetails** model
 * in the *Schemas* section, and other responses can reference it via
 * `{ $ref: '#/components/schemas/ProblemDetails' }`.
 *
 * @param document  The OpenAPI document produced by
 *                  `SwaggerModule.createDocument()`.
 *
 * @example
 * ```ts
 * const document = SwaggerModule.createDocument(app, builder);
 * addProblemDetailsSchema(document);
 * ```
 */
export function addProblemDetailsSchema(document: OpenAPIObject): void {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ProblemDetails = PROBLEM_DETAILS_SCHEMA;
}
