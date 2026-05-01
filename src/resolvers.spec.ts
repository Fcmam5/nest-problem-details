import {
  resolveProblemTitle,
  resolveProblemType,
  resolveProblemUri,
} from './resolvers';
import { DEFAULT_PROBLEM_TYPE } from './filter/constants';

describe('resolveProblemTitle', () => {
  it('returns the caller-provided title when present', () => {
    expect(resolveProblemTitle('Custom', 404)).toBe('Custom');
  });

  it('falls back to the standard HTTP reason phrase', () => {
    expect(resolveProblemTitle(undefined, 404)).toBe('Not Found');
    expect(resolveProblemTitle(undefined, 429)).toBe('Too Many Requests');
  });

  it('falls back to "Error" for unknown status codes', () => {
    expect(resolveProblemTitle(undefined, 599)).toBe('Error');
    expect(resolveProblemTitle(undefined, 999)).toBe('Error');
  });
});

describe('resolveProblemType', () => {
  it('returns the caller-provided type when present', () => {
    expect(resolveProblemType('out-of-credit', 403)).toBe('out-of-credit');
  });

  it('falls back to the default type for the status', () => {
    expect(resolveProblemType(undefined, 404)).toBe('not-found');
    expect(resolveProblemType(undefined, 429)).toBe('too-many-requests');
  });

  it('falls back to about:blank for unmapped status codes', () => {
    expect(resolveProblemType(undefined, 599)).toBe(DEFAULT_PROBLEM_TYPE);
  });

  it('accepts a custom default-errors map', () => {
    const custom = { 599: 'custom-error' };
    expect(resolveProblemType(undefined, 599, custom)).toBe('custom-error');
    expect(resolveProblemType(undefined, 404, custom)).toBe(
      DEFAULT_PROBLEM_TYPE,
    );
  });

  it('prefers explicit type over the custom map', () => {
    expect(resolveProblemType('explicit', 404, { 404: 'map-value' })).toBe(
      'explicit',
    );
  });
});

describe('resolveProblemUri', () => {
  it('returns type unchanged when baseUri is absent', () => {
    expect(resolveProblemUri('not-found', undefined)).toBe('not-found');
  });

  it('resolves a relative type against baseUri', () => {
    expect(
      resolveProblemUri('not-found', 'https://api.example.com/problems'),
    ).toBe('https://api.example.com/problems/not-found');
  });

  it('trailing-slash on baseUri is normalised', () => {
    expect(
      resolveProblemUri('not-found', 'https://api.example.com/problems/'),
    ).toBe('https://api.example.com/problems/not-found');
  });

  it('leaves absolute references untouched (RFC 9457 §4.2.1)', () => {
    expect(
      resolveProblemUri('about:blank', 'https://api.example.com/problems'),
    ).toBe('about:blank');
    expect(
      resolveProblemUri(
        'https://example.com/custom',
        'https://api.example.com/problems',
      ),
    ).toBe('https://example.com/custom');
  });

  it('clears query and hash from baseUri so they do not corrupt path resolution', () => {
    expect(
      resolveProblemUri(
        'not-found',
        'https://api.example.com/problems?x=1#frag',
      ),
    ).toBe('https://api.example.com/problems/not-found');
  });

  it('ignores hash-fragment paths (e.g. Angular-style routing)', () => {
    expect(
      resolveProblemUri('not-found', 'https://api.example.com/app/#/problems'),
    ).toBe('https://api.example.com/app/not-found');
  });

  it('falls back to raw type on invalid baseUri', () => {
    expect(resolveProblemUri('not-found', 'not a url')).toBe('not-found');
  });
});
