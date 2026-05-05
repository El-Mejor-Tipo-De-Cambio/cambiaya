import { Hono } from 'hono';
import { getD1Binding } from '../bindings';
import { listRemesadores, createRemesador, revokeRemesador } from '../services/db';
import { validateAdminKey } from '../middleware/auth';
import type { Env } from '../index';

const admin = new Hono<{ Bindings: Env }>();

// Generate a random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

// Hash API key using SHA-256
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// GET /admin/remesadores - List all remesadores (requires admin auth)
admin.get('/remesadores', validateAdminKey, async (c) => {
  try {
    const db = getD1Binding(c.env);
    const result = await listRemesadores(db);

    return c.json({
      remesadores: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error('Error listing remesadores:', error);
    return c.json({ error: 'Failed to list remesadores' }, 500);
  }
});

// POST /admin/remesadores - Create a new remesador (requires admin auth)
admin.post('/remesadores', validateAdminKey, async (c) => {
  try {
    const db = getD1Binding(c.env);
    const body = await c.req.json();

    const { name } = body;

    if (!name || typeof name !== 'string') {
      return c.json({ error: 'name is required' }, 400);
    }

    // Generate API key and hash
    const apiKey = generateApiKey();
    const apiKeyHash = await hashKey(apiKey);

    // Create remesador with random UUID
    const id = crypto.randomUUID();
    await createRemesador(db, id, name, apiKeyHash);

    return c.json({
      success: true,
      remesador: {
        id,
        name,
        status: 'active',
      },
      api_key: apiKey, // Only returned once - admin must save it
      message: 'Save the API key - it will not be shown again',
    }, 201);
  } catch (error) {
    console.error('Error creating remesador:', error);
    return c.json({ error: 'Failed to create remesador' }, 500);
  }
});

// DELETE /admin/remesadores/:id - Revoke a remesador (requires admin auth)
admin.delete('/remesadores/:id', validateAdminKey, async (c) => {
  try {
    const db = getD1Binding(c.env);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'id is required' }, 400);
    }

    await revokeRemesador(db, id);

    return c.json({
      success: true,
      id,
      status: 'revoked',
    });
  } catch (error) {
    console.error('Error revoking remesador:', error);
    return c.json({ error: 'Failed to revoke remesador' }, 500);
  }
});

// GET /admin/stats - Get system stats (requires admin auth)
admin.get('/stats', validateAdminKey, async (c) => {
  try {
    const db = getD1Binding(c.env);

    // Get counts
    const ratesCount = await db
      .prepare('SELECT COUNT(*) as count FROM rates')
      .first<{ count: number }>();

    const remesadoresCount = await db
      .prepare('SELECT COUNT(*) as count FROM remesadores WHERE status = ?')
      .bind('active')
      .first<{ count: number }>();

    const borderRatesToday = await db
      .prepare(
        `SELECT COUNT(*) as count FROM rates
         WHERE source = 'border' AND created_at > ?`
      )
      .bind(Math.floor(Date.now() / 1000) - 86400)
      .first<{ count: number }>();

    return c.json({
      stats: {
        total_rates: ratesCount?.count ?? 0,
        active_remesadores: remesadoresCount?.count ?? 0,
        border_rates_today: borderRatesToday?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default admin;