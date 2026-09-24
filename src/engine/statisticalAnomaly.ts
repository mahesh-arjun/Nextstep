import { NormalizedEvent } from '../types';

interface MetricStats {
  count: number;
  mean: number;
  m2: number; // For Welford's algorithm variance
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  history: number[];
}

export class StatisticalAnomalyDetector {
  private statsMap: Map<string, MetricStats> = new Map();
  private zThreshold: number = 3.0; // 3-sigma default
  private windowSize: number = 60; // recent window

  constructor(zThreshold: number = 3.0) {
    this.zThreshold = zThreshold;
  }

  public setZThreshold(threshold: number): void {
    this.zThreshold = Math.max(1.5, Math.min(5.0, threshold));
  }

  public getZThreshold(): number {
    return this.zThreshold;
  }

  /**
   * Update online stats using Welford's algorithm and evaluate if the event has statistical anomalies
   */
  public evaluateEvent(event: NormalizedEvent): {
    isAnomalous: boolean;
    anomalyScore: number;
    reason?: string;
    details?: { metric: string; value: number; baselineMean: number; zScore: number }[];
  } {
    const service = event.service;
    const metricsToTest: Array<{ key: 'latencyMs' | 'errorRatePct' | 'cpuPct'; value: number }> = [
      { key: 'latencyMs', value: event.metrics.latencyMs },
      { key: 'errorRatePct', value: event.metrics.errorRatePct },
      { key: 'cpuPct', value: event.metrics.cpuPct },
    ];

    let maxZScore = 0;
    const anomalyDetails: { metric: string; value: number; baselineMean: number; zScore: number }[] = [];

    for (const item of metricsToTest) {
      const statsKey = `${service}:${item.key}`;
      let stats = this.statsMap.get(statsKey);

      if (!stats) {
        stats = {
          count: 0,
          mean: item.value,
          m2: 0,
          variance: 1,
          stdDev: 1,
          min: item.value,
          max: item.value,
          history: [],
        };
        this.statsMap.set(statsKey, stats);
      }

      // Update history buffer
      stats.history.push(item.value);
      if (stats.history.length > this.windowSize) {
        stats.history.shift();
      }

      // Need at least 10 baseline samples before flagging anomalies to prevent cold-start false positives
      if (stats.count >= 10 && stats.stdDev > 0.001) {
        const zScore = (item.value - stats.mean) / stats.stdDev;
        if (zScore > maxZScore) {
          maxZScore = zScore;
        }

        if (zScore >= this.zThreshold) {
          anomalyDetails.push({
            metric: item.key,
            value: item.value,
            baselineMean: Math.round(stats.mean * 10) / 10,
            zScore: Math.round(zScore * 10) / 10,
          });
        }
      }

      // Welford's algorithm for online variance & mean
      stats.count++;
      const delta = item.value - stats.mean;
      stats.mean += delta / stats.count;
      const delta2 = item.value - stats.mean;
      stats.m2 += delta * delta2;
      stats.variance = stats.count > 1 ? stats.m2 / (stats.count - 1) : 1;
      stats.stdDev = Math.max(0.1, Math.sqrt(stats.variance));
      stats.min = Math.min(stats.min, item.value);
      stats.max = Math.max(stats.max, item.value);
    }

    const isAnomalous = anomalyDetails.length > 0;
    let reason = '';
    if (isAnomalous) {
      const first = anomalyDetails[0];
      reason = `Statistical anomaly on ${first.metric} (${first.value} vs baseline ${first.baselineMean}, Z-score: +${first.zScore}σ)`;
    }

    const anomalyScore = Math.min(100, Math.round((maxZScore / this.zThreshold) * 50));

    return {
      isAnomalous,
      anomalyScore,
      reason: isAnomalous ? reason : undefined,
      details: anomalyDetails,
    };
  }

  public getBaselineStats(service: string, metric: string): { mean: number; stdDev: number } | null {
    const stats = this.statsMap.get(`${service}:${metric}`);
    if (!stats || stats.count < 5) return null;
    return {
      mean: Math.round(stats.mean * 10) / 10,
      stdDev: Math.round(stats.stdDev * 10) / 10,
    };
  }

  public reset(): void {
    this.statsMap.clear();
  }
}
