import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Code,
  Copy,
  Filter,
  Layers,
  Pause,
  Play,
  Search,
  Zap,
} from 'lucide-react';
import { EventSeverity, NormalizedEvent } from '../types';

interface LiveEventStreamProps {
  events: NormalizedEvent[];
  isPaused: boolean;
  onTogglePause: () => void;
  selectedServiceFilter: string | null;
  onClearServiceFilter: () => void;
  onSelectEventForIncident?: (event: NormalizedEvent) => void;
}

export const LiveEventStream: React.FC<LiveEventStreamProps> = ({
  events,
  isPaused,
  onTogglePause,
  selectedServiceFilter,
  onClearServiceFilter,
  onSelectEventForIncident,
}) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | EventSeverity>('ALL');
  const [anomalousOnly, setAnomalousOnly] = useState(false);
  const [activeJsonEvent, setActiveJsonEvent] = useState<NormalizedEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    if (selectedServiceFilter && e.service !== selectedServiceFilter) return false;
    if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
    if (anomalousOnly && !e.isAnomalous) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchMsg = e.message.toLowerCase().includes(q);
      const matchType = e.eventType.toLowerCase().includes(q);
      const matchHost = e.host.toLowerCase().includes(q);
      const matchTrace = e.traceId.toLowerCase().includes(q);
      if (!matchMsg && !matchType && !matchHost && !matchTrace) return false;
    }

    return true;
  });

  const copyTrace = (traceId: string) => {
    navigator.clipboard.writeText(traceId);
    setCopiedId(traceId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getSeverityBadge = (sev: EventSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            CRITICAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            WARN
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Stream Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-100">Live Ingested Event Stream</h3>
          <span className="text-xs font-mono text-zinc-500">
            ({filteredEvents.length} shown / {events.length} in buffer)
          </span>

          {selectedServiceFilter && (
            <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full font-mono">
              <span>Service: {selectedServiceFilter}</span>
              <button
                onClick={onClearServiceFilter}
                className="text-zinc-400 hover:text-white font-bold ml-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition ${
              isPaused
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'Paused' : 'Pause Table'}</span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search stream..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 text-xs w-36 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none"
          >
            <option value="ALL">All Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warn</option>
            <option value="INFO">Info</option>
          </select>

          {/* Anomaly toggle */}
          <button
            onClick={() => setAnomalousOnly(!anomalousOnly)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs transition ${
              anomalousOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>3σ Anomalies</span>
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="flex-1 overflow-y-auto border border-zinc-800/80 rounded-lg">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 text-[11px] sticky top-0 z-10">
            <tr>
              <th className="p-2 w-20">Time</th>
              <th className="p-2 w-28">Service</th>
              <th className="p-2 w-20">Level</th>
              <th className="p-2 w-44">Event Type</th>
              <th className="p-2">Message</th>
              <th className="p-2 w-24 text-right">Latency / Err</th>
              <th className="p-2 w-28 text-center">Trace ID</th>
              <th className="p-2 w-14 text-center">Raw</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-zinc-500 italic">
                  No matching normalized events in the current buffer.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  className={`hover:bg-zinc-900/50 transition group ${
                    evt.isAnomalous ? 'bg-amber-950/10' : ''
                  }`}
                >
                  <td className="p-2 text-zinc-400 text-[11px] whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-2 font-bold text-zinc-200 whitespace-nowrap">{evt.service}</td>
                  <td className="p-2 whitespace-nowrap">{getSeverityBadge(evt.severity)}</td>
                  <td className="p-2 text-indigo-300 font-semibold whitespace-nowrap">
                    {evt.eventType}
                    {evt.isAnomalous && (
                      <span
                        className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        title={evt.anomalyReason}
                      >
                        ANOMALY
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-zinc-300 font-sans text-xs truncate max-w-md" title={evt.message}>
                    {evt.message}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <span
                      className={
                        evt.metrics.latencyMs > 500
                          ? 'text-rose-400 font-bold'
                          : 'text-zinc-200'
                      }
                    >
                      {evt.metrics.latencyMs}ms
                    </span>
                    <span className="text-zinc-500 text-[10px] block">
                      {evt.metrics.errorRatePct > 0 ? `${evt.metrics.errorRatePct}% err` : '0%'}
                    </span>
                  </td>
                  <td className="p-2 text-center whitespace-nowrap">
                    <button
                      onClick={() => copyTrace(evt.traceId)}
                      className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-mono border border-zinc-800 transition"
                      title="Copy Trace ID"
                    >
                      {copiedId === evt.traceId ? 'Copied' : evt.traceId.substring(0, 8)}
                    </button>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => setActiveJsonEvent(evt)}
                      className="p-1 rounded text-zinc-400 hover:text-indigo-400 transition"
                      title="Inspect CEF JSON"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CEF JSON Inspector Modal */}
      {activeJsonEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full p-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="font-mono text-xs font-bold text-zinc-200">
                Normalized CEF / ECS Schema: {activeJsonEvent.id}
              </span>
              <button
                onClick={() => setActiveJsonEvent(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-3 mt-3 bg-zinc-900 rounded border border-zinc-800 font-mono text-emerald-400 text-xs">
              {JSON.stringify(activeJsonEvent, null, 2)}
            </pre>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setActiveJsonEvent(null)}
                className="px-3 py-1 bg-zinc-800 text-zinc-200 rounded text-xs hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
