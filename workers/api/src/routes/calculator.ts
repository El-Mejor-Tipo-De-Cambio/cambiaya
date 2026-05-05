import { Hono } from 'hono';
import { getD1Binding } from '../bindings';
import { getLatestRate } from '../services/db';
import type { Env } from '../index';

const calculator = new Hono<{ Bindings: Env }>();

interface CalculatorInput {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rateSource?: 'binance' | 'border';
}

// Validate calculator input
function validateInput(input: CalculatorInput): string | null {
  if (!input.amount || input.amount <= 0) {
    return 'Amount must be a positive number';
  }

  if (!input.fromCurrency || !input.toCurrency) {
    return 'fromCurrency and toCurrency are required';
  }

  const supported = ['CLP', 'ARS', 'BRL', 'PEN', 'PYG', 'BOB', 'USDT'];
  if (!supported.includes(input.fromCurrency.toUpperCase())) {
    return `Unsupported fromCurrency: ${input.fromCurrency}`;
  }

  if (!supported.includes(input.toCurrency.toUpperCase())) {
    return `Unsupported toCurrency: ${input.toCurrency}`;
  }

  return null;
}

// Calculate conversion
async function calculate(
  db: D1Database,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rateSource: 'binance' | 'border' = 'binance'
): Promise<{ success: boolean; result?: number; rate?: number; error?: string }> {
  // Handle USDT direct conversions
  if (fromCurrency === 'USDT' || toCurrency === 'USDT') {
    const pair = fromCurrency === 'USDT' ? `${toCurrency}/BOB` : `${fromCurrency}/BOB`;
    const rate = await getLatestRate(db, pair, rateSource);

    if (!rate) {
      return { success: false, error: `Rate not available for ${pair}` };
    }

    if (fromCurrency === 'USDT') {
      // USDT -> BOB (or other via BOB)
      return {
        success: true,
        result: amount * rate.rate,
        rate: rate.rate,
      };
    } else {
      // CLP/ARS/etc -> USDT
      return {
        success: true,
        result: amount / rate.rate,
        rate: rate.rate,
      };
    }
  }

  // Cross conversion through BOB
  if (fromCurrency === toCurrency) {
    return { success: true, result: amount, rate: 1 };
  }

  // Get rate for fromCurrency -> BOB
  const pair = `${fromCurrency}/BOB`;
  const fromRate = await getLatestRate(db, pair, rateSource);

  if (!fromRate) {
    return { success: false, error: `Rate not available for ${pair}` };
  }

  // Get rate for toCurrency -> BOB if different base
  let toRateValue = 1;
  if (toCurrency !== 'BOB') {
    const toPair = `${toCurrency}/BOB`;
    const toRate = await getLatestRate(db, toPair, rateSource);

    if (!toRate) {
      return { success: false, error: `Rate not available for ${toPair}` };
    }

    // Convert: amount in fromCurrency -> BOB -> toCurrency
    // We need the inverse: if we have CLP and want PEN, we need CLP/BOB and PEN/BOB
    // amount_BOB = amount_CLP * CLP/BOB_rate
    // amount_PEN = amount_BOB / PEN/BOB_rate
    toRateValue = toRate.rate;
  }

  const amountInBob = amount * fromRate.rate;
  const result = amountInBob / toRateValue;

  return {
    success: true,
    result,
    rate: fromRate.rate,
  };
}

// POST /api/calculator - Calculate conversion
calculator.post('/', async (c) => {
  try {
    const body = await c.req.json<CalculatorInput>();
    const db = getD1Binding(c.env);

    // Validate input
    const error = validateInput(body);
    if (error) {
      return c.json({ error }, 400);
    }

    const { amount, fromCurrency, toCurrency, rateSource = 'binance' } = body;

    const result = await calculate(
      db,
      amount,
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase(),
      rateSource
    );

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      input: {
        amount,
        from: fromCurrency.toUpperCase(),
        to: toCurrency.toUpperCase(),
      },
      output: {
        amount: result.result,
        currency: toCurrency.toUpperCase(),
      },
      rate: result.rate,
      rateSource,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error calculating:', error);
    return c.json({ error: 'Calculation failed' }, 500);
  }
});

export default calculator;