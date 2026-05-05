import { Hono } from 'hono';
import { getD1Binding } from '../bindings';
import { getAllLatestRates } from '../services/db';
import type { Env } from '../index';

const rates = new Hono<{ Bindings: Env }>();

// GET /api/rates - Get current Binance + latest border rates
rates.get('/', async (c) => {
  try {
    const db = getD1Binding(c.env);
    const { binance, border } = await getAllLatestRates(db);

    // Build response with both sources
    const response: Record<string, {
      binance?: { rate: number; updated_at: number };
      border?: { rate: number; updated_at: number; remesador: string };
    }> = {};

    // Add Binance rates
    for (const rate of binance) {
      const pair = rate.currency_pair;
      if (!response[pair]) response[pair] = {};
      response[pair].binance = {
        rate: rate.rate,
        updated_at: rate.created_at,
      };
    }

    // Add border rates
    for (const rate of border) {
      const pair = rate.currency_pair;
      if (!response[pair]) response[pair] = {};
      response[pair].border = {
        rate: rate.rate,
        updated_at: rate.created_at,
        remesador: rate.remesador_id ?? 'unknown',
      };
    }

    return c.json({
      rates: response,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    return c.json({ error: 'Failed to fetch rates' }, 500);
  }
});

// GET /api/rates/:pair/history - Get historical rates for a pair
rates.get('/:pair/history', async (c) => {
  try {
    const db = getD1Binding(c.env);
    const pair = c.req.param('pair');
    const period = c.req.query('period') ?? '30d';

    // Parse period
    const days = parseInt(period.replace('d', ''), 10) || 30;
    const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

    const results = await db
      .prepare(
        `SELECT * FROM rates
         WHERE currency_pair = ? AND created_at > ?
         ORDER BY created_at ASC`
      )
      .bind(pair, cutoff)
      .all();

    return c.json({
      pair,
      period: `${days}d`,
      data: results.results,
      count: results.results.length,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return c.json({ error: 'Failed to fetch historical data' }, 500);
  }
});

export default rates;