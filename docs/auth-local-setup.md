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
| Session storage | `sessionStorage` (key: `mux_auth_user`) |
| Route protection (server) | Next.js middleware reads `mux_auth_session` cookie |
| Route protection (client) | `useSessionGuard` hook redirects unauthenticated users |
| Auth state | React context (`AuthContext`) — `isLoading`, `isAuthenticated`, `user` |

There is **no backend auth server** in the current scaffold. The login page
calls a placeholder `authenticateUser` function that accepts any valid
credentials and returns a mock user. Replace this with a real API call when
the backend endpoint is ready.

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
1. Writes a `SessionRecord` (user + `expiresAt`) to `sessionStorage`.
2. Sets the `mux_auth_session=1` cookie (read by Next.js middleware).
3. Updates `user` state in `AuthContext` → `isAuthenticated` becomes `true`.

### Sign out (`signOut`)

```ts
const { signOut } = useAuth();
signOut();
```

What `signOut` does:
1. Removes the `mux_auth_user` key from `sessionStorage`.
2. Clears the `mux_auth_session` cookie (`max-age=0`).
3. Sets `user` to `null` → `isAuthenticated` becomes `false`.

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

`src/middleware.ts` checks for the `mux_auth_session` cookie on every request
to protected prefixes. If the cookie is absent, the user is redirected to
`/login?callbackUrl=<original-path>`.

```ts
// src/middleware.ts
const PROTECTED_PREFIXES = ["/dashboard", "/demo/dashboard"];
```

`/demo/dashboard` renders the same full dashboard shell as `/dashboard`
(sourced from local mock data), so it sits behind the same gate — the
developer console must never be publicly reachable with mock wallets and
fake analytics in a production build.

Add new protected route prefixes to this array **and** to the `config.matcher`
list at the bottom of `src/middleware.ts` as the app grows.

### Client-side (hook)

Use `useSessionGuard()` at the top of any protected page or layout to handle
the case where the middleware cookie passes but the in-memory session is stale:

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
# Base URL for the auth API (used by authenticateUser)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

---

## Testing

Tests for the login page and auth context live in:

```
src/app/login/__tests__/LoginPage.test.tsx
src/context/__tests__/AuthContext.test.ts
```

Run tests with:

```bash
npm test
# or
pnpm test
```

See `src/app/login/__tests__/LoginPage.test.tsx` for examples of how to test
the login form, validation, and redirect behaviour.
