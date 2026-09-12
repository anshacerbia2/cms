/** Where the stack under test lives, and who signs in. */

// Vite and the Nest app on their own defaults. The dev worktree on the server
// uses 5174 and 3001 to sit beside production; a local checkout does not.
//
// 127.0.0.1 rather than localhost for the API: it binds IPv4 only, and on
// Windows `localhost` resolves to ::1 first, which nothing is listening on.
export const UI_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
export const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:3000/api";

/**
 * Seeded by `prisma db seed` — the password is the one `auth.seeder.ts` hashes
 * for all three accounts. See e2e/README.md before pointing this anywhere else.
 */
export const ACCOUNTS = {
  admin: { email: "admin@pcmi.com", password: process.env.E2E_ADMIN_PASSWORD ?? "admin123" },
  viewer: { email: "viewer@pcmi.com", password: process.env.E2E_VIEWER_PASSWORD ?? "admin123" },
} as const;

export type RoleName = keyof typeof ACCOUNTS;

/**
 * Every record a test creates carries this, so a failed run leaves findable
 * debris and the cleanup helper can recognise its own.
 */
export const TAG = "E2E";

/** Unique-enough suffix so parallel workers never collide on a unique column. */
export const uniq = (prefix: string) =>
  `${TAG}-${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
