# Team access management & activity audit log

## Team access

`GET /api/team` and `POST /api/team` (and `DELETE /api/team/[id]`) manage the
list of people with access to this project's dashboard. Each member has a
`role` of `"admin"` or `"developer"` — the login role already returned by
`AuthContext`'s `AuthUser.role`. Only `admin` can add or remove members;
`developer` gets a read-only view. There is no email-invite flow: an admin
adds a member directly by name/email/role.

The management UI lives at `/dashboard/settings/team`.

Like the other API routes in this app, `/api/team` proxies to the configured
backend (`NEXT_PUBLIC_API_URL` or legacy aliases) when set, falls back to an
in-repo mock store (`src/mock-data/team.ts`) for local dev/CI when no backend
is configured, and returns `503 backend_unavailable` instead of mock data
when running with `NODE_ENV=production` and no backend configured — see
`isMockFallbackAllowed()` in `src/lib/api/config.ts`.

### Team access authz & error codes

Every `/api/team` entrypoint is deny-by-default and enforces the caller's
role server-side; the UI hides admin-only controls but the API is the source
of truth, so a `developer` session cannot bypass policy by calling the route
directly. Mutations are idempotent on the member id: re-adding an existing
member is a no-op, and removing an already-removed member succeeds without
double-applying. Stable error codes:

- `400 invalid_member` — malformed name/email/role payload.
- `401 unauthorized` — no valid session/JWT.
- `403 forbidden` — caller's role may not perform the action (only `admin`
  may add/remove; `developer` is read-only).
- `409 member_exists` — add conflicts with an existing member under a
  different id.
- `503 backend_unavailable` — backend outage; writes fail closed and never
  fall back to mock data in production.

Every response carries an `x-correlation-id` header (echoing the request's
`x-correlation-id` when present, otherwise a generated id). Ops logs emit
only the correlation id, the action, and the affected member id — never raw
emails, JWTs, API keys, or other secrets.

## Activity / audit log

`GET /api/activity` (`src/app/api/activity/route.ts`) follows the same
production gate as the rest of the app: with a backend configured
(`MUX_BACKEND_URL`, then the `NEXT_PUBLIC_API_URL` alias chain), it proxies
to the backend's real event/activity feed; with no backend and
`NODE_ENV=production` or a mainnet network, it returns
`503 backend_unavailable` instead of mock data; only outside production does
it serve a deterministic fixture (`src/lib/audit/mock-entries.ts`) so local
dev and CI exercise the same pagination semantics. The gate is
`isMockFallbackAllowed()` in `src/lib/http/backend-url.ts`. The UI lives at
`/dashboard/activity` (`src/components/AuditLogPagination.tsx`).

### Audit log filters

`GET /api/activity` accepts the following query parameters. They are parsed
and validated by `parseAuditPageParams()` in `src/lib/audit/pagination.ts` and
forwarded verbatim to the backend when one is configured; the mock fallback
applies the same filters in-memory so local dev/CI matches production
semantics.

| Param | Type | Notes |
| --- | --- | --- |
| `actor` | string | Exact match on the acting member id/email. |
| `action` | string | Exact match on the event action (e.g. `wallet.created`). |
| `from` | ISO-8601 | Inclusive lower bound on `createdAt`. |
| `to` | ISO-8601 | Inclusive upper bound on `createdAt`. |
| `cursor` | opaque string | Pagination cursor returned as `nextCursor`. |
| `limit` | integer | Page size, `1`–`100` (default `50`). |

Unknown parameters are ignored. Invalid values fail closed with a stable
error code rather than silently returning unfiltered data:

- `400 invalid_filter` — a filter value is malformed (bad timestamp, empty
  `actor`/`action`, non-integer or out-of-range `limit`).
- `400 invalid_cursor` — the `cursor` is not a cursor previously issued by
  this endpoint.
- `401 unauthorized` — no valid session/JWT.
- `403 forbidden` — the caller's role may not read the audit log (only
  `admin`; `developer` is denied by default). The backend decides the role;
  the route never trusts client-supplied role headers.
- `429 rate_limited` — too many requests; honour the `Retry-After` header.
- `503 backend_unavailable` — backend/RPC outage; reads never fall back to
  mock data in production.

Every response carries an `x-correlation-id` header (echoing the request's
`x-correlation-id` when present, otherwise a generated id) so a filtered
query can be traced end-to-end. Filter values are never logged verbatim when
they could contain secrets; only the correlation id, the applied filter keys,
and the result count are emitted to ops logs.

Filtering is read-only and idempotent: repeated or concurrent requests with
the same parameters return the same page and never mutate the audit log.
Writes to the audit log remain server-side only — the frontend never
fabricates or edits entries, and the backend/contract stays the source of
truth for spends, recovery, and admin actions.

### Testnet vs mainnet

Filter behavior is identical across networks; the endpoint never mixes
networks in one response. When `NEXT_PUBLIC_STELLAR_NETWORK` (or the backend's
network config) is `mainnet`, the mock fallback is disabled entirely, so a
misconfigured mainnet deploy fails closed with `503 backend_unavailable`
rather than serving testnet-shaped mock events.

### Audit log pagination

Issue #804. Pagination is **keyset (cursor) based**, ordered by
`(createdAt desc, id desc)`. Implementation: `src/lib/audit/pagination.ts`
(server + shared), `src/lib/audit/pagination-state.ts` and
`src/hooks/useAuditLogPagination.ts` (client).

Response shape:

```json
{ "items": [AuditEntry], "nextCursor": "opaque" | null, "hasMore": true, "correlationId": "…" }
```

Invariants:

- **No duplicates, no skips.** A cursor names the last row served, not an
  offset, so entries written while a user is paging never shift a page.
  Timestamp ties are broken by `id`.
- **Idempotent reads.** Replaying the same query + cursor returns the same
  page. The client retries a failed page with the *same* cursor.
- **Cursors are opaque and bound to their filters.** A cursor issued for one
  filter set is rejected with `400 invalid_cursor` when replayed with
  different filters, so a cursor can never widen a query. Clients must treat
  cursors as opaque (≤ 512 URL-safe characters) and never construct them.
- **Adversarial input fails closed.** `limit` must be `1`–`100`; duplicated
  parameters (`?limit=1&limit=100`), inverted ranges, and ranges longer than
  366 days are `400 invalid_filter`; nothing is ever silently widened to an
  unfiltered page.
- **Upstream pages are validated.** A backend page that is malformed, larger
  than the requested `limit`, or contains duplicate ids is treated as an
  outage (`503 backend_unavailable`) rather than passed through, because a
  partial page could hide activity.
- **Rate limiting.** The route applies a per-caller griefing guard (60
  requests/min per credential + IP hash, per instance) on top of the
  backend's authoritative limits. 429s carry `Retry-After`; the UI shows a
  countdown and keeps already-loaded rows (see
  [429 Retry-After UX](security-ux-guards.md#429-retry-after-ux)).
- **Maintenance/outage.** 503s render the fixed-copy maintenance notice
  and keep loaded rows (see
  [Maintenance 503 UX](security-ux-guards.md#maintenance-503-ux)).
- **Client state.** Changing filters starts a new generation; late
  responses for old filters are dropped. Only one page request is in flight
  at a time, and appended rows are de-duplicated by id. On `invalid_cursor`
  the UI offers "Start over" rather than guessing a new position.
- **Observability.** Each response logs `{ event: "audit.page",
  correlationId, code, status, filterKeys, count }` — filter *keys* only,
  never values, credentials, or cursors.

Rollback: the route and page are read-only and additive. Reverting the PR
removes `/api/activity` and `/dashboard/activity`; no data migration is
involved.
