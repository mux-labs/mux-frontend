export interface VisualPage {
  name: string;
  path: string;
  /**
   * Whether this page requires a signed-in session before it can be
   * screenshotted meaningfully (issue #946). `/login` itself must stay
   * unauthenticated; the dashboard shell pages need a session first, same
   * as `tests/e2e/analytics.spec.ts`'s `signIn` helper.
   */
  requiresAuth?: boolean;
}

export const PAGES: VisualPage[] = [
  { name: "login", path: "/login" },
  { name: "activity", path: "/dashboard/activity", requiresAuth: true },
  { name: "analytics", path: "/dashboard/analytics", requiresAuth: true },
];
