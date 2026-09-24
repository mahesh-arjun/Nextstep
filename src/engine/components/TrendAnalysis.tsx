import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Info,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Incident, IncidentSeverity } from '../types';

interface TrendAnalysisProps {
  incidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
}

interface HourlyDataPoint {
  hourLabel: string;
  timestamp: number;
  total: number;
  p1: number;
  p2: number;
  p3p4: number;
  resolved: number;
  avgMttrMinutes: number;
}

// Generate realistic seeded baseline distribution for the preceding 23 hours
// to represent continuous 24h production monitoring
function generateHistorical24hBaseline(): HourlyDataPoint[] {
  const points: HourlyDataPoint[] = [];
  const now = Date.now();
  const oneHour = 3600 * 1000;

  // Realistic diurnal enterprise traffic curve with occasional spikes
  const historicalSeed = [
    { p1: 0, p2: 1, p3p4: 1, resolved: 2, mttr: 14 }, // T-23h (Night)
    { p1: 0, p2: 0, p3p4: 1, resolved: 1, mttr: 12 }, // T-22h
    { p1: 0, p2: 0, p3p4: 0, resolved: 0, mttr: 0 },  // T-21h
    { p1: 0, p2: 1, p3p4: 2, resolved: 2, mttr: 16 }, // T-20h
    { p1: 1, p2: 1, p3p4: 1, resolved: 3, mttr: 28 }, // T-19h (Batch backup glitch)
    { p1: 0, p2: 0, p3p4: 1, resolved: 1, mttr: 10 }, // T-18h
    { p1: 0, p2: 0, p3p4: 0, resolved: 0, mttr: 0 },  // T-17h (Early dawn)
    { p1: 0, p2: 1, p3p4: 1, resolved: 2, mttr: 15 }, // T-16h
    { p1: 0, p2: 2, p3p4: 2, resolved: 3, mttr: 19 }, // T-15h (Morning ramp-up)
    { p1: 1, p2: 2, p3p4: 3, resolved: 5, mttr: 25 }, // T-14h (Core business start)
    { p1: 0, p2: 1, p3p4: 2, resolved: 3, mttr: 18 }, // T-13h
    { p1: 1, p2: 3, p3p4: 2, resolved: 5, mttr: 22 }, // T-12h (Midday peak)
    { p1: 0, p2: 2, p3p4: 3, resolved: 4, mttr: 17 }, // T-11h
    { p1: 0, p2: 1, p3p4: 2, resolved: 3, mttr: 14 }, // T-10h
    { p1: 1, p2: 1, p3p4: 1, resolved: 3, mttr: 24 }, // T-9h
    { p1: 0, p2: 2, p3p4: 4, resolved: 5, mttr: 20 }, // T-8h (Afternoon surge)
    { p1: 0, p2: 1, p3p4: 2, resolved: 3, mttr: 15 }, // T-7h
    { p1: 1, p2: 2, p3p4: 2, resolved: 4, mttr: 26 }, // T-6h
    { p1: 0, p2: 1, p3p4: 1, resolved: 2, mttr: 16 }, // T-5h
    { p1: 0, p2: 0, p3p4: 2, resolved: 2, mttr: 12 }, // T-4h
    { p1: 1, p2: 2, p3p4: 1, resolved: 3, mttr: 21 }, // T-3h
    { p1: 0, p2: 1, p3p4: 2, resolved: 3, mttr: 18 }, // T-2h
    { p1: 0, p2: 1, p3p4: 1, resolved: 2, mttr: 15 }, // T-1h
    { p1: 0, p2: 0, p3p4: 0, resolved: 0, mttr: 0 },  // Current hour (populated dynamically)
  ];

  for (let i = 23; i >= 0; i--) {
    const bucketTime = now - i * oneHour;
    const date = new Date(bucketTime);
    const hourLabel =
      i === 0
        ? 'Now'
        : `${date.getHours().toString().padStart(2, '0')}:00`;

    const seed = historicalSeed[23 - i] || { p1: 0, p2: 1, p3p4: 1, resolved: 2, mttr: 15 };
    const total = seed.p1 + seed.p2 + seed.p3p4;

    points.push({
      hourLabel,
      timestamp: bucketTime,
      total,
      p1: seed.p1,
      p2: seed.p2,
      p3p4: seed.p3p4,
      resolved: seed.resolved,
      avgMttrMinutes: seed.mttr,
    });
  }

  return points;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ incidents }) => {
  const [viewMode, setViewMode] = useState<'SEVERITY' | 'RESOLUTION' | 'MTTR'>('SEVERITY');
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);

  // Synthesize historical 24h baseline with dynamic live incidents
  const chartData = useMemo(() => {
    const baseline = generateHistorical24hBaseline();
    const oneHour = 3600 * 1000;
    const now = Date.now();

    // Group live/active incidents into corresponding hour buckets
    for (const inc of incidents) {
      const diffMs = now - inc.createdAt;
      const hoursAgo = Math.floor(diffMs / oneHour);

      if (hoursAgo >= 0 && hoursAgo < 24) {
        const bucketIndex = 23 - hoursAgo;
        if (baseline[bucketIndex]) {
          baseline[bucketIndex].total += 1;
          if (inc.severity === 'P1') baseline[bucketIndex].p1 += 1;
          else if (inc.severity === 'P2') baseline[bucketIndex].p2 += 1;
          else baseline[bucketIndex].p3p4 += 1;

          if (inc.status === 'RESOLVED') {
            baseline[bucketIndex].resolved += 1;
            const durationMin = inc.resolvedAt
              ? Math.max(1, Math.round((inc.resolvedAt - inc.createdAt) / 60000))
              : 8;
            baseline[bucketIndex].avgMttrMinutes = baseline[bucketIndex].avgMttrMinutes
              ? Math.round((baseline[bucketIndex].avgMttrMinutes + durationMin) / 2)
              : durationMin;
          }
        }
      }
    }

    return baseline;
  }, [incidents]);

  // Telemetry Aggregations over 24h
  const metrics = useMemo(() => {
    let total24h = 0;
    let p1Total = 0;
    let p2Total = 0;
    let resolvedTotal = 0;
    let maxHourVolume = 0;
    let peakHourLabel = 'N/A';
    let totalMttrMinutes = 0;
    let mttrCount = 0;

    chartData.forEach((pt) => {
      total24h += pt.total;
      p1Total += pt.p1;
      p2Total += pt.p2;
      resolvedTotal += pt.resolved;

      if (pt.total > maxHourVolume) {
        maxHourVolume = pt.total;
        peakHourLabel = pt.hourLabel;
      }

      if (pt.avgMttrMinutes > 0) {
        totalMttrMinutes += pt.avgMttrMinutes;
        mttrCount += 1;
      }
    });

    const avgMttr = mttrCount > 0 ? Math.round(totalMttrMinutes / mttrCount) : 17;
    const p1Percentage = total24h > 0 ? ((p1Total / total24h) * 100).toFixed(1) : '0';
    const resolutionRate = total24h > 0 ? Math.min(100, Math.round((resolvedTotal / total24h) * 100)) : 100;

    return {
      total24h,
      p1Total,
      p2Total,
      resolvedTotal,
      maxHourVolume,
      peakHourLabel,
      avgMttr,
      p1Percentage,
      resolutionRate,
    };
  }, [chartData]);

  // Custom dark cyberpunk tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as HourlyDataPoint;
      return (
        <div className="bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md font-mono text-xs z-50 min-w-[200px]">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-800">
            <span className="text-zinc-200 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {label === 'Now' ? 'Current Hour (Now)' : `Hour: ${label}`}
            </span>
            <span className="text-[10px] text-zinc-500 font-sans">24h History</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                Total Incidents:
              </span>
              <strong className="text-white font-bold">{dataPoint.total}</strong>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                P1 Critical:
              </span>
              <strong>{dataPoint.p1}</strong>
            </div>

            <div className="flex justify-between items-center text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                P2 High:
              </span>
              <strong>{dataPoint.p2}</strong>
            </div>

            <div className="flex justify-between items-center text-blue-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                P3/P4 Low:
              </span>
              <strong>{dataPoint.p3p4}</strong>
            </div>

            <div className="flex justify-between items-center text-emerald-400 pt-1 border-t border-zinc-800/80">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Resolved:
              </span>
              <strong>{dataPoint.resolved}</strong>
            </div>

            <div className="flex justify-between items-center text-cyan-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Avg MTTR:
              </span>
              <strong>{dataPoint.avgMttrMinutes}m</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col relative overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              Historical Incident Trend Analysis
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                Rolling 24 Hours
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Hourly incident volume, severity velocity, MTTR stability, and peak failure density
          </p>
        </div>

        {/* View Mode Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
            <button
              onClick={() => setViewMode('SEVERITY')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'SEVERITY'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Severity Breakdown
            </button>
            <button
              onClick={() => setViewMode('RESOLUTION')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'RESOLUTION'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Total vs. Resolved
            </button>
            <button
              onClick={() => setViewMode('MTTR')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'MTTR'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              MTTR Velocity (Min)
            </button>
          </div>

          {/* Critical Filter Toggle */}
          <button
            onClick={() => setShowOnlyCritical(!showOnlyCritical)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
              showOnlyCritical
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>P1 Critical Focus</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Badges Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {/* Total 24h Volume */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-indigo-400" />
            24h Incident Volume
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-zinc-100">{metrics.total24h}</span>
            <span className="text-[10px] text-zinc-500 font-mono">incidents</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">~{(metrics.total24h / 24).toFixed(1)}/hr cadence</span>
        </div>

        {/* P1 Critical Volume */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            P1 Critical Ratio
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-rose-400">{metrics.p1Total}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {metrics.p1Percentage}%
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">SLA Critical Threshold</span>
        </div>

        {/* P2 High Volume */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            P2 High Severity
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-amber-400">{metrics.p2Total}</span>
            <span className="text-[10px] text-zinc-500 font-mono">events</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Degraded Dependents</span>
        </div>

        {/* Resolution Rate */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Resolution Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {metrics.resolutionRate}%
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">({metrics.resolvedTotal} resolved)</span>
          </div>
          <span className="text-[10px] text-emerald-500/80 mt-1">Operational target: &gt;85%</span>
        </div>

        {/* Mean Time to Resolve (MTTR) */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            Avg MTTR (24h)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-cyan-400">{metrics.avgMttr}</span>
            <span className="text-[10px] text-zinc-500 font-mono">minutes</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            -4.2m vs yesterday
          </span>
        </div>

        {/* Peak Failure Window */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-violet-400" />
            Peak Window
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-violet-300">
              {metrics.peakHourLabel}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">({metrics.maxHourVolume} inc)</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Highest failure density</span>
        </div>
      </div>

      {/* Main Recharts Line Chart Canvas */}
      <div className="w-full h-[280px] bg-zinc-950/80 rounded-xl border border-zinc-800/70 p-2 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.6} />

            <XAxis
              dataKey="hourLabel"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
              interval="preserveStartEnd"
              tick={{ fill: '#a1a1aa' }}
            />

            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
              allowDecimals={false}
              tick={{ fill: '#a1a1aa' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {/* SEVERITY VIEW */}
            {viewMode === 'SEVERITY' && !showOnlyCritical && (
              <>
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Incidents"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#818cf8', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#818cf8' }}
                />
                <Line
                  type="monotone"
                  dataKey="p1"
                  name="P1 Critical"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#f43f5e' }}
                />
                <Line
                  type="monotone"
                  dataKey="p2"
                  name="P2 High"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#fbbf24', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#fbbf24' }}
                />
                <Line
                  type="monotone"
                  dataKey="p3p4"
                  name="P3/P4 Low"
                  stroke="#60a5fa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </>
            )}

            {/* CRITICAL-ONLY FILTER VIEW */}
            {viewMode === 'SEVERITY' && showOnlyCritical && (
              <Line
                type="monotone"
                dataKey="p1"
                name="P1 Critical Outages"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e' }}
                activeDot={{ r: 7, fill: '#f43f5e' }}
              />
            )}

            {/* RESOLUTION VIEW */}
            {viewMode === 'RESOLUTION' && (
              <>
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Ingested Incidents"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#818cf8' }}
                  activeDot={{ r: 5, fill: '#818cf8' }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  name="Mitigated & Resolved"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </>
            )}

            {/* MTTR VIEW */}
            {viewMode === 'MTTR' && (
              <Line
                type="monotone"
                dataKey="avgMttrMinutes"
                name="Mean Time to Resolve (Minutes)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#06b6d4' }}
                activeDot={{ r: 6, fill: '#06b6d4' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info Strip */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Telemetry synchronized with in-memory correlation graph & rolling 1-hour temporal buckets.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetry Bus Live</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">Target MTTR SLA: &lt; 25m</span>
        </div>
      </div>
    </div>
  );
};
