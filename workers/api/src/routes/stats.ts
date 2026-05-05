import { Hono } from 'hono';
import { getD1Binding } from '../bindings';
import { getHistoricalRates } from '../services/db';
import { calculateMetrics, type RateDataPoint } from '../services/stats';
import type { Env } from '../index';

const stats = new Hono<{ Bindings: Env }>();

// GET /api/stats/:pair - Get statistical metrics for a currency pair
stats.get('/:pair', async (c) => {
  try {
    const db = getD1Binding(c.env);
    const pair = c.req.param('pair');

    if (!pair) {
      return c.json({ error: 'Currency pair is required' }, 400);
    }

    // Fetch historical rates for the pair (last 30 days)
    const rates = await getHistoricalRates(db, pair, 30);

    if (rates.length < 2) {
      return c.json({
        pair,
        insufficient_data: true,
        message: 'At least 2 data points required for statistics',
        sample_size: rates.length,
      }, 200);
    }

    // Convert to RateDataPoint format for stats calculation
    const dataPoints: RateDataPoint[] = rates.map(r => ({
      rate: r.rate,
      timestamp: r.created_at,
    }));

    // Calculate all metrics
    const metrics = calculateMetrics(dataPoints);

    // Predict rate range based on historical trend
    const prediction = predictTrend(metrics);

    return c.json({
      pair,
      sample_size: rates.length,
      metrics,
      prediction,
      period_days: 30,
      calculated_at: Date.now(),
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    return c.json({ error: 'Failed to calculate statistics' }, 500);
  }
});

// Predict trend based on moving averages comparison
function predictTrend(metrics: ReturnType<typeof calculateMetrics>) {
  const { movingAverage7d, movingAverage30d, confidenceInterval } = metrics;

  if (isNaN(movingAverage7d) || isNaN(movingAverage30d)) {
    return {
      direction: 'uncertain',
      summary: 'Insufficient data for trend analysis',
    };
  }

  const diff = movingAverage7d - movingAverage30d;
  const diffPercent = (diff / movingAverage30d) * 100;

  let direction: 'bullish' | 'bearish' | 'stable';
  let summary: string;

  if (diffPercent > 2) {
    direction = 'bullish';
    summary = 'Tendencia al alza en los últimos 7 días vs promedio de 30 días';
  } else if (diffPercent < -2) {
    direction = 'bearish';
    summary = 'Tendencia a la baja en los últimos 7 días vs promedio de 30 días';
  } else {
    direction = 'stable';
    summary = 'Tipo de cambio estable en el período reciente';
  }

  return {
    direction,
    summary,
    diff_percent: diffPercent.toFixed(2),
    confidence_interval: confidenceInterval,
  };
}

export default stats;