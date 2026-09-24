import React from 'react';
import {
  AlertOctagon,
  Flame,
  Radio,
  Server,
  ShieldAlert,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

export interface HarmfulServerAlertData {
  serverId: string;
  serverName: string;
  reason: string;
  timestamp: number;
  metrics?: {
    errorRatePct?: number;
    cpuPct?: number;
    latencyMs?: number;
  };
}

interface HarmfulServerBannerProps {
  alert: HarmfulServerAlertData | null;
  isSirenActive: boolean;
  onSilenceSiren: () => void;
  onIsolateServer: (serverId: string) => void;
  onDismiss: () => void;
}

export const HarmfulServerBanner: React.FC<HarmfulServerBannerProps> = ({
  alert,
  isSirenActive,
  onSilenceSiren,
  onIsolateServer,
  onDismiss,
}) => {
  if (!alert) return null;

  return (
    <div className="w-full bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-y sm:border sm:rounded-xl border-rose-500/70 p-3 sm:p-4 text-white shadow-2xl shadow-rose-950/80 animate-pulse transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Siren Status & Harmful Server Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-400 text-rose-200 shadow-lg shadow-rose-600/50">
            <ShieldAlert className="w-6 h-6 text-rose-300 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black tracking-widest px-2 py-0.5 rounded bg-rose-500 text-white uppercase shadow">
                HARMFUL SERVER DETECTED
              </span>

              {isSirenActive && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 border border-rose-400/80 text-[11px] font-mono text-rose-200">
                  <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>EMERGENCY SIREN BLARING</span>
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-rose-100 flex items-center gap-2 mt-1">
              <Server className="w-4 h-4 text-rose-300" />
              <span>{alert.serverName}</span>
              <span className="text-xs font-normal text-rose-300">
                — {alert.reason}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {/* Silence Siren Button */}
          {isSirenActive && (
            <button
              onClick={onSilenceSiren}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-rose-400/60 text-xs font-semibold text-rose-200 shadow-md transition"
              title="Silence Acoustic Siren"
            >
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Silence Siren</span>
            </button>
          )}

          {/* Isolate & Quarantine Action */}
          <button
            onClick={() => onIsolateServer(alert.serverId)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/40 border border-rose-400 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quarantine & Reboot Server</span>
          </button>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/50 transition"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
