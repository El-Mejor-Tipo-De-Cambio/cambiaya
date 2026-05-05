// Binding utilities for Cloudflare Workers
// Handles both local dev (wrangler dev) and production D1 binding

import type { D1Database } from '@cloudflare/workers-types';

export function getDevD1(env: { DB?: D1Database }): D1Database | null {
  return env.DB ?? null;
}

export function getD1Binding(env: { DB?: D1Database }): D1Database {
  if (!env.DB) {
    throw new Error('D1 database binding "DB" is required');
  }
  return env.DB;
}