/** Where the stack under test lives, and who signs in. */

export const UI_URL = process.env.E2E_BASE_URL ?? "http://localhost:5174";
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";

/** Seeded by `prisma db seed`. See e2e/README.md before pointing this anywhere else. */
export const ACCOUNTS = {
  admin: { email: "admin@pcmi.com", password: process.env.E2E_ADMIN_PASSWORD ?? "password" },
  viewer: { email: "viewer@pcmi.com", password: process.env.E2E_VIEWER_PASSWORD ?? "password" },
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
