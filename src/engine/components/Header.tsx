import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Pause,
  Play,
  PlusCircle,
  Radio,
  Sliders,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { IncidentSeverity, ScenarioType } from '../types';

interface HeaderProps {
  isStreaming: boolean;
  onToggleStreaming: () => void;
  eps: number;
  onEpsChange: (eps: number) => void;
  activeScenario: ScenarioType;
  onSelectScenario: (scenario: ScenarioType) => void;
  totalEventsCount: number;
  activeIncidentsCount: number;
  severityCounts: Record<IncidentSeverity, number>;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenSoundSettings: () => void;
  isSirenActive?: boolean;
  onSilenceSiren?: () => void;
  onOpenRules: () => void;
  onOpenManualInject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isStreaming,
  onToggleStreaming,
  eps,
  onEpsChange,
  activeScenario,
  onSelectScenario,
  totalEventsCount,
  activeIncidentsCount,
  severityCounts,
  audioEnabled,
  onToggleAudio,
  onOpenSoundSettings,
  isSirenActive,
  onSilenceSiren,
  onOpenRules,
  onOpenManualInject,
}) => {
  const isHealthy = activeIncidentsCount === 0;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 text-white sticky top-0 z-30 shadow-lg">
      {/* Top Brand Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                IncidentPulse
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v2.4 Core
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Real-Time Intelligent Incident Detection & Response Engine
            </p>
          </div>
        </div>

        {/* System Health Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isHealthy
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                : severityCounts.P1 > 0
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-400' : severityCounts.P1 > 0 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
            />
            <span>
              {isHealthy
                ? 'ALL SYSTEMS OPERATIONAL'
                : severityCounts.P1 > 0
                ? `CRITICAL OUTAGE: ${severityCounts.P1} P1 INCIDENT${severityCounts.P1 > 1 ? 'S' : ''}`
                : `SYSTEM DEGRADED: ${activeIncidentsCount} ACTIVE INCIDENTS`}
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Audio Toggle & Sound Settings */}
            <div className="flex items-center rounded-md border border-zinc-700 bg-zinc-900 overflow-hidden shadow-sm">
              <button
                onClick={onToggleAudio}
                title={audioEnabled ? 'Mute System Audio' : 'Unmute System Audio'}
                className={`p-1.5 px-2 text-xs transition border-r border-zinc-800 ${
                  audioEnabled
                    ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              </button>
              <button
                onClick={onOpenSoundSettings}
                title="Configure System Alert Sound Profile, Volume & Triggers"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              >
                <Sliders className="w-3 h-3 text-indigo-400" />
                <span>Alert Sound</span>
              </button>
            </div>

            {/* Active Siren Quick Silence */}
            {isSirenActive && (
              <button
                onClick={onSilenceSiren}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/50 animate-pulse border border-rose-400 transition"
                title="Siren is blaring for harmful server! Click to silence siren"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="tracking-wide">SILENCE SIREN</span>
              </button>
            )}

            <button
              onClick={onOpenRules}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span>Rules & Anomaly</span>
            </button>

            <button
              onClick={onOpenManualInject}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-indigo-600/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-xs font-medium transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Inject Chaos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Strip & Telemetry Counters */}
      <div className="px-4 py-2 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Stream Simulator Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleStreaming}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition shadow-sm ${
              isStreaming
                ? 'bg-amber-600/90 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950/60 px-2.5 py-1 rounded border border-zinc-800">
            <span>Throughput:</span>
            <input
              type="range"
              min="1"
              max="30"
              value={eps}
              onChange={(e) => onEpsChange(Number(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
            />
            <span className="font-mono text-zinc-200 w-12 text-right">{eps} EPS</span>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-zinc-400 font-medium whitespace-nowrap">Scenarios:</span>
            <button
              onClick={() => onSelectScenario('NORMAL')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                activeScenario === 'NORMAL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => onSelectScenario('DB_CONNECTION_CASCADE')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                activeScenario === 'DB_CONNECTION_CASCADE'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              DB Cascade
            </button>
            <button
              onClick={() => onSelectScenario('PAYMENT_GATEWAY_OUTAGE')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                activeScenario === 'PAYMENT_GATEWAY_OUTAGE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Payment Outage
            </button>
            <button
              onClick={() => onSelectScenario('AUTH_BRUTE_FORCE')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                activeScenario === 'AUTH_BRUTE_FORCE'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <Zap className="w-3 h-3 text-purple-400" />
              Auth Bot Attack
            </button>
            <button
              onClick={() => onSelectScenario('K8S_OOM_CRASH_LOOP')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                activeScenario === 'K8S_OOM_CRASH_LOOP'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              K8s OOM Loop
            </button>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ingested:</span>
            <span className="text-zinc-100 font-bold">{totalEventsCount.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Severity:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                severityCounts.P1 > 0
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              P1: {severityCounts.P1}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                severityCounts.P2 > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              P2: {severityCounts.P2}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-400">
              P3/4: {severityCounts.P3 + severityCounts.P4}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
