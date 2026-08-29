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

## Activity / audit log

`GET /api/activity` previously fell back to a mock-transaction heuristic
regardless of `NODE_ENV`, unlike `/api/wallets` and friends. It now follows
the same production gate as the rest of the app: with a backend configured,
it proxies to the backend's real event/activity feed; with no backend and
`NODE_ENV=production`, it returns `503 backend_unavailable` instead of mock
data; only outside production does it fall back to mock data, which it now
also appends to an in-memory append-only store (`src/lib/audit/log.ts`) as a
placeholder shape for the real immutable audit log the backend should serve.
