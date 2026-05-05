-- ISRA Database Schema
-- D1 Migration: Initial Setup

-- Rates table: stores both Binance and border rates
CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  currency_pair TEXT NOT NULL,     -- e.g., "CLP/BOB", "ARS/BOB"
  rate REAL NOT NULL,
  source TEXT NOT NULL,            -- "binance" | "border"
  remesador_id TEXT,               -- NULL for binance, foreign key for border
  created_at INTEGER DEFAULT (unixepoch())
);

-- Remesadores table: stores remesador credentials
CREATE TABLE IF NOT EXISTS remesadores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,      -- hashed API key
  status TEXT DEFAULT 'active',    -- "active" | "revoked"
  created_at INTEGER DEFAULT (unixepoch())
);

-- Admin table: stores admin credentials
CREATE TABLE IF NOT EXISTS admin (
  id TEXT PRIMARY KEY,
  api_key_hash TEXT NOT NULL,      -- hashed admin API key
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_rates_pair_time ON rates(currency_pair, created_at);
CREATE INDEX IF NOT EXISTS idx_rates_source ON rates(source);
CREATE INDEX IF NOT EXISTS idx_rates_created ON rates(created_at);
CREATE INDEX IF NOT EXISTS idx_remesadores_status ON remesadores(status);