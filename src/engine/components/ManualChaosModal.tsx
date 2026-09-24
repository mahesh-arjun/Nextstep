import React, { useState } from 'react';
import { AlertTriangle, Flame, PlusCircle, X } from 'lucide-react';
import { EventSeverity, NormalizedEvent } from '../types';

interface ManualChaosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (event: Partial<NormalizedEvent>) => void;
}

export const ManualChaosModal: React.FC<ManualChaosModalProps> = ({
  isOpen,
  onClose,
  onInject,
}) => {
  if (!isOpen) return null;

  const [service, setService] = useState('inventory-db');
  const [eventType, setEventType] = useState('DB_DEADLOCK_ERROR');
  const [severity, setSeverity] = useState<EventSeverity>('CRITICAL');
  const [latencyMs, setLatencyMs] = useState(2500);
  const [errorRatePct, setErrorRatePct] = useState(35.0);
  const [cpuPct, setCpuPct] = useState(94);
  const [message, setMessage] = useState('Deadlock detected: transaction 4091 waiting for exclusive lock on table accounts');

  const handleInject = (e: React.FormEvent) => {
    e.preventDefault();
    onInject({
      service,
      eventType,
      severity,
      message,
      metrics: {
        latencyMs: Number(latencyMs),
        errorRatePct: Number(errorRatePct),
        cpuPct: Number(cpuPct),
        memoryPct: 82,
        dbConnectionsActive: service === 'inventory-db' ? 98 : undefined,
      },
      rawPayload: { injectedManually: true, operatorSession: 'sre-admin' },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-zinc-100">Live Chaos Event Injector</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Strip */}
        <div className="mt-3 space-y-1.5">
          <label className="text-[11px] font-mono text-zinc-400">Quick Incident & Siren Presets:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setService('api-gateway');
                setEventType('ROGUE_SERVER_INJECTION');
                setSeverity('CRITICAL');
                setLatencyMs(1850);
                setErrorRatePct(48.5);
                setCpuPct(98);
                setMessage('Harmful rogue server node detected transmitting malicious payloads and hijacking ingress traffic!');
              }}
              className="px-2 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 text-[11px] font-medium text-left transition flex items-center gap-1.5"
            >
              <span>🚨 Harmful Rogue Node</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setService('inventory-db');
                setEventType('DB_DEADLOCK_ERROR');
                setSeverity('CRITICAL');
                setLatencyMs(3200);
                setErrorRatePct(42.0);
                setCpuPct(96);
                setMessage('Deadlock detected: transaction 4091 waiting for exclusive lock on table accounts');
              }}
              className="px-2 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 text-[11px] font-medium text-left transition flex items-center gap-1.5"
            >
              <span>🔥 Crash Database</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setService('checkout-service');
                setEventType('K8S_OOM_CRASH_LOOP');
                setSeverity('CRITICAL');
                setLatencyMs(4100);
                setErrorRatePct(35.0);
                setCpuPct(99);
                setMessage('Pod exceeded memory quota (cgroup limit 2GiB). Terminated with exit code 137');
              }}
              className="px-2 py-1.5 rounded-lg bg-violet-950/60 hover:bg-violet-900/80 border border-violet-500/50 text-violet-200 text-[11px] font-medium text-left transition flex items-center gap-1.5"
            >
              <span>💥 K8s OOM Crash</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleInject} className="space-y-3 mt-3 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1">Target Service</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
            >
              <option value="inventory-db">inventory-db (Tier 0 Database)</option>
              <option value="payment-service">payment-service (Tier 1 Core)</option>
              <option value="checkout-service">checkout-service (Tier 1 App)</option>
              <option value="auth-service">auth-service (Tier 1 Auth)</option>
              <option value="redis-cache">redis-cache (Tier 0 Cache)</option>
              <option value="api-gateway">api-gateway (Tier 1 Gateway)</option>
              <option value="cloud-cdn">cloud-cdn (Tier 2 Edge)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1">Event Type</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as EventSeverity)}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="ERROR">ERROR</option>
                <option value="WARNING">WARNING</option>
                <option value="INFO">INFO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-zinc-400 block mb-1">Latency (ms)</label>
              <input
                type="number"
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value))}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Error Rate (%)</label>
              <input
                type="number"
                value={errorRatePct}
                onChange={(e) => setErrorRatePct(Number(e.target.value))}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">CPU (%)</label>
              <input
                type="number"
                value={cpuPct}
                onChange={(e) => setCpuPct(Number(e.target.value))}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Event Log Message</label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-200 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-md"
            >
              <Flame className="w-3.5 h-3.5" />
              Inject Anomaly Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
