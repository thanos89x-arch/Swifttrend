/**
 * Technical Analysis Indicators
 * Extracted from SwiftTrendAI_v22.jsx - formulas preserved 100%
 */

export function calcRSI(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return [];
  const result = [];
  for (let i = period; i < closes.length; i++) {
    const slice = closes.slice(i - period, i + 1);
    let gains = 0, losses = 0;
    for (let j = 1; j < slice.length; j++) {
      const d = slice[j] - slice[j - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const avgG = gains / period;
    const avgL = losses / period;
    const rs = avgL === 0 ? 100 : avgG / avgL;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

export function calcMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): Array<{macd: number, signal: number, hist: number}> {
  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++)
      result.push(data[i] * k + result[i - 1] * (1 - k));
    return result;
  };

  if (closes.length < slow + signal) return [];
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.slice(slow - fast).map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  return macdLine.slice(signal - 1).map((m, i) => ({
    macd: m,
    signal: signalLine[i],
    hist: m - signalLine[i],
  }));
}

export function calcBB(
  closes: number[],
  period: number = 20,
  mult: number = 2
): Array<{mid: number, upper: number, lower: number}> {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    result.push({
      mid: mean,
      upper: mean + mult * std,
      lower: mean - mult * std
    });
  }
  return result;
}

export function calcFibLevels(high: number, low: number): Array<{pct: number, price: number}> {
  const diff = high - low;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618];
  return levels.map(l => ({
    pct: l,
    price: high - diff * l
  }));
}

export function calcGann(price: number): Array<{label: string, val: number}> {
  const sq = Math.sqrt(price);
  const angles = [
    { label: "1×1 (45°)",  val: price },
    { label: "2×1 (63°)",  val: Math.pow(sq + 0.5, 2) },
    { label: "1×2 (26°)",  val: Math.pow(sq - 0.5, 2) },
    { label: "4×1 (75°)",  val: Math.pow(sq + 1, 2) },
    { label: "1×4 (14°)",  val: Math.pow(sq - 1, 2) },
    { label: "8×1 (82°)",  val: Math.pow(sq + 2, 2) },
    { label: "Sq+1",       val: Math.pow(sq + 0.25, 2) },
    { label: "Sq−1",       val: Math.pow(sq - 0.25, 2) },
  ];
  return angles.filter(a => a.val > 0);
}

export function getDecimals(asset: {type: string, id: string, twelveSymbol?: string | null}): number {
  if (asset.type === "crypto") return asset.id === "BTCUSDT" ? 0 : 2;
  if (asset.id === "USDJPY" || asset.id === "EURJPY" || asset.id === "GBPJPY") return 2;
  if (asset.type === "index") {
    return ["DAX","FTSE","JP225"].includes(asset.twelveSymbol ?? '') ? 0 : 2;
  }
  if (asset.type === "forex") return 4;
  return 2; // metals, commodities
}