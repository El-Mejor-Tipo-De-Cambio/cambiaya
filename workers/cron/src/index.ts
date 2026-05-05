// Cron worker to sync Binance rates to D1
// Runs every 15 minutes via Cloudflare Workers Cron

interface Env {
  DB: D1Database;
  BINANCE_API_URL: string;
}

// Supported currency pairs
const SUPPORTED_PAIRS = [
  { currency: 'CLP', symbol: 'CLPUSDT' },
  { currency: 'ARS', symbol: 'ARSUSDT' },
  { currency: 'BRL', symbol: 'BRLUSDT' },
  { currency: 'PEN', symbol: 'PENUSDT' },
  { currency: 'PYG', symbol: 'PYGUSDT' },
];

// Get USD/BOB rate
async function getUsdBobRate(apiUrl: string): Promise<number> {
  const response = await fetch(`${apiUrl}/api/v3/ticker/price?symbol=USDBOB`);
  if (!response.ok) {
    throw new Error(`Failed to get USDBOB rate: ${response.status}`);
  }
  const data = await response.json();
  return parseFloat(data.price);
}

// Get rate for currency to USDT
async function getCurrencyRate(symbol: string, apiUrl: string): Promise<number> {
  const response = await fetch(`${apiUrl}/api/v3/ticker/price?symbol=${symbol}`);
  if (!response.ok) {
    throw new Error(`Failed to get ${symbol} rate: ${response.status}`);
  }
  const data = await response.json();
  return parseFloat(data.price);
}

// Calculate cross rate: CLP -> USDT -> BOB
function calculateCrossRate(currencyToUsdt: number, usdtToBob: number): number {
  return currencyToUsdt * usdtToBob;
}

// Insert rate into D1
async function insertRate(
  db: D1Database,
  pair: string,
  rate: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO rates (currency_pair, rate, source) VALUES (?, ?, ?)`
    )
    .bind(pair, rate, 'binance')
    .run();
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('Binance sync cron triggered at', new Date().toISOString());

    const apiUrl = env.BINANCE_API_URL || 'https://api.binance.com';

    try {
      // Get USD/BOB rate first
      const usdBobRate = await getUsdBobRate(apiUrl);
      console.log(`USDBOB rate: ${usdBobRate}`);

      // Fetch all currency rates
      for (const { currency, symbol } of SUPPORTED_PAIRS) {
        try {
          const currencyRate = await getCurrencyRate(symbol, apiUrl);
          const crossRate = calculateCrossRate(currencyRate, usdBobRate);
          const pair = `${currency}/BOB`;

          console.log(`${pair}: ${crossRate} (${currency}/USDT: ${currencyRate})`);

          await insertRate(env.DB, pair, crossRate);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error fetching ${currency}:`, error);
        }
      }

      console.log('Binance sync completed successfully');
    } catch (error) {
      console.error('Binance sync failed:', error);
      // Don't throw - let the cron complete even if one sync fails
    }
  },
};