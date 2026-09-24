import React from 'react';
import { Activity, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

interface MetricsOverviewProps {
  latencyHistory: number[];
  errorRateHistory: number[];
  eps: number;
  anomalyThreshold: number;
  avgLatency: number;
  avgErrorRate: number;
  anomaliesDetectedCount: number;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  latencyHistory,
  errorRateHistory,
  eps,
  anomalyThreshold,
  avgLatency,
  avgErrorRate,
  anomaliesDetectedCount,
}) => {
  // Convert history array to SVG polyline coordinates
  const renderSparkline = (
    data: number[],
    height: number = 44,
    strokeColor: string = '#818cf8',
    fillColor: string = 'rgba(129, 140, 248, 0.15)'
  ) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 10);
    const min = 0;
    const range = max - min || 1;
    const width = 160;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    });

    const pathString = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path d={pathString} fill={fillColor} />
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Latency Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            p95 Latency Stream
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            Realtime
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-xl font-bold font-mono text-zinc-100">
            {Math.round(avgLatency)}
            <span className="text-xs text-zinc-500 font-normal ml-1">ms</span>
          </div>
          {renderSparkline(latencyHistory.slice(-20), 36, avgLatency > 500 ? '#f43f5e' : '#818cf8')}
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 flex justify-between font-mono">
          <span>Baseline: ~35ms</span>
          <span className={avgLatency > 500 ? 'text-rose-400 font-bold' : ''}>
            {avgLatency > 500 ? '3σ SLA Breach' : 'Nominal'}
          </span>
        </div>
      </div>

      {/* Error Rate Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            HTTP 5xx Error Rate
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            15s Win
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-xl font-bold font-mono text-zinc-100">
            {avgErrorRate.toFixed(1)}
            <span className="text-xs text-zinc-500 font-normal ml-1">%</span>
          </div>
          {renderSparkline(
            errorRateHistory.slice(-20),
            36,
            avgErrorRate > 5 ? '#f43f5e' : '#10b981',
            avgErrorRate > 5 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)'
          )}
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 flex justify-between font-mono">
          <span>Target: &lt; 0.5%</span>
          <span className={avgErrorRate > 5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
            {avgErrorRate > 5 ? 'Degraded' : 'Healthy'}
          </span>
        </div>
      </div>

      {/* Anomaly Detection Radar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Statistical Anomaly (Z-Score)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            ±{anomalyThreshold}σ
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-xl font-bold font-mono text-amber-400">
            {anomaliesDetectedCount}
            <span className="text-xs text-zinc-500 font-normal ml-1">flagged</span>
          </div>
          <div className="w-24 bg-zinc-800 h-2 rounded-full overflow-hidden self-center">
            <div
              className={`h-full ${
                anomaliesDetectedCount > 5 ? 'bg-rose-500' : 'bg-amber-400'
              } transition-all duration-300`}
              style={{ width: `${Math.min(100, anomaliesDetectedCount * 12)}%` }}
            />
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 flex justify-between font-mono">
          <span>Welford 3σ Model</span>
          <span className="text-zinc-400">Dynamic Thresholding</span>
        </div>
      </div>

      {/* Stream Engine Ingestion */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Ingest Velocity
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
            Pipeline
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-xl font-bold font-mono text-zinc-100">
            {eps}
            <span className="text-xs text-zinc-500 font-normal ml-1">EPS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] text-emerald-400 font-mono">Live Sync</span>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 flex justify-between font-mono">
          <span>Latency Budget: &lt; 5ms</span>
          <span className="text-cyan-400 font-bold">In-Memory Bus</span>
        </div>
      </div>
    </div>
  );
};
