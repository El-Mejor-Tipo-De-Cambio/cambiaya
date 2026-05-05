// Binance API client for fetching exchange rates
// Binance doesn't have direct CLP/BOB, ARS/BOB, etc.
// We use USDT as intermediary: e.g., CLP/USDT + USDT/BOB -> CLP/BOB

export interface BinanceTicker {
  symbol: string;
  price: string;
}

// Currency pairs we support
export const SUPPORTED_PAIRS = [
  'CLP',  // Chilean Peso
  'ARS',  // Argentine Peso
  'BRL',  // Brazilian Real
  'PEN',  // Peruvian Sol
  'PYG',  // Paraguayan Guarani
] as const;

export type CurrencyCode = typeof SUPPORTED_PAIRS[number];

// Get Binance tickers for multiple symbols
export async function fetchBinanceTickers(symbols: string[]): Promise<Map<string, number>> {
  // Fetch all tickers in one request
  const response = await fetch('https://api.binance.com/api/v3/ticker/price');

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const tickers: BinanceTicker[] = await response.json();

  // Create a map for quick lookup
  const priceMap = new Map<string, number>();
  for (const ticker of tickers) {
    priceMap.set(ticker.symbol, parseFloat(ticker.price));
  }

  return priceMap;
}

// Calculate cross rate through USDT
// e.g., CLP/BOB = CLP/USDT * USDT/BOB
export function calculateCrossRate(currencyToUsdt: number, usdtTobob: number): number {
  return currencyToUsdt * usdtTobob;
}

// Fetch all rates for BOB cross rates via USDT
export async function fetchAllRatesForBob(): Promise<Map<string, number>> {
  const tickers = await fetchBinanceTickers([
    'CLPUSDT', 'ARSUSDT', 'BRLUSDT', 'PENUSDT', 'PYGUSDT',
    'USDBOB', 'USDDBOB'
  ]);

  const rates = new Map<string, number>();

  // Calculate cross rates for each currency to BOB
  const usdBob = tickers.get('USDBOB') ?? tickers.get('USDDBOB') ?? 0;

  if (usdBob === 0) {
    throw new Error('USDBOB rate not available');
  }

  for (const currency of SUPPORTED_PAIRS) {
    const cryptoSymbol = `${currency}USDT`;
    const rateToUsdt = tickers.get(cryptoSymbol);

    if (rateToUsdt && rateToUsdt > 0) {
      // CLP/BOB = CLP/USDT * USDT/BOB
      const crossRate = calculateCrossRate(rateToUsdt, usdBob);
      rates.set(`${currency}/BOB`, crossRate);
    }
  }

  return rates;
}

// Get the last update timestamp
export function getLastUpdate(): number {
  return Date.now();
}