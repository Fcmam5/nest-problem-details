import 'reflect-metadata';

import { PROBLEM_CONTENT_TYPE } from '../filter/constants';
import { ApiProblemResponse } from './api-problem-response.decorator';
import { PROBLEM_DETAILS_SCHEMA } from './problem-schema';

// Reflect-metadata key used by @nestjs/swagger's @ApiResponse decorator.
// Using the raw key avoids importing from @nestjs/swagger in the test.
const RESPONSE_KEY = 'swagger/apiResponse';

interface StoredResponse {
  description?: string;
  content?: Record<
    string,
    {
      schema?: unknown;
      example?: unknown;
      examples?: Record<string, unknown>;
    }
  >;
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}

function getResponses(
  target: object,
  prop: string,
): Record<string, StoredResponse> {
  const descriptor = Object.getOwnPropertyDescriptor(target, prop);
  return Reflect.getMetadata(
    RESPONSE_KEY,
    descriptor!.value as object,
  ) as Record<string, StoredResponse>;
}

describe('ApiProblemResponse', () => {
  describe('default behavior', () => {
    class Ctrl {
      @ApiProblemResponse({ status: 404 })
      handler() {}
    }

    const responses = getResponses(Ctrl.prototype, 'handler');

    it('registers an ApiResponse keyed by the given status', () => {
      expect(Object.keys(responses)).toEqual(['404']);
    });

    it('uses the standard HTTP reason phrase as description', () => {
      expect(responses['404'].description).toBe('Not Found');
    });

    it('attaches the canonical Problem schema under application/problem+json', () => {
      const media = responses['404'].content![PROBLEM_CONTENT_TYPE];
      expect(media.schema).toBe(PROBLEM_DETAILS_SCHEMA);
    });

    it('generates an example with type from the default status map (matching filter)', () => {
      const media = responses['404'].content![PROBLEM_CONTENT_TYPE];
      expect(media.example).toEqual({
        type: 'not-found',
        title: 'Not Found',
        status: 404,
      });
    });
  });

  describe('with explicit fields', () => {
    class Ctrl {
      @ApiProblemResponse({
        status: 404,
        type: 'not-found',
        title: 'Dragon not found',
        detail: 'No dragon with the given id exists',
        instance: '/dragons/99',
      })
      handler() {}
    }

    const media = getResponses(Ctrl.prototype, 'handler')['404'].content![
      PROBLEM_CONTENT_TYPE
    ];

    it('uses title as description when description is omitted', () => {
      expect(getResponses(Ctrl.prototype, 'handler')['404'].description).toBe(
        'Dragon not found',
      );
    });

    it('places type, title, detail and instance into the example', () => {
      expect(media.example).toEqual({
        type: 'not-found',
        title: 'Dragon not found',
        status: 404,
        detail: 'No dragon with the given id exists',
        instance: '/dragons/99',
      });
    });
  });

  describe('description override', () => {
    class Ctrl {
      @ApiProblemResponse({
        status: 429,
        title: 'Too Many Requests',
        description: 'Quota exceeded; retry after the indicated delay.',
      })
      handler() {}
    }

    it('honors an explicit description', () => {
      expect(getResponses(Ctrl.prototype, 'handler')['429'].description).toBe(
        'Quota exceeded; retry after the indicated delay.',
      );
    });
  });

  describe('retryAfter auto-header', () => {
    it('documents Retry-After as an integer for a number value', () => {
      class Ctrl {
        @ApiProblemResponse({ status: 429, retryAfter: 3600 })
        handler() {}
      }
      expect(getResponses(Ctrl.prototype, 'handler')['429'].headers).toEqual({
        'Retry-After': {
          description: 'Seconds to wait before retrying.',
          schema: { type: 'integer', minimum: 0 },
        },
      });
    });

    it('documents Retry-After as an IMF-fixdate string for a Date value', () => {
      class Ctrl {
        @ApiProblemResponse({
          status: 503,
          retryAfter: new Date('2026-05-01T12:00:00Z'),
        })
        handler() {}
      }
      expect(getResponses(Ctrl.prototype, 'handler')['503'].headers).toEqual({
        'Retry-After': {
          description:
            "IMF-fixdate (RFC 7231 §7.1.1.1) when the client may retry, e.g. 'Wed, 21 Oct 2026 07:28:00 GMT'.",
          schema: { type: 'string' },
        },
      });
    });

    it('documents Retry-After as a plain string for a string value', () => {
      class Ctrl {
        @ApiProblemResponse({ status: 429, retryAfter: '3600' })
        handler() {}
      }
      expect(getResponses(Ctrl.prototype, 'handler')['429'].headers).toEqual({
        'Retry-After': {
          description:
            'Delay after which the client should retry (seconds or HTTP-date).',
          schema: { type: 'string' },
        },
      });
    });

    it.each([
      ['negative seconds', -1],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['invalid Date', new Date('not-a-date')],
      ['blank string', '   '],
    ])(
      'does not emit the header for invalid value (%s)',
      (_name, retryAfter) => {
        class Ctrl {
          @ApiProblemResponse({
            status: 429,
            retryAfter: retryAfter as never,
          })
          handler() {}
        }
        const response = getResponses(Ctrl.prototype, 'handler')['429'];
        expect(response.headers).toBeUndefined();
      },
    );

    it('lets explicit headers override retryAfter', () => {
      class Ctrl {
        @ApiProblemResponse({
          status: 429,
          retryAfter: 3600,
          headers: {
            'Retry-After': {
              description: 'Custom override.',
              schema: { type: 'string' },
            },
          },
        })
        handler() {}
      }
      expect(getResponses(Ctrl.prototype, 'handler')['429'].headers).toEqual({
        'Retry-After': {
          description: 'Custom override.',
          schema: { type: 'string' },
        },
      });
    });
  });

  describe('headers pass-through', () => {
    class Ctrl {
      @ApiProblemResponse({
        status: 429,
        type: 'rate-limit-exceeded',
        headers: {
          'Retry-After': {
            description: 'Seconds to wait before retrying.',
            schema: { type: 'integer' },
          },
        },
      })
      handler() {}
    }

    it('forwards headers verbatim to ApiResponse', () => {
      expect(getResponses(Ctrl.prototype, 'handler')['429'].headers).toEqual({
        'Retry-After': {
          description: 'Seconds to wait before retrying.',
          schema: { type: 'integer' },
        },
      });
    });
  });

  describe('schema override', () => {
    const customSchema = {
      type: 'object' as const,
      required: ['type', 'title', 'status', 'errors'],
      properties: { foo: { type: 'string' as const } },
    };

    class Ctrl {
      @ApiProblemResponse({ status: 422, schema: customSchema })
      handler() {}
    }

    it('uses the caller-provided schema instead of the canonical one', () => {
      const media = getResponses(Ctrl.prototype, 'handler')['422'].content![
        PROBLEM_CONTENT_TYPE
      ];
      expect(media.schema).toBe(customSchema);
    });
  });

  describe('examples override', () => {
    class Ctrl {
      @ApiProblemResponse({
        status: 422,
        examples: {
          missingField: {
            summary: 'Missing required field',
            value: {
              type: 'validation-failed',
              title: 'Unprocessable Entity',
              status: 422,
              errors: [{ detail: 'name is required' }],
            },
          },
        },
      })
      handler() {}
    }

    const media = getResponses(Ctrl.prototype, 'handler')['422'].content![
      PROBLEM_CONTENT_TYPE
    ];

    it('emits the named examples map and omits the single example field', () => {
      expect(media.examples).toEqual({
        missingField: expect.objectContaining({
          summary: 'Missing required field',
        }),
      });
      expect(media.example).toBeUndefined();
    });
  });

  describe('stacking', () => {
    class Ctrl {
      @ApiProblemResponse({ status: 404, type: 'not-found' })
      @ApiProblemResponse({ status: 429, type: 'rate-limit-exceeded' })
      handler() {}
    }

    it('registers one entry per status', () => {
      const responses = getResponses(Ctrl.prototype, 'handler');
      expect(Object.keys(responses).sort()).toEqual(['404', '429']);
    });
  });

  describe('baseUri resolution', () => {
    class Ctrl {
      @ApiProblemResponse({
        status: 404,
        type: 'not-found',
        title: 'Dragon not found',
        baseUri: 'https://api.example.com/problems',
      })
      handler() {}
    }

    it('resolves the type into an absolute URI in the example', () => {
      const media = getResponses(Ctrl.prototype, 'handler')['404'].content![
        PROBLEM_CONTENT_TYPE
      ];
      expect(media.example).toMatchObject({
        type: 'https://api.example.com/problems/not-found',
        title: 'Dragon not found',
        status: 404,
      });
    });

    it('leaves absolute references untouched (RFC 9457 §4.2.1)', () => {
      class CtrlAbsolute {
        @ApiProblemResponse({
          status: 500,
          type: 'about:blank',
          baseUri: 'https://api.example.com/problems',
        })
        handler() {}
      }
      const media = getResponses(CtrlAbsolute.prototype, 'handler')['500']
        .content![PROBLEM_CONTENT_TYPE];
      expect(media.example).toMatchObject({
        type: 'about:blank',
      });
    });
  });

  describe('httpErrors override', () => {
    class Ctrl {
      @ApiProblemResponse({
        status: 404,
        httpErrors: { 404: 'missing-resource' },
      })
      handler() {}
    }

    it('looks up the default type from the custom map instead of built-in defaults', () => {
      const media = getResponses(Ctrl.prototype, 'handler')['404'].content![
        PROBLEM_CONTENT_TYPE
      ];
      expect(media.example).toMatchObject({
        type: 'missing-resource',
        status: 404,
      });
    });

    it('still falls back to about:blank for unmapped status codes', () => {
      class CtrlUnmapped {
        @ApiProblemResponse({
          status: 599,
          httpErrors: { 404: 'missing-resource' },
        })
        handler() {}
      }
      const media = getResponses(CtrlUnmapped.prototype, 'handler')['599']
        .content![PROBLEM_CONTENT_TYPE];
      expect(media.example).toMatchObject({
        type: 'about:blank',
        status: 599,
      });
    });
  });

  describe('unknown status', () => {
    class Ctrl {
      @ApiProblemResponse({ status: 599 })
      handler() {}
    }

    it('falls back to "Error" when no reason phrase is known (matching filter)', () => {
      const responses = getResponses(Ctrl.prototype, 'handler');
      expect(responses['599'].description).toBe('Error');
      expect(
        responses['599'].content![PROBLEM_CONTENT_TYPE].example,
      ).toMatchObject({ title: 'Error', status: 599 });
    });
  });
});
