import { HttpStatus } from '@nestjs/common';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import { caughtBody, makeFilter } from '../support/problem-harness';

/**
 * RFC 9457 §3.1 — optional members.
 *
 * `detail` and `instance` are optional. There are exactly four presence
 * combinations of two independent optional members, so they are enumerated
 * explicitly rather than generated — property-based sampling adds nothing
 * over a complete, readable table.
 *
 * Whichever combination the caller supplies, the emitted document must
 * contain exactly those members (typed as declared) and omit the rest, while
 * always carrying the members this library guarantees (`type`, `title`,
 * `status`).
 */
describe('RFC 9457 §3.1 — optional member combinations', () => {
  afterEach(() => jest.clearAllMocks());

  const cases: Array<{
    name: string;
    input: { detail?: string; instance?: string };
  }> = [
    { name: 'neither detail nor instance', input: {} },
    {
      name: 'detail only',
      input: { detail: 'Your current balance is 30, but that costs 50.' },
    },
    { name: 'instance only', input: { instance: '/account/12345/msgs/abc' } },
    {
      name: 'both detail and instance',
      input: {
        detail: 'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
      },
    },
  ];

  it.each(cases)('emits exactly the members supplied — $name', ({ input }) => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        ...input,
      }),
    );

    for (const member of ['detail', 'instance'] as const) {
      if (member in input) {
        expect(Object.prototype.hasOwnProperty.call(body, member)).toBe(true);
        expect(typeof body[member]).toBe('string');
        expect(body[member]).toBe(input[member]);
      } else {
        expect(body).not.toHaveProperty(member);
      }
    }
  });

  it.each(cases)('always emits type, title and status — $name', ({ input }) => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        ...input,
      }),
    );

    expect(typeof body.type).toBe('string');
    expect(typeof body.title).toBe('string');
    expect(typeof body.status).toBe('number');
  });

  it.each(cases)('survives a JSON round-trip — $name', ({ input }) => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        ...input,
      }),
    );

    expect(JSON.parse(JSON.stringify(body))).toEqual(body);
  });
});
