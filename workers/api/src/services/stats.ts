// Statistical calculations for exchange rate analysis
// Based on classical statistical methods for time series

export interface StatisticalMetrics {
  movingAverage7d: number;
  movingAverage30d: number;
  standardDeviation: number;
  min: number;
  max: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  sampleSize: number;
}

export interface RateDataPoint {
  rate: number;
  timestamp: number;
}

// Calculate simple moving average
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) {
    return NaN;
  }

  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

// Calculate standard deviation
export function calculateStdDev(data: number[]): number {
  if (data.length < 2) {
    return 0;
  }

  const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
  const squaredDiffs = data.map(val => Math.pow(val - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / data.length;

  return Math.sqrt(avgSquaredDiff);
}

// Calculate confidence interval (95%)
export function calculateConfidenceInterval(data: number[]): { lower: number; upper: number } {
  if (data.length < 2) {
    return { lower: NaN, upper: NaN };
  }

  const avg = data.reduce((acc, val) => acc + val, 0) / data.length;
  const stdDev = calculateStdDev(data);

  // 95% confidence interval: avg ± (1.96 * stdDev / sqrt(n))
  // For small samples, use t-distribution approximation
  const n = data.length;
  const margin = 1.96 * (stdDev / Math.sqrt(n));

  return {
    lower: avg - margin,
    upper: avg + margin,
  };
}

// Calculate all statistical metrics for a set of rates
export function calculateMetrics(rates: RateDataPoint[]): StatisticalMetrics {
  if (rates.length === 0) {
    return {
      movingAverage7d: NaN,
      movingAverage30d: NaN,
      standardDeviation: 0,
      min: 0,
      max: 0,
      confidenceInterval: { lower: NaN, upper: NaN },
      sampleSize: 0,
    };
  }

  const rateValues = rates.map(r => r.rate);

  return {
    movingAverage7d: calculateSMA(rateValues, 7),
    movingAverage30d: calculateSMA(rateValues, 30),
    standardDeviation: calculateStdDev(rateValues),
    min: Math.min(...rateValues),
    max: Math.max(...rateValues),
    confidenceInterval: calculateConfidenceInterval(rateValues),
    sampleSize: rates.length,
  };
}

// Calculate predicted rate range based on historical trend
export function predictRateRange(metrics: StatisticalMetrics): { predicted: number; range: string } {
  if (isNaN(metrics.movingAverage30d)) {
    return { predicted: NaN, range: 'insufficient_data' };
  }

  const { lower, upper } = metrics.confidenceInterval;

  if (isNaN(lower) || isNaN(upper)) {
    return { predicted: metrics.movingAverage30d, range: 'uncertain' };
  }

  // Trend direction based on 7d vs 30d moving average
  const trend = metrics.movingAverage7d > metrics.movingAverage30d ? 'bullish' : 'bearish';

  return {
    predicted: metrics.movingAverage30d,
    range: `${lower.toFixed(4)} - ${upper.toFixed(4)}`,
  };
}