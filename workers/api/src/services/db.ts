// D1 Database client wrapper
import type { D1Database } from '@cloudflare/workers-types';

export interface Rate {
  id: number;
  currency_pair: string;
  rate: number;
  source: 'binance' | 'border';
  remesador_id: string | null;
  created_at: number;
}

export interface Remesador {
  id: string;
  name: string;
  status: 'active' | 'revoked';
  created_at: number;
}

// Get the latest rate for a currency pair from a specific source
export async function getLatestRate(db: D1Database, pair: string, source?: string) {
  let query = 'SELECT * FROM rates WHERE currency_pair = ?';
  const bindings: string[] = [pair];

  if (source) {
    query += ' AND source = ?';
    bindings.push(source);
  }

  query += ' ORDER BY created_at DESC LIMIT 1';

  return db
    .prepare(query)
    .bind(...bindings)
    .first<Rate>();
}

// Get all latest rates (binance + border) for all currency pairs
export async function getAllLatestRates(db: D1Database) {
  // Get Binance rates (latest for each pair)
  const binanceRates = await db
    .prepare(
      `SELECT r1.* FROM rates r1
       INNER JOIN (
         SELECT currency_pair, MAX(created_at) as max_created
         FROM rates WHERE source = 'binance'
         GROUP BY currency_pair
       ) r2 ON r1.currency_pair = r2.currency_pair AND r1.created_at = r2.max_created
       WHERE r1.source = 'binance'`
    )
    .all<Rate>();

  // Get border rates (latest for each pair)
  const borderRates = await db
    .prepare(
      `SELECT r1.* FROM rates r1
       INNER JOIN (
         SELECT currency_pair, MAX(created_at) as max_created
         FROM rates WHERE source = 'border'
         GROUP BY currency_pair
       ) r2 ON r1.currency_pair = r2.currency_pair AND r1.created_at = r2.max_created
       WHERE r1.source = 'border'`
    )
    .all<Rate>();

  return { binance: binanceRates.results, border: borderRates.results };
}

// Get historical rates for a currency pair over a time period
export async function getHistoricalRates(
  db: D1Database,
  pair: string,
  days: number = 30
) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

  const result = await db
    .prepare(
      `SELECT * FROM rates
       WHERE currency_pair = ? AND created_at > ?
       ORDER BY created_at ASC`
    )
    .bind(pair, cutoff)
    .all<Rate>();

  return result.results;
}

// Insert a new rate
export async function insertRate(
  db: D1Database,
  pair: string,
  rate: number,
  source: 'binance' | 'border',
  remesadorId?: string
) {
  return db
    .prepare(
      `INSERT INTO rates (currency_pair, rate, source, remesador_id)
       VALUES (?, ?, ?, ?)`
    )
    .bind(pair, rate, source, remesadorId ?? null)
    .run();
}

// List all remesadores
export async function listRemesadores(db: D1Database) {
  return db
    .prepare('SELECT id, name, status, created_at FROM remesadores ORDER BY created_at DESC')
    .all<Remesador>();
}

// Create a new remesador
export async function createRemesador(
  db: D1Database,
  id: string,
  name: string,
  apiKeyHash: string
) {
  return db
    .prepare(
      `INSERT INTO remesadores (id, name, api_key_hash)
       VALUES (?, ?, ?)`
    )
    .bind(id, name, apiKeyHash)
    .run();
}

// Revoke a remesador
export async function revokeRemesador(db: D1Database, id: string) {
  return db
    .prepare(`UPDATE remesadores SET status = 'revoked' WHERE id = ?`)
    .bind(id)
    .run();
}