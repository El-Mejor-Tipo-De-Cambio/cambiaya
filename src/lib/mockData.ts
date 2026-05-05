// Mock data for frontend demonstration
// This data simulates real exchange rates for presentation purposes

export interface MockRate {
  pair: string;
  binanceRate: number;
  borderRate?: number;
  borderRemesador?: string;
  lastUpdated: number;
}

export interface MockStats {
  movingAverage7d: number;
  movingAverage30d: number;
  standardDeviation: number;
  min: number;
  max: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

// Realistic mock exchange rates (based on approximate real values as of 2024-2025)
// CLP to BOB typically around 0.007-0.008 (1 CLP ≈ 0.007 BOB)
// So 1000 CLP ≈ 7-8 BOB
const MOCK_RATES: MockRate[] = [
  {
    pair: 'CLP/BOB',
    binanceRate: 0.00742,
    borderRate: 0.00768,
    borderRemesador: 'Juan Pérez',
    lastUpdated: Date.now() - 1000 * 60 * 5, // 5 mins ago
  },
  {
    pair: 'ARS/BOB',
    binanceRate: 0.00487,
    borderRate: 0.00512,
    borderRemesador: 'Carlos M.',
    lastUpdated: Date.now() - 1000 * 60 * 12, // 12 mins ago
  },
  {
    pair: 'BRL/BOB',
    binanceRate: 0.89234,
    borderRate: 0.90500,
    borderRemesador: 'María G.',
    lastUpdated: Date.now() - 1000 * 60 * 8, // 8 mins ago
  },
  {
    pair: 'PEN/BOB',
    binanceRate: 0.93512,
    borderRate: 0.94200,
    borderRemesador: 'Roberto S.',
    lastUpdated: Date.now() - 1000 * 60 * 15, // 15 mins ago
  },
  {
    pair: 'PYG/BOB',
    binanceRate: 0.00092,
    borderRate: 0.00095,
    borderRemesador: 'Diego R.',
    lastUpdated: Date.now() - 1000 * 60 * 3, // 3 mins ago
  },
];

const MOCK_STATS: Record<string, MockStats> = {
  'CLP/BOB': {
    movingAverage7d: 0.00738,
    movingAverage30d: 0.00745,
    standardDeviation: 0.00012,
    min: 0.00715,
    max: 0.00768,
    confidenceInterval: {
      lower: 0.00721,
      upper: 0.00769,
    },
  },
  'ARS/BOB': {
    movingAverage7d: 0.00492,
    movingAverage30d: 0.00485,
    standardDeviation: 0.00008,
    min: 0.00470,
    max: 0.00512,
    confidenceInterval: {
      lower: 0.00477,
      upper: 0.00501,
    },
  },
  'BRL/BOB': {
    movingAverage7d: 0.89500,
    movingAverage30d: 0.89000,
    standardDeviation: 0.01500,
    min: 0.87000,
    max: 0.92000,
    confidenceInterval: {
      lower: 0.87500,
      upper: 0.91000,
    },
  },
  'PEN/BOB': {
    movingAverage7d: 0.93800,
    movingAverage30d: 0.93500,
    standardDeviation: 0.00800,
    min: 0.92500,
    max: 0.95000,
    confidenceInterval: {
      lower: 0.92700,
      upper: 0.94500,
    },
  },
  'PYG/BOB': {
    movingAverage7d: 0.00093,
    movingAverage30d: 0.00092,
    standardDeviation: 0.00002,
    min: 0.00089,
    max: 0.00096,
    confidenceInterval: {
      lower: 0.00090,
      upper: 0.00095,
    },
  },
};

// Generate mock historical data for charts
export function getMockHistoricalData(pair: string, days: number = 30): Array<{ rate: number; created_at: number }> {
  const baseRate = MOCK_RATES.find(r => r.pair === pair)?.binanceRate ?? 0.007;
  const volatility = baseRate * 0.02; // 2% daily volatility

  const data: Array<{ rate: number; created_at: number }> = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  for (let i = days; i >= 0; i--) {
    const timestamp = Math.floor((now - i * msPerDay) / 1000);
    // Add some realistic variation with a slight trend
    const trend = (Math.random() - 0.5) * 0.1; // slight random walk
    const noise = (Math.random() - 0.5) * volatility;
    const rate = baseRate * (1 + trend) + noise;

    data.push({
      rate: Math.max(0, rate),
      created_at: timestamp,
    });
  }

  return data;
}

// Simulate API responses
export const MockAPI = {
  async getRates() {
    await delay(200); // Simulate network latency
    return {
      rates: MOCK_RATES.reduce((acc, r) => {
        acc[r.pair] = {
          binance: r.binanceRate ? { rate: r.binanceRate, updated_at: r.lastUpdated } : undefined,
          border: r.borderRate ? { rate: r.borderRate, updated_at: r.lastUpdated, remesador: r.borderRemesador } : undefined,
        };
        return acc;
      }, {} as Record<string, any>),
      timestamp: Date.now(),
    };
  },

  async getHistorical(pair: string, period: string = '30d') {
    await delay(300);
    const days = parseInt(period.replace('d', ''), 10) || 30;
    const data = getMockHistoricalData(pair, days);

    return {
      pair,
      period,
      data,
      count: data.length,
    };
  },

  async getStats(pair: string) {
    await delay(250);
    const stats = MOCK_STATS[pair];
    if (!stats) {
      return { error: 'Pair not found' };
    }

    return {
      pair,
      sample_size: 30,
      metrics: stats,
      prediction: {
        direction: stats.movingAverage7d > stats.movingAverage30d ? 'bullish' : 'bearish',
        summary: 'Tendencia estable según análisis histórico',
        diff_percent: (((stats.movingAverage7d - stats.movingAverage30d) / stats.movingAverage30d) * 100).toFixed(2),
        confidence_interval: stats.confidenceInterval,
      },
      period_days: 30,
      calculated_at: Date.now(),
    };
  },

  async calculate(data: { amount: number; fromCurrency: string; toCurrency: string; rateSource: string }) {
    await delay(150);

    const rate = data.rateSource === 'border'
      ? (MOCK_RATES.find(r => r.pair === `${data.fromCurrency}/BOB`)?.borderRate ?? 0.007)
      : (MOCK_RATES.find(r => r.pair === `${data.fromCurrency}/BOB`)?.binanceRate ?? 0.007);

    return {
      input: {
        amount: data.amount,
        from: data.fromCurrency,
        to: data.toCurrency,
      },
      output: {
        amount: data.amount * rate,
        currency: data.toCurrency,
      },
      rate,
      rateSource: data.rateSource,
      timestamp: Date.now(),
    };
  },
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Currency flags mapping
export const CURRENCY_FLAGS: Record<string, string> = {
  'CLP': '🇨🇱',
  'ARS': '🇦🇷',
  'BRL': '🇧🇷',
  'PEN': '🇵🇪',
  'PYG': '🇵🇾',
  'BOB': '🇧🇴',
  'USDT': '💰',
};

// Supported currencies for calculator
export const SUPPORTED_CURRENCIES = [
  { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
  { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
  { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
  { code: 'PEN', name: 'Sol Peruano', flag: '🇵🇪' },
  { code: 'PYG', name: 'Guaraní Paraguayo', flag: '🇵🇾' },
];