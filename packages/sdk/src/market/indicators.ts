import { NormalizedPricePoint } from "./marketTypes.js";

export function calculateEma(values: number[], period: number): number {
  if (values.length === 0) {
    return 0;
  }

  const smoothing = 2 / (period + 1);
  let ema = values[0];
  for (let index = 1; index < values.length; index += 1) {
    ema = values[index] * smoothing + ema * (1 - smoothing);
  }
  return ema;
}

export function calculateReturns(values: number[]): number[] {
  if (values.length < 2) {
    return [];
  }

  const returns: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === 0) {
      continue;
    }
    returns.push((current - previous) / previous);
  }

  return returns;
}

export function calculateVolatility(values: number[]): number {
  const returns = calculateReturns(values);
  if (returns.length === 0) {
    return 0;
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export function calculateReturnsOverWindow(points: NormalizedPricePoint[], lookbackMs: number): number {
  if (points.length < 2) {
    return 0;
  }

  const latest = points[points.length - 1];
  const target = [...points].reverse().find((point) => latest.timestamp - point.timestamp >= lookbackMs) ?? points[0];
  if (target.price === 0) {
    return 0;
  }

  return (latest.price - target.price) / target.price;
}
