// API Key validation middleware
import { Context, Next } from 'hono';
import { getD1Binding } from '../bindings';

type Env = {
  DB: D1Database;
};

// Validate remesador API key
export async function validateRemesadorKey(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const db = getD1Binding(c.env);

  // Hash the incoming key to compare with stored hash
  const keyHash = await hashKey(apiKey);

  // Check if the key exists and is active
  const result = await db
    .prepare('SELECT id, name FROM remesadores WHERE api_key_hash = ? AND status = ?')
    .bind(keyHash, 'active')
    .first();

  if (!result) {
    return c.json({ error: 'Invalid or revoked API key' }, 401);
  }

  // Attach remesador info to context for downstream use
  c.set('remesador', { id: result.id as string, name: result.name as string });

  await next();
}

// Validate admin API key
export async function validateAdminKey(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const db = getD1Binding(c.env);

  const keyHash = await hashKey(apiKey);

  const result = await db
    .prepare('SELECT id FROM admin WHERE api_key_hash = ?')
    .bind(keyHash)
    .first();

  if (!result) {
    return c.json({ error: 'Invalid admin API key' }, 401);
  }

  await next();
}

// Simple hash function for API keys
// In production, use a proper crypto library
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}