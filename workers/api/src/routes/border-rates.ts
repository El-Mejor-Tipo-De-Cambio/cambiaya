import { Hono } from 'hono';
import { getD1Binding } from '../bindings';
import { insertRate } from '../services/db';
import { validateRemesadorKey } from '../middleware/auth';
import type { Env } from '../index';

const borderRates = new Hono<{ Bindings: Env }>();

// Supported currency pairs for border rates
const SUPPORTED_PAIRS = ['CLP/BOB', 'ARS/BOB', 'BRL/BOB', 'PEN/BOB', 'PYG/BOB'];

// POST /api/border-rates - Submit a border rate (requires remesador auth)
borderRates.post('/', validateRemesadorKey, async (c) => {
  try {
    const db = getD1Binding(c.env);
    const body = await c.req.json();

    const { currency_pair, rate } = body;

    // Validate input
    if (!currency_pair || typeof currency_pair !== 'string') {
      return c.json({ error: 'currency_pair is required' }, 400);
    }

    if (!SUPPORTED_PAIRS.includes(currency_pair)) {
      return c.json({
        error: `Unsupported currency pair. Supported: ${SUPPORTED_PAIRS.join(', ')}`,
      }, 400);
    }

    if (typeof rate !== 'number' || rate <= 0) {
      return c.json({ error: 'rate must be a positive number' }, 400);
    }

    // Get remesador from context
    const remesador = c.get('remesador');
    if (!remesador) {
      return c.json({ error: 'Remesador context not found' }, 500);
    }

    // Insert the border rate
    const result = await insertRate(db, currency_pair, rate, 'border', remesador.id);

    return c.json({
      success: true,
      id: result.meta?.id,
      currency_pair,
      rate,
      remesador: remesador.name,
      created_at: Math.floor(Date.now() / 1000),
    }, 201);
  } catch (error) {
    console.error('Error inserting border rate:', error);
    return c.json({ error: 'Failed to insert border rate' }, 500);
  }
});

// GET /api/border-rates - Get latest border rates (public but filtered)
borderRates.get('/', async (c) => {
  try {
    const db = getD1Binding(c.env);
    const pair = c.req.query('pair');

    let query = `SELECT r.*, rem.name as remesador_name
                 FROM rates r
                 LEFT JOIN remesadores rem ON r.remesador_id = rem.id
                 WHERE r.source = 'border'`;

    const bindings: string[] = [];

    if (pair) {
      query += ' AND r.currency_pair = ?';
      bindings.push(pair);
    }

    query += ' ORDER BY r.created_at DESC LIMIT 10';

    const result = await db
      .prepare(query)
      .bind(...bindings)
      .all();

    return c.json({
      rates: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error('Error fetching border rates:', error);
    return c.json({ error: 'Failed to fetch border rates' }, 500);
  }
});

export default borderRates;