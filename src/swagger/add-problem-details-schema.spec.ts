import type { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { addProblemDetailsSchema } from './add-problem-details-schema';
import { PROBLEM_DETAILS_SCHEMA } from './problem-schema';

describe('addProblemDetailsSchema', () => {
  it('adds ProblemDetails to an empty components object', () => {
    const document: OpenAPIObject = { openapi: '3.0.0', paths: {}, info: { title: '', version: '' } };

    addProblemDetailsSchema(document);

    expect(document.components!.schemas!.ProblemDetails).toBe(
      PROBLEM_DETAILS_SCHEMA,
    );
  });

  it('adds ProblemDetails alongside existing schemas', () => {
    const document: OpenAPIObject = {
      openapi: '3.0.0',
      paths: {},
      info: { title: '', version: '' },
      components: { schemas: { User: { type: 'object' } } },
    };

    addProblemDetailsSchema(document);

    expect(document.components!.schemas!.User).toEqual({ type: 'object' });
    expect(document.components!.schemas!.ProblemDetails).toBe(
      PROBLEM_DETAILS_SCHEMA,
    );
  });

  it('is idempotent — repeated calls do not throw', () => {
    const document: OpenAPIObject = { openapi: '3.0.0', paths: {}, info: { title: '', version: '' } };

    addProblemDetailsSchema(document);
    addProblemDetailsSchema(document);

    expect(document.components!.schemas!.ProblemDetails).toBe(
      PROBLEM_DETAILS_SCHEMA,
    );
  });
});
