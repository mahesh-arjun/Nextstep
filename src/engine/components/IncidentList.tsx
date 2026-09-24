import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Search,
  ShieldAlert,
  User,
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus } from '../types';

interface IncidentListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onAcknowledge: (incidentId: string) => void;
  onResolve: (incidentId: string) => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  onSelectIncident,
  onAcknowledge,
  onResolve,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IncidentSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIncidents = incidents.filter((inc) => {
    // Status filter
    if (statusFilter === 'ACTIVE' && inc.status === 'RESOLVED') return false;
    if (statusFilter === 'RESOLVED' && inc.status !== 'RESOLVED') return false;

    // Severity filter
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = inc.id.toLowerCase().includes(q);
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchService = inc.rootCauseService.toLowerCase().includes(q);
      const matchCascade = inc.cascadingServices.some((s) => s.toLowerCase().includes(q));
      if (!matchId && !matchTitle && !matchService && !matchCascade) return false;
    }

    return true;
  });

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'P1':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-sm shadow-rose-500/10">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            P1 CRITICAL
          </span>
        );
      case 'P2':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            P2 HIGH
          </span>
        );
      case 'P3':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
            P3 MEDIUM
          </span>
        );
      case 'P4':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
            P4 LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'TRIGGERED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 border border-rose-600/50 text-rose-300 animate-pulse">
            TRIGGERED
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
            ACKNOWLEDGED
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 border border-amber-500/40 text-amber-300">
            INVESTIGATING
          </span>
        );
      case 'MITIGATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            MITIGATED
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            RESOLVED
          </span>
        );
    }
  };

  const formatElapsed = (timestamp: number) => {
    const sec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s ago`;
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Correlated Incidents Feed
            <span className="text-xs font-mono font-normal text-zinc-400">
              ({filteredIncidents.length} shown / {incidents.length} total)
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time multi-event clusters correlated by topology and time-window
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, title, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs w-48"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-zinc-800 text-zinc-100 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === 'RESOLVED'
                  ? 'bg-zinc-800 text-zinc-100 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-800 text-zinc-100 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
          </div>

          {/* Severity Select */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="P1">P1 Only</option>
            <option value="P2">P2 Only</option>
            <option value="P3">P3 Only</option>
          </select>
        </div>
      </div>

      {/* Incidents Card Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 text-zinc-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
            <p className="font-semibold text-sm text-zinc-300">No Incidents Matching Filters</p>
            <p className="text-xs text-zinc-500 mt-1">
              All services are operating within normal variance parameters, or no incidents match the current criteria.
            </p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const hasAiAnalysis = Boolean(incident.aiAnalysis);

            return (
              <div
                key={incident.id}
                className={`border rounded-xl p-4 transition-all duration-200 shadow-md ${
                  incident.status === 'RESOLVED'
                    ? 'border-zinc-800/80 bg-zinc-900/40 opacity-75 hover:opacity-100'
                    : incident.severity === 'P1'
                    ? 'border-rose-600/50 bg-rose-950/20 hover:border-rose-500/80 ring-1 ring-rose-500/20'
                    : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-zinc-300 bg-zinc-800/90 px-2 py-0.5 rounded border border-zinc-700">
                      {incident.id}
                    </span>
                    {getSeverityBadge(incident.severity)}
                    {getStatusBadge(incident.status)}

                    {hasAiAnalysis && (
                      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <Bot className="w-3 h-3 text-violet-400" />
                        AI Analyzed
                      </span>
                    )}
                  </div>

                  {/* Priority score & Timing */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div
                      className="flex items-center gap-1"
                      title="Automated Priority Score calculated from blast radius, service tier, and peak degradation"
                    >
                      <span className="text-zinc-400">Priority:</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                          incident.priorityScore >= 75
                            ? 'bg-rose-500/20 text-rose-400'
                            : incident.priorityScore >= 50
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {incident.priorityScore}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatElapsed(incident.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Incident Title & Summary */}
                <div className="mt-2.5">
                  <h3
                    onClick={() => onSelectIncident(incident)}
                    className="text-sm font-bold text-zinc-100 hover:text-indigo-400 cursor-pointer transition flex items-center gap-2"
                  >
                    {incident.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{incident.summary}</p>
                </div>

                {/* Root Cause & Cascading Services Chain */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                      <span className="text-zinc-400 text-[10px] uppercase font-bold">Root:</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {incident.rootCauseService}
                      </span>
                    </div>

                    {incident.cascadingServices.length > 0 && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <span className="text-zinc-400 text-[10px] uppercase">Cascade:</span>
                        <div className="flex items-center gap-1">
                          {incident.cascadingServices.map((svc) => (
                            <span
                              key={svc}
                              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            >
                              {svc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-zinc-400 font-mono text-[11px]">
                      • {incident.eventIds.length} Correlated Events
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {incident.status === 'TRIGGERED' && (
                      <button
                        onClick={() => onAcknowledge(incident.id)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                      >
                        Acknowledge
                      </button>
                    )}

                    {incident.status !== 'RESOLVED' && (
                      <button
                        onClick={() => onResolve(incident.id)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-700/80 hover:bg-emerald-600 text-white transition shadow-sm"
                      >
                        Resolve
                      </button>
                    )}

                    <button
                      onClick={() => onSelectIncident(incident)}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1"
                    >
                      <span>Investigate</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
