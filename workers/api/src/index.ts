import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDevD1 } from './bindings';
import rates from './routes/rates';
import stats from './routes/stats';
import calculator from './routes/calculator';
import borderRates from './routes/border-rates';
import admin from './routes/admin';

type Env = {
  DB: D1Database;
  BINANCE_API_URL: string;
  ADMIN_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => c.json({ status: 'ok', service: 'ISRA API' }));

// Health check
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Mount routes
app.route('/api/rates', rates);
app.route('/api/stats', stats);
app.route('/api/calculator', calculator);
app.route('/api/border-rates', borderRates);
app.route('/admin', admin);

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Not found
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

export default app;