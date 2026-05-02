import {
  mapClassValidatorErrors,
  mapToPointerErrors,
  toValidationProblemDetails,
} from './map-class-validator-errors';
import { ProblemDetailsException } from '../exception/problem-details.exception';

describe('mapClassValidatorErrors', () => {
  it('returns empty object for empty input', () => {
    expect(mapClassValidatorErrors([])).toEqual({});
  });

  it('maps a single property with a single constraint', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'email',
          constraints: { isEmail: 'email must be an email' },
        },
      ]),
    ).toEqual({ email: ['email must be an email'] });
  });

  it('maps a single property with multiple constraints', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
            minLength: 'name must be longer than or equal to 3 characters',
          },
        },
      ]),
    ).toEqual({
      name: [
        'name should not be empty',
        'name must be longer than or equal to 3 characters',
      ],
    });
  });

  it('maps multiple top-level properties', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'email',
          constraints: { isEmail: 'email must be an email' },
        },
        {
          property: 'password',
          constraints: { minLength: 'password must be at least 8 characters' },
        },
      ]),
    ).toEqual({
      email: ['email must be an email'],
      password: ['password must be at least 8 characters'],
    });
  });

  it('flattens nested object errors with dotted-path keys', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'address',
          children: [
            {
              property: 'street',
              constraints: { isNotEmpty: 'street should not be empty' },
            },
            {
              property: 'city',
              constraints: { isString: 'city must be a string' },
            },
          ],
        },
      ]),
    ).toEqual({
      'address.street': ['street should not be empty'],
      'address.city': ['city must be a string'],
    });
  });

  it('flattens deeply nested errors', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'billing',
          children: [
            {
              property: 'address',
              children: [
                {
                  property: 'zip',
                  constraints: { matches: 'zip must be a valid postal code' },
                },
              ],
            },
          ],
        },
      ]),
    ).toEqual({ 'billing.address.zip': ['zip must be a valid postal code'] });
  });

  it('includes custom validator constraint messages', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'username',
          constraints: {
            IsNotReservedUsername: 'username "admin" is a reserved username',
          },
        },
      ]),
    ).toEqual({ username: ['username "admin" is a reserved username'] });
  });

  it('skips properties with no constraints and no children', () => {
    expect(
      mapClassValidatorErrors([
        { property: 'ghost' },
        {
          property: 'email',
          constraints: { isEmail: 'email must be an email' },
        },
      ]),
    ).toEqual({ email: ['email must be an email'] });
  });

  it('handles a property that has both constraints and children', () => {
    expect(
      mapClassValidatorErrors([
        {
          property: 'profile',
          constraints: { isObject: 'profile must be an object' },
          children: [
            {
              property: 'bio',
              constraints: { maxLength: 'bio must be at most 160 characters' },
            },
          ],
        },
      ]),
    ).toEqual({
      profile: ['profile must be an object'],
      'profile.bio': ['bio must be at most 160 characters'],
    });
  });
});

describe('mapToPointerErrors', () => {
  it('returns empty array for empty input', () => {
    expect(mapToPointerErrors([])).toEqual([]);
  });

  it('produces { detail, pointer } entries for top-level constraints', () => {
    expect(
      mapToPointerErrors([
        {
          property: 'email',
          constraints: { isEmail: 'email must be an email' },
        },
        {
          property: 'age',
          constraints: { isPositive: 'must be a positive integer' },
        },
      ]),
    ).toEqual([
      { detail: 'email must be an email', pointer: '#/email' },
      { detail: 'must be a positive integer', pointer: '#/age' },
    ]);
  });

  it('converts dotted nested paths to slash-separated JSON Pointer segments', () => {
    expect(
      mapToPointerErrors([
        {
          property: 'address',
          children: [
            {
              property: 'street',
              constraints: { isNotEmpty: 'street should not be empty' },
            },
          ],
        },
      ]),
    ).toEqual([
      { detail: 'street should not be empty', pointer: '#/address/street' },
    ]);
  });

  it('flattens multiple constraints into multiple pointer entries', () => {
    const result = mapToPointerErrors([
      {
        property: 'name',
        constraints: {
          isNotEmpty: 'name should not be empty',
          minLength: 'name must be at least 3 characters',
        },
      },
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.pointer === '#/name')).toBe(true);
  });

  it('includes custom validator messages', () => {
    expect(
      mapToPointerErrors([
        {
          property: 'username',
          constraints: {
            IsNotReservedUsername: 'username "admin" is a reserved username',
          },
        },
      ]),
    ).toEqual([
      {
        detail: 'username "admin" is a reserved username',
        pointer: '#/username',
      },
    ]);
  });
});

describe('toValidationProblemDetails', () => {
  const errors = [
    { property: 'email', constraints: { isEmail: 'email must be an email' } },
    {
      property: 'address',
      children: [
        {
          property: 'city',
          constraints: { isNotEmpty: 'city should not be empty' },
        },
      ],
    },
  ];

  it('returns a ProblemDetailsException instance', () => {
    expect(toValidationProblemDetails(errors)).toBeInstanceOf(
      ProblemDetailsException,
    );
  });

  it('defaults to status 400, title "Validation Failed", type "validation-error"', () => {
    const ex = toValidationProblemDetails(errors);
    const body = ex.getResponse() as Record<string, unknown>;
    expect(ex.getStatus()).toBe(400);
    expect(body.message).toBe('Validation Failed');
    const err = body.error as Record<string, unknown>;
    expect(err.type).toBe('validation-error');
  });

  it('produces field-map errors by default', () => {
    const ex = toValidationProblemDetails(errors);
    const body = ex.getResponse() as Record<string, unknown>;
    const err = body.error as Record<string, unknown>;
    expect(err.errors).toEqual({
      email: ['email must be an email'],
      'address.city': ['city should not be empty'],
    });
  });

  it('produces pointer-array errors when usePointers: true', () => {
    const ex = toValidationProblemDetails(errors, { usePointers: true });
    const body = ex.getResponse() as Record<string, unknown>;
    const err = body.error as Record<string, unknown>;
    expect(Array.isArray(err.errors)).toBe(true);
    (err.errors as Array<{ pointer: string }>).forEach((e) =>
      expect(e.pointer).toMatch(/^#\//),
    );
  });

  it('accepts custom status, title, and type', () => {
    const ex = toValidationProblemDetails(errors, {
      status: 422,
      title: 'Unprocessable Entity',
      type: 'unprocessable',
    });
    const body = ex.getResponse() as Record<string, unknown>;
    expect(ex.getStatus()).toBe(422);
    expect(body.message).toBe('Unprocessable Entity');
    const err = body.error as Record<string, unknown>;
    expect(err.type).toBe('unprocessable');
  });
});
