/**
 * `/demo/dashboard/api-keys` renders the exact production page (#631).
 *
 * The API-keys page has no auth-gated data path of its own — `ApiKeysTable`
 * talks to `/api/api-keys`, which already does the backend-vs-mock split — so
 * the demo route has nothing to diverge for. Re-exporting keeps the two trees
 * from drifting (the demo copy had previously drifted to a stale "Settings"
 * header).
 */
export { default } from "@/app/dashboard/api-keys/page";
