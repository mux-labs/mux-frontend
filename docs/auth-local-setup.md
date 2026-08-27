# Local Auth Setup

> Issue #46 — Document local auth setup for Mux Protocol frontend.

This document describes how the client-side authentication system works in
development, how to run the app locally with auth enabled, and how to extend
or replace the auth layer when a real backend is available.

---

## Overview

The Mux Protocol frontend uses a **client-side session** model:

| Layer | Mechanism |
|---|---|
| Session storage (client UI) | `sessionStorage` (key: `mux_auth_user`) — display only, never trusted for authz |
| Session token | `mux_auth_session` `HttpOnly` cookie, set by `POST /api/auth/login`, cleared by `POST /api/auth/logout` |
| Route protection (server) | Next.js middleware **verifies the session JWT** (signature + `exp`) — see below |
| Route protection (client) | `AuthGuard` (wraps `DashboardLayout`) + `useSessionGuard` redirect unauthenticated users |
| Auth state | React context (`AuthContext`) — `isLoading`, `isAuthenticated`, `user` |

The login page posts to `POST /api/auth/login`, which proxies to
`mux-backend` when `NEXT_PUBLIC_API_URL` is set and otherwise returns a mock
user. Either way, on success it sets the `mux_auth_session` cookie.

### Session token validation (issue #622)

`src/middleware.ts` does **not** treat cookie presence as proof of auth. It
reads `mux_auth_session` and:

- **`SESSION_JWT_SECRET` set** → verifies the value as an HS256 JWT
  (signature against the secret, `exp` in the future). Invalid / expired /
  forged ⇒ redirect to `/login`. This is the production path — the token is
  either the one `mux-backend` returned at login or one signed locally by
  `POST /api/auth/login` (`src/lib/auth/sessionToken.ts`).
- **`SESSION_JWT_SECRET` unset, production build** → **fail closed**: every
  protected request is redirected to `/login`.
- **`SESSION_JWT_SECRET` unset, non-production** → falls back to a
  cookie-presence check so `pnpm dev`, CI, and the `/demo` tree work with
  zero configuration.

Generate a secret with `openssl rand -base64 32` and put it in `.env.local`
as `SESSION_JWT_SECRET=…` to exercise the production path locally.

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

What `signIn` does:
1. Writes a `SessionRecord` (user + `expiresAt`) to `sessionStorage` (client
   UI state only).
2. Writes a non-`HttpOnly` `mux_auth_session=1` marker cookie — used only by
   the middleware's non-production presence-check fallback.
3. Updates `user` state in `AuthContext` → `isAuthenticated` becomes `true`.

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
3. Fires `POST /api/auth/logout` (fire-and-forget) so the server clears the
   `HttpOnly` `mux_auth_session` cookie — JS cannot delete it directly.
4. Sets `user` to `null` → `isAuthenticated` becomes `false`.

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

`src/middleware.ts` runs on every request to a protected prefix (e.g.
`/dashboard`) and validates the `mux_auth_session` JWT as described in
[Session token validation](#session-token-validation-issue-622). A missing,
invalid, or expired token ⇒ redirect to `/login?callbackUrl=<original-path>`.

```ts
// src/middleware.ts
const PROTECTED_PREFIXES = ["/dashboard"];
```

Add new protected route prefixes to this array as the app grows. The
`/demo/dashboard/*` tree is deliberately **not** protected.

### Client-side (AuthGuard + hook)

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

No environment variables are required for local development with the stub
authenticator. When integrating a real backend, add the following to
`.env.local`:

```env
# Base URL for the Mux backend API (proxied by /api/auth/login and others)
NEXT_PUBLIC_API_URL=http://localhost:4000

# HMAC secret for the session JWT verified in src/middleware.ts (#622).
# Required to exercise the production auth path locally; without it the
# middleware falls back to a cookie-presence check outside production and
# fails closed in a production build. Generate: openssl rand -base64 32
SESSION_JWT_SECRET=replace-with-openssl-rand-base64-32
```

See [`frontend-env-vars.md`](frontend-env-vars.md) for the full reference.

---

## Testing

Tests for the login page and auth context live in:

```
src/app/login/__tests__/LoginPage.test.tsx
src/context/__tests__/AuthContext.test.ts
src/lib/auth/__tests__/sessionToken.test.ts   # JWT sign/verify (#622)
src/__tests__/middleware.test.ts               # route protection (#622)
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
