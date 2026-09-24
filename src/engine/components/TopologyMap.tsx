import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Database,
  Layers,
  Network,
  Server,
  Shield,
  Zap,
} from 'lucide-react';
import { Incident, ServiceNode } from '../types';

interface TopologyMapProps {
  topology: Record<string, ServiceNode>;
  activeIncidents: Incident[];
  selectedService: string | null;
  onSelectService: (serviceId: string | null) => void;
}

export const TopologyMap: React.FC<TopologyMapProps> = ({
  topology,
  activeIncidents,
  selectedService,
  onSelectService,
}) => {
  // Compute which services are Root Causes and which are Cascading Symptoms
  const { rootCauseServices, cascadingServices } = useMemo(() => {
    const roots = new Set<string>();
    const cascades = new Set<string>();

    for (const inc of activeIncidents) {
      if (inc.status === 'RESOLVED') continue;
      if (inc.rootCauseService) roots.add(inc.rootCauseService);
      for (const s of inc.cascadingServices) cascades.add(s);
    }

    return { rootCauseServices: roots, cascadingServices: cascades };
  }, [activeIncidents]);

  // Pre-calculate connection lines
  const connections = useMemo(() => {
    const lines: Array<{
      from: ServiceNode;
      to: ServiceNode;
      isCascading: boolean;
      isActive: boolean;
    }> = [];

    Object.values(topology).forEach((sourceNode) => {
      sourceNode.dependencies.forEach((targetId) => {
        const targetNode = topology[targetId];
        if (targetNode) {
          const isCascading =
            (rootCauseServices.has(targetId) && cascadingServices.has(sourceNode.id)) ||
            (rootCauseServices.has(sourceNode.id) && cascadingServices.has(targetId));

          const isActive =
            rootCauseServices.has(sourceNode.id) ||
            rootCauseServices.has(targetId) ||
            cascadingServices.has(sourceNode.id) ||
            cascadingServices.has(targetId);

          lines.push({
            from: sourceNode,
            to: targetNode,
            isCascading,
            isActive,
          });
        }
      });
    });

    return lines;
  }, [topology, rootCauseServices, cascadingServices]);

  const getServiceIcon = (category: ServiceNode['category']) => {
    switch (category) {
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'cache':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'gateway':
        return <Network className="w-4 h-4 text-indigo-400" />;
      case 'edge':
        return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'messaging':
        return <Zap className="w-4 h-4 text-purple-400" />;
      case 'service':
      default:
        return <Server className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col relative overflow-hidden">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Network className="w-4 h-4 text-indigo-400" />
            Distributed Service Topology & Cascade Graph
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time health telemetry, anomaly signals, and cascading failure propagation lines
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-300 font-bold">Root Culprit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-amber-300">Cascade Impact</span>
          </div>
          {selectedService && (
            <button
              onClick={() => onSelectService(null)}
              className="ml-2 text-indigo-400 hover:underline text-[11px]"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[410px] bg-zinc-950/90 rounded-lg border border-zinc-800/60 overflow-hidden select-none">
        <svg
          viewBox="0 0 1060 480"
          className="w-full h-full"
          style={{ background: 'radial-gradient(ellipse at center, #18181b 0%, #09090b 100%)' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.5" opacity="0.4" />
            </pattern>

            {/* Glowing filter for critical alarms */}
            <filter id="glow-critical" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Marker definitions for dependency arrows */}
            <marker id="arrow-normal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#52525b" />
            </marker>
            <marker id="arrow-cascade" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render Connections */}
          {connections.map((conn, idx) => {
            const isCascading = conn.isCascading;
            const isSelected =
              selectedService === conn.from.id || selectedService === conn.to.id;

            // Offset to node edges approx
            const x1 = conn.from.x + 85;
            const y1 = conn.from.y + 40;
            const x2 = conn.to.x + 85;
            const y2 = conn.to.y + 40;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const cx1 = x1 + dx * 0.5;
            const cy1 = y1;
            const cx2 = x1 + dx * 0.5;
            const cy2 = y2;
            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            return (
              <g key={`conn-${idx}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    isCascading
                      ? '#f43f5e'
                      : isSelected
                      ? '#818cf8'
                      : conn.isActive
                      ? '#fbbf24'
                      : '#3f3f46'
                  }
                  strokeWidth={isCascading ? 3 : isSelected ? 2.5 : 1.5}
                  strokeDasharray={isCascading ? '6,4' : undefined}
                  markerEnd={isCascading ? 'url(#arrow-cascade)' : 'url(#arrow-normal)'}
                  className={isCascading ? 'animate-pulse' : ''}
                />
              </g>
            );
          })}

          {/* Render Service Nodes as foreignObjects for rich HTML styling */}
          {Object.values(topology).map((node) => {
            const isRoot = rootCauseServices.has(node.id);
            const isCascade = cascadingServices.has(node.id);
            const isSelected = selectedService === node.id;

            let borderClass = 'border-zinc-800 bg-zinc-900/90 hover:border-zinc-700';
            let haloGlow = '';

            if (isRoot) {
              borderClass = 'border-rose-500 bg-rose-950/90 ring-4 ring-rose-500/30';
              haloGlow = 'animate-pulse';
            } else if (isCascade) {
              borderClass = 'border-amber-500/90 bg-amber-950/80 ring-2 ring-amber-500/20';
            } else if (isSelected) {
              borderClass = 'border-indigo-500 bg-indigo-950/80 ring-2 ring-indigo-500/30';
            }

            return (
              <foreignObject
                key={node.id}
                x={node.x}
                y={node.y}
                width={175}
                height={86}
                className="overflow-visible cursor-pointer transition-all duration-200"
                onClick={() => onSelectService(selectedService === node.id ? null : node.id)}
              >
                <div
                  className={`p-2.5 rounded-xl border text-xs shadow-lg backdrop-blur-sm relative transition-all ${borderClass} ${haloGlow}`}
                >
                  {/* Status Badges */}
                  {isRoot && (
                    <div className="absolute -top-3 left-2 bg-rose-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider shadow-md flex items-center gap-1 animate-bounce">
                      <AlertCircle className="w-2.5 h-2.5" />
                      ROOT CULPRIT
                    </div>
                  )}
                  {isCascade && !isRoot && (
                    <div className="absolute -top-3 left-2 bg-amber-600 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider shadow-md flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      CASCADE
                    </div>
                  )}

                  {/* Service Title Bar */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {getServiceIcon(node.category)}
                      <span className="font-bold text-zinc-100 truncate text-[11px]">
                        {node.name}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1 rounded uppercase ${
                        node.tier === 0
                          ? 'bg-rose-500/20 text-rose-300'
                          : node.tier === 1
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      T{node.tier}
                    </span>
                  </div>

                  {/* Real-time telemetry metrics */}
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-zinc-800/80 font-mono text-[10px]">
                    <div title="p95 Latency">
                      <span className="text-zinc-400 block text-[9px]">Lat</span>
                      <span
                        className={
                          node.metrics.currentLatency > 800
                            ? 'text-rose-400 font-bold'
                            : 'text-zinc-200'
                        }
                      >
                        {Math.round(node.metrics.currentLatency)}ms
                      </span>
                    </div>
                    <div title="Error Rate">
                      <span className="text-zinc-400 block text-[9px]">Err</span>
                      <span
                        className={
                          node.metrics.currentErrorRate > 5
                            ? 'text-rose-400 font-bold'
                            : 'text-zinc-200'
                        }
                      >
                        {node.metrics.currentErrorRate.toFixed(1)}%
                      </span>
                    </div>
                    <div title="CPU Saturation">
                      <span className="text-zinc-400 block text-[9px]">CPU</span>
                      <span
                        className={
                          node.metrics.currentCpu > 85
                            ? 'text-rose-400 font-bold'
                            : 'text-zinc-200'
                        }
                      >
                        {Math.round(node.metrics.currentCpu)}%
                      </span>
                    </div>
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
