# Local Auth Setup

> Issue #46 — Document local auth setup for Mux Protocol frontend.

This document describes how the client-side authentication system works in
development, how to run the app locally with auth enabled, and how to extend
or replace the auth layer when a real backend is available.

---

## Overview

The Mux Protocol frontend uses a **hybrid session** model:

| Layer | Mechanism |
|---|---|
| Session storage (client rehydration) | `sessionStorage` (key: `mux_auth_user`) |
| Server-verified session (backend mode) | HttpOnly `mux_auth_token` cookie, set by `/api/auth/login` from the backend login response, verified on every protected request via `GET {backend}/auth/session` |
| Route protection (server) | Next.js middleware — see `src/lib/auth/routeAccess.ts` |
| Route protection (client) | `useSessionGuard` hook redirects unauthenticated users |
| Auth state | React context (`AuthContext`) — `isLoading`, `isAuthenticated`, `user` |

### Backend mode vs mock mode (#621)

- **Backend configured** (`NEXT_PUBLIC_API_URL` / aliases set): a protected
  route requires the HttpOnly `mux_auth_token` cookie **and** a live
  `GET {backend}/auth/session` check confirming it is still valid. The
  client-set `mux_auth_session` marker cookie is **not** trusted on its own —
  this closes the "anyone can forge `mux_auth_session=1`" gap. `/api/auth/login`
  proxies credentials to `{backend}/auth/login` and, on success, stores the
  backend-issued token in the `mux_auth_token` cookie via a server `Set-Cookie`
  header with `HttpOnly; SameSite=Lax; Path=/` (plus `Secure` when
  `NODE_ENV=production`) — see `setSessionCookie()` in
  `src/app/api/auth/login/route.ts` (#627). `/api/auth/refresh` proxies to
  `{backend}/auth/refresh`, forwarding the caller's `Authorization` header and
  session cookie, and rotates `mux_auth_token` from the response (#626).
  `signOut()` calls `POST /api/auth/logout`, which clears the cookie and
  best-effort notifies `{backend}/auth/logout`.
- **Mock mode** (no backend, non-production only): `/api/auth/login` accepts
  any well-formed credentials and returns a mock user **plus a `session`
  block** (`accessToken` / `refreshToken` / `expiresIn`); the middleware
  accepts the `mux_auth_session` marker cookie so `pnpm dev` / CI work without
  a live auth server. In a **production** build with no backend,
  `/api/auth/login` and `/api/auth/refresh` return `503 backend_unavailable`
  — there is no mock sign-in or mock refresh in production (#625).

### Bearer tokens (`src/lib/session.js` / `src/lib/api.js`) — #628

Any `session` block in the login response is persisted to `sessionStorage`
(tab-scoped, cleared on close — never `localStorage`, never a `NEXT_PUBLIC_*`
var) by `signIn`. `src/lib/api.js` then attaches
`Authorization: Bearer <accessToken>` to outgoing requests and silently calls
`/api/auth/refresh` once on a `401`. `signOut` clears this store.

Full SSO / OAuth (Clerk, Better Auth, …) is a later change; this model is
provider-agnostic and does not add any SaaS dependency.

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- `npm install` (or `pnpm install` / `yarn`)

### Start the dev server

```bash
npm run dev
# or
pnpm dev
```

The app starts at `http://localhost:3000`.

### Sign in

1. Navigate to `http://localhost:3000/login`.
2. Enter **any** valid-format email and a password of at least 6 characters.
3. You will be redirected to `/dashboard` (or the `callbackUrl` query param).

> **Note:** In local development the `authenticateUser` function in
> `src/app/login/page.tsx` is a stub. It does not validate credentials
> against a real database. Replace it with a `fetch` call to your auth
> endpoint before deploying to production.

---

## Auth Flow

```
User visits /login
      │
      ▼
LoginPage renders
      │
      ├─ isLoading=true  → show spinner (auth rehydrating from sessionStorage)
      │
      └─ isLoading=false
            │
            ├─ isAuthenticated=true  → redirect to callbackUrl / /dashboard
            │
            └─ isAuthenticated=false → show login form
                    │
                    ▼
              User submits form
                    │
                    ▼
              authenticateUser(email, password)   ← replace with real API
                    │
                    ├─ success → signIn(user) → redirect to callbackUrl
                    │
                    └─ failure → show inline error message
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/context/AuthContext.tsx` | React context — `AuthProvider`, `useAuth`, `signIn`, `signOut` |
| `src/app/login/page.tsx` | Login page scaffold with form, validation, and redirect logic |
| `src/middleware.ts` | Next.js middleware — server-side cookie check for protected routes |
| `src/hooks/useSessionGuard.ts` | Client-side redirect hook for protected pages |

---

## Session Lifecycle

### Sign in (`signIn`)

```ts
import { useAuth } from "@/context/AuthContext";

const { signIn } = useAuth();

// Call after successful authentication:
signIn({ name: "Jane Doe", email: "jane@example.com", role: "developer" });
// Optional second arg: session TTL in ms (default: 8 hours)
signIn(user, 4 * 60 * 60 * 1000); // 4-hour session
```

```ts
// Optional third arg: bearer-token block from the login response (#628)
signIn(user, undefined, { accessToken, refreshToken, expiresIn });
```

What `signIn` does:
1. Writes a `SessionRecord` (user + `expiresAt`) to `sessionStorage` (client
   UI state only).
2. Writes a non-`HttpOnly` `mux_auth_session=1` marker cookie
   (`SameSite=Lax`, plus `; Secure` on HTTPS) — used only by the middleware's
   non-production presence-check fallback.
3. If a token block is passed, persists it via `src/lib/session.js`
   (`sessionStorage`) so `src/lib/api.js` can authorize requests (#628).
4. Updates `user` state in `AuthContext` → `isAuthenticated` becomes `true`.

The authoritative session token — the `HttpOnly` `mux_auth_session` cookie
the middleware verifies in production — is set by `POST /api/auth/login`
server-side, not by `signIn`. The browser keeps the `HttpOnly` value; the
client-side marker write is ignored when an `HttpOnly` cookie of the same
name already exists.

### Sign out (`signOut`)

```ts
const { signOut } = useAuth();
signOut();
```

What `signOut` does:
1. Removes the `mux_auth_user` key from `sessionStorage`.
2. Clears the client-side marker cookie (`max-age=0`).
3. Clears the bearer-token session (`src/lib/session.js`).
4. Fires `POST /api/auth/logout` (fire-and-forget) so the server clears the
   `HttpOnly` `mux_auth_token` cookie — JS cannot delete it directly.
5. Sets `user` to `null` → `isAuthenticated` becomes `false`.

### Session rehydration

On every page load, `AuthProvider` runs a `useEffect` that:
1. Reads `mux_auth_user` from `sessionStorage`.
2. Checks `expiresAt > Date.now()`.
3. If valid: restores `user` state and re-syncs the cookie.
4. If expired or corrupt: clears storage and cookie, stays unauthenticated.
5. Sets `isLoading = false` when done.

> `isLoading` is `true` during this window. Components that depend on auth
> state (e.g. `DashboardLayout`) should render a skeleton while `isLoading`
> is `true` to avoid a flash of unauthenticated content.

---

## Protecting Routes

### Server-side (middleware)

`src/middleware.ts` delegates to `evaluateAccess()` in
`src/lib/auth/routeAccess.ts` on every request to a protected prefix. When
access is denied the user is redirected to `/login?callbackUrl=<original-path>`;
a rejected `mux_auth_token` is also cleared from the browser on that redirect.

```ts
// src/lib/auth/routeAccess.ts
export const PROTECTED_PREFIXES = ["/dashboard", "/demo/dashboard"];
```

`/demo/dashboard` renders the same full dashboard shell as `/dashboard`
(sourced from local mock data), so it sits behind the same gate — the
developer console must never be publicly reachable with mock wallets and
fake analytics in a production build.

Add new protected route prefixes to `PROTECTED_PREFIXES` in
`src/lib/auth/routeAccess.ts` **and** to the `config.matcher` list at the
bottom of `src/middleware.ts` as the app grows.

`DashboardLayout` wraps its children in `AuthGuard` for the real
`/dashboard/*` tree (`requireAuth` defaults to `true`; the demo tree passes
`requireAuth={false}`). `AuthGuard` shows a skeleton while the session
rehydrates and redirects to `/login` if there is no in-memory session.

`useSessionGuard()` can also be used at the top of any protected page to
handle the case where the middleware cookie passes but the in-memory session
is stale:

```ts
"use client";
import { useSessionGuard } from "@/hooks/useSessionGuard";

export default function DashboardPage() {
  useSessionGuard(); // redirects to "/" if not authenticated
  return <div>...</div>;
}
```

---

## Replacing the Stub with a Real API

When a backend auth endpoint is available, replace the `authenticateUser`
function in `src/app/login/page.tsx`:

```ts
// Before (stub):
async function authenticateUser(email: string, _password: string) {
  await new Promise((r) => setTimeout(r, 400));
  return { name: "...", email, role: "developer" };
}

// After (real API):
async function authenticateUser(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json(); // { name, email, role }
}
```

The rest of the login page (validation, error handling, redirect) requires
no changes.

---

## Environment Variables

No environment variables are required for local development in mock mode.
To run against a real backend (which also enables server-verified sessions,
#621), set the API base URL in `.env.local`:

```env
# Base URL for the Mux backend API. When set, /api/auth/login proxies to
# {NEXT_PUBLIC_API_URL}/auth/login and the middleware verifies sessions via
# {NEXT_PUBLIC_API_URL}/auth/session on every protected request.
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The backend is expected to expose `POST /auth/login` (returning a user plus
an opaque session `token` / `accessToken` / `sessionToken`),
`POST /auth/refresh` (rotating the token), `GET /auth/session` (200 when the
token is valid), and `POST /auth/logout`. No custody secrets are ever placed
in `NEXT_PUBLIC_*` or `localStorage`; the session token lives only in an
HttpOnly cookie (bearer tokens, when returned, live only in tab-scoped
`sessionStorage`).

---

## Testing

Tests for the login page and auth context live in:

```
src/app/login/__tests__/LoginPage.test.tsx
src/context/__tests__/AuthContext.test.ts
src/lib/auth/__tests__/sessionToken.test.ts   # JWT sign/verify (#622)
src/lib/auth/__tests__/routeAccess.test.ts     # access-decision logic (#621)
src/__tests__/middleware.test.ts               # route protection + callbackUrl (#652)
src/app/api/auth/login/__tests__/route.test.ts # sets the session cookie
src/app/api/auth/logout/route.test.ts          # clears the session cookie
src/components/layouts/__tests__/AuthGuard.test.tsx
src/components/layouts/__tests__/DashboardLayout.test.tsx  # AuthGuard wiring (#623)
```

Run tests with:

```bash
npm test
# or
pnpm test
```

See `src/app/login/__tests__/LoginPage.test.tsx` for examples of how to test
the login form, validation, and redirect behaviour.
