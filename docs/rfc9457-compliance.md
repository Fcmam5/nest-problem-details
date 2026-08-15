# RFC 9457 Compliance Test Suite

- [RFC 9457 Compliance Test Suite](#rfc-9457-compliance-test-suite)
  - [AI-assisted disclaimer](#ai-assisted-disclaimer)
  - [Layout](#layout)
  - [What's covered](#whats-covered)
  - [Known gaps](#known-gaps)
  - [Running the suite](#running-the-suite)

`tests/rfc9457/` is a dedicated test suite that checks the wire format the
filter produces against the normative text of
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), member by member,
independent of the rest of the unit/integration tests.

It exists to make RFC compliance an explicit, auditable property of the
library rather than something inferred from scattered unit tests — see
[#44](https://github.com/Fcmam5/nest-problem-details/issues/44).

## AI-assisted disclaimer

This suite was generated with AI assistance. We prompted it to read
RFC 9457 directly, extract the MUST/SHOULD statements relevant to a Problem
Details **producer**, and write tests against each one — then reviewed and
corrected several rounds of output (removing tests that encoded this
library's own behavior rather than the RFC, fixing misreadings of the spec,
and replacing weak assertions with meaningful ones).

It has not been exhaustively hand-verified statement-by-statement against the
RFC text. If you (or your AI assistant) spot a test that misreads the spec, a MUST/SHOULD that isn't
covered, or an assertion that's testing this library's opinion rather than
the RFC itself, please
[file an issue](https://github.com/Fcmam5/nest-problem-details/issues/new)
and/or open a PR. Corrections are very welcome.

## Layout

| File | RFC section |
|---|---|
| `media-type.spec.ts` | §3 — `application/problem+json` |
| `object.spec.ts` | §3 — the document is a JSON object |
| `type.spec.ts` | §3.1.1 — `type` |
| `status.spec.ts` | §3.1.2 — `status` |
| `title.spec.ts` | §3.1.3 — `title` |
| `detail.spec.ts` | §3.1.4 — `detail` |
| `instance.spec.ts` | §3.1.5 — `instance` |
| `member-types.spec.ts` | §3.1 — members with the wrong JSON type |
| `optional-members.spec.ts` | §3.1 — presence combinations of optional members |
| `extensions.spec.ts` | §3.2 — extension members |
| `about-blank.spec.ts` | §4.2.1 — `about:blank` |
| `security.spec.ts` | §5 — no leaking implementation internals |
| `integration.spec.ts` | end-to-end checks over a real Nest HTTP response (e.g. `response.status === response.body.status`) |

Shared mocks and fast-check generators live in `tests/support/problem-harness.ts`.

## What's covered

- `Content-Type: application/problem+json` on every response
- `type` as a URI reference, defaulting to `about:blank`, preserved verbatim
  for every shape RFC 3986 §4.1 allows (absolute, non-resolvable, relative)
- `status` matching the actual HTTP response code
- `title` as a human-readable string, including full-Unicode content
- `detail` / `instance` as optional strings, correctly present/absent
- Arbitrary JSON extension members (§3.2), including nested structures and
  simultaneous multi-extension payloads, via
  [fast-check](https://github.com/dubzzz/fast-check) property-based tests
- `about:blank` semantics (§4.2.1), including the SHOULD-level title/status
  phrase alignment
- No stack traces or implementation internals leaking into the response (§5)

Property-based testing (`fast-check`) is used only where it earns its keep —
large or infinite input spaces with a genuine invariant (Unicode text,
arbitrary JSON values, the full HTTP status range). Finite, small input
spaces (e.g. the four presence combinations of `detail`/`instance`) are
enumerated explicitly with `it.each` instead, since sampling them adds
randomness without adding rigor.

Two things are explicitly **not** tested here because they aren't applicable
to a producer:

- Consumer-side rules (e.g. "clients MUST ignore unrecognized extensions") —
  this library never parses problem details, only emits them
- Non-HTTP execution contexts (RPC / WebSockets / GraphQL) — the filter is
  HTTP-only by design

## Known gaps

The suite intentionally documents (rather than hides) known non-conformance.
Failing cases are marked `.skip` with a `TODO #<issue>` comment pointing to
the tracking issue, so CI stays green while the gap remains visible and
actionable:

- [#52](https://github.com/Fcmam5/nest-problem-details/issues/52) — the
  filter does not validate the runtime type of some standard members before
  emitting them. Notably, an `HttpException` constructed with a `NaN` status
  (e.g. from a failed `parseInt`) serializes to `"status": null` on the wire,
  and `detail`/`instance`/`type`/`status` accept values of the wrong JSON
  type (`null`, numbers, objects) instead of omitting them per §3.1.

## Running the suite

```bash
npx jest --testPathPatterns='tests/rfc9457'
```
