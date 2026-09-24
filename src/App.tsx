import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { AlertSoundModal } from './components/AlertSoundModal';
import { HarmfulServerBanner, HarmfulServerAlertData } from './components/HarmfulServerBanner';
import { IncidentDeepDiveModal } from './components/IncidentDeepDiveModal';
import { IncidentList } from './components/IncidentList';
import { LiveEventStream } from './components/LiveEventStream';
import { ManualChaosModal } from './components/ManualChaosModal';
import { MetricsOverview } from './components/MetricsOverview';
import { RulesConfigModal } from './components/RulesConfigModal';
import { TopologyMap } from './components/TopologyMap';
import { TrendAnalysis } from './components/TrendAnalysis';
import { CorrelationEngine } from './engine/correlationEngine';
import { RulesEngine } from './engine/rulesEngine';
import { StatisticalAnomalyDetector } from './engine/statisticalAnomaly';
import { StreamSimulator } from './engine/streamSimulator';
import { INITIAL_TOPOLOGY_NODES } from './engine/topology';
import { audioNotifier } from './services/audioNotifier';
import { requestIncidentAnalysis } from './services/geminiService';
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  NormalizedEvent,
  ScenarioType,
  ServiceNode,
} from './types';

export default function App() {
  // Core Engines Refs
  const topologyRef = useRef<Record<string, ServiceNode>>({ ...INITIAL_TOPOLOGY_NODES });
  const anomalyDetectorRef = useRef(new StatisticalAnomalyDetector(3.0));
  const rulesEngineRef = useRef(new RulesEngine());
  const correlationEngineRef = useRef(new CorrelationEngine(topologyRef.current));
  const simulatorRef = useRef<StreamSimulator | null>(null);

  // Application States
  const [topology, setTopology] = useState<Record<string, ServiceNode>>({ ...INITIAL_TOPOLOGY_NODES });
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [resolvedIncidents, setResolvedIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string | null>(null);

  // Stream & Scenario States
  const [isStreaming, setIsStreaming] = useState(true);
  const [isTablePaused, setIsTablePaused] = useState(false);
  const [eps, setEps] = useState(6);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('NORMAL');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Harmful Server & Siren Alert State
  const [harmfulServerAlert, setHarmfulServerAlert] = useState<HarmfulServerAlertData | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);

  // Modals
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isManualChaosOpen, setIsManualChaosOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);

  // Telemetry History
  const [latencyHistory, setLatencyHistory] = useState<number[]>([25, 28, 30, 32, 29, 35]);
  const [errorRateHistory, setErrorRateHistory] = useState<number[]>([0.1, 0.0, 0.2, 0.1, 0.0]);
  const [anomaliesCount, setAnomaliesCount] = useState(0);

  // Process incoming event from stream simulator
  const handleEventGenerated = useCallback((event: NormalizedEvent) => {
    // 1. Statistical Anomaly Detection (Online Welford Z-score)
    const anomalyResult = anomalyDetectorRef.current.evaluateEvent(event);
    if (anomalyResult.isAnomalous) {
      event.isAnomalous = true;
      event.anomalyScore = anomalyResult.anomalyScore;
      event.anomalyReason = anomalyResult.reason;
      setAnomaliesCount((prev) => prev + 1);
      audioNotifier.playAnomalyPing();
    }

    // 2. Rules Engine Evaluation (Threshold, Rate, Pattern, Composite)
    const ruleResult = rulesEngineRef.current.evaluate(event);

    // 3. Correlation & Cascading Failure Engine
    const shouldCorrelate =
      event.isAnomalous ||
      ruleResult.triggered ||
      event.severity === 'CRITICAL' ||
      event.severity === 'ERROR';

    if (shouldCorrelate) {
      const { incident, isNewIncident, isCascade } = correlationEngineRef.current.correlate(
        event,
        {
          ruleTitle: ruleResult.rule?.targetIncidentTitle,
          severity: ruleResult.rule?.severity || (event.severity === 'CRITICAL' ? 'P1' : 'P2'),
          reason: ruleResult.reason || anomalyResult.reason || event.message,
        }
      );

      // Play alert sound for new incidents or newly propagated cascades based on configured sound & severity threshold
      if (isNewIncident || isCascade) {
        audioNotifier.playIncidentAlert(incident.severity);
      }

      // Sync active incidents
      setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);

      // If this incident is currently open in modal, keep it synced
      setSelectedIncident((curr) => {
        if (curr && curr.id === incident.id) {
          return { ...incident };
        }
        return curr;
      });
    }

    // 4. Update Node Metrics in Topology & Detect Harmful / Critical Failing Servers
    const currentTopology = { ...topologyRef.current };
    const node = currentTopology[event.service];
    if (node) {
      node.metrics.currentLatency = event.metrics.latencyMs;
      node.metrics.currentErrorRate = event.metrics.errorRatePct;
      node.metrics.currentCpu = event.metrics.cpuPct;
      if (event.isAnomalous) node.metrics.activeAnomaliesCount++;

      // Check for Harmful / Compromised / Crashing Server Conditions
      const isHarmfulServer =
        event.severity === 'CRITICAL' ||
        event.metrics.errorRatePct > 20 ||
        event.metrics.cpuPct > 90 ||
        event.eventType === 'ROGUE_SERVER_INJECTION' ||
        event.eventType === 'AUTH_BRUTE_FORCE' ||
        event.eventType === 'K8S_OOM_CRASH_LOOP';

      if (isHarmfulServer) {
        node.status = 'critical';

        // Play high-urgency emergency siren immediately when harmful servers are detected!
        audioNotifier.playHarmfulServerSiren(node.name || event.service);
        setIsSirenActive(true);

        setHarmfulServerAlert({
          serverId: event.service,
          serverName: node.name || event.service,
          reason:
            event.anomalyReason ||
            event.message ||
            `Harmful server anomaly detected (${event.eventType})`,
          timestamp: Date.now(),
          metrics: {
            errorRatePct: event.metrics.errorRatePct,
            cpuPct: event.metrics.cpuPct,
            latencyMs: event.metrics.latencyMs,
          },
        });
      } else if (event.severity === 'ERROR' || event.metrics.latencyMs > 800) {
        node.status = 'degraded';
      } else if (event.severity === 'WARNING') {
        node.status = 'warning';
      } else {
        node.status = 'healthy';
      }
      topologyRef.current = currentTopology;
      setTopology(currentTopology);
    }

    // 5. Append to events table buffer (keep latest 250 items)
    setEvents((prev) => {
      const updated = [event, ...prev];
      if (updated.length > 250) updated.pop();
      return updated;
    });

    // 6. Update Rolling Telemetry
    setLatencyHistory((prev) => {
      const next = [...prev, event.metrics.latencyMs];
      if (next.length > 30) next.shift();
      return next;
    });

    setErrorRateHistory((prev) => {
      const next = [...prev, event.metrics.errorRatePct];
      if (next.length > 30) next.shift();
      return next;
    });
  }, []);

  // Initialize simulator on mount
  useEffect(() => {
    const sim = new StreamSimulator({
      onEventGenerated: handleEventGenerated,
    });
    simulatorRef.current = sim;
    sim.setEPS(eps);
    sim.start();

    return () => {
      sim.stop();
    };
  }, [handleEventGenerated, eps]);

  // Toggle Stream Simulator
  const handleToggleStreaming = () => {
    if (!simulatorRef.current) return;
    const running = simulatorRef.current.toggle();
    setIsStreaming(running);
  };

  // Change EPS
  const handleEpsChange = (newEps: number) => {
    setEps(newEps);
    if (simulatorRef.current) {
      simulatorRef.current.setEPS(newEps);
    }
  };

  // Select Scenario
  const handleSelectScenario = (scenario: ScenarioType) => {
    setActiveScenario(scenario);
    if (simulatorRef.current) {
      simulatorRef.current.setScenario(scenario);
    }
  };

  // Toggle Audio
  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioNotifier.setEnabled(next);
    if (!next) {
      audioNotifier.stopSiren();
      setIsSirenActive(false);
    }
  };

  // Acknowledge Incident
  const handleAcknowledge = (incidentId: string) => {
    const updated = correlationEngineRef.current.acknowledgeIncident(
      incidentId,
      'Alex Rivers (SRE Lead)'
    );
    if (updated) {
      setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
      if (selectedIncident?.id === incidentId) setSelectedIncident({ ...updated });
    }
  };

  // Silence Harmful Server Siren
  const handleSilenceSiren = () => {
    audioNotifier.stopSiren();
    setIsSirenActive(false);
  };

  // Quarantine & Restore Harmful Server to Healthy
  const handleIsolateServer = (serverId: string) => {
    audioNotifier.stopSiren();
    setIsSirenActive(false);
    setHarmfulServerAlert(null);

    // Reset targeted server topology to healthy
    const currentTopology = { ...topologyRef.current };
    if (currentTopology[serverId]) {
      currentTopology[serverId].status = 'healthy';
      currentTopology[serverId].metrics = {
        currentLatency: 28,
        currentErrorRate: 0.0,
        currentCpu: 32,
        activeAnomaliesCount: 0,
      };
      topologyRef.current = currentTopology;
      setTopology({ ...currentTopology });
    }

    // Resolve any active incident caused by this server
    const affectedIncidents = activeIncidents.filter(
      (inc) => inc.rootCauseService === serverId || inc.cascadingServices.includes(serverId)
    );
    for (const inc of affectedIncidents) {
      correlationEngineRef.current.setIncidentStatus(inc.id, 'RESOLVED', 'Auto-Quarantine');
    }
    setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
    setResolvedIncidents([...correlationEngineRef.current.getResolvedIncidents()]);

    // Revert scenario if running an active chaos scenario
    if (activeScenario !== 'NORMAL') {
      handleSelectScenario('NORMAL');
    }

    audioNotifier.playResolvedChime();
  };

  // Resolve Incident
  const handleResolve = (incidentId: string) => {
    const updated = correlationEngineRef.current.setIncidentStatus(
      incidentId,
      'RESOLVED',
      'Operator'
    );
    if (updated) {
      // Silence siren if the resolved incident was the root cause
      audioNotifier.stopSiren();
      setIsSirenActive(false);
      if (harmfulServerAlert?.serverId === updated.rootCauseService) {
        setHarmfulServerAlert(null);
      }
      audioNotifier.playResolvedChime();
      setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
      setResolvedIncidents([...correlationEngineRef.current.getResolvedIncidents()]);
      if (selectedIncident?.id === incidentId) setSelectedIncident({ ...updated });
    }
  };

  // Change Status from modal
  const handleStatusChange = (status: IncidentStatus) => {
    if (!selectedIncident) return;
    if (status === 'RESOLVED') {
      handleResolve(selectedIncident.id);
    } else {
      const updated = correlationEngineRef.current.setIncidentStatus(
        selectedIncident.id,
        status,
        'Operator'
      );
      if (updated) {
        setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
        setSelectedIncident({ ...updated });
      }
    }
  };

  // Change Severity
  const handleSeverityChange = (severity: IncidentSeverity) => {
    if (!selectedIncident) return;
    selectedIncident.severity = severity;
    selectedIncident.updatedAt = Date.now();
    setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
    setSelectedIncident({ ...selectedIncident });
  };

  // Change Assignee
  const handleAssigneeChange = (assignee: string) => {
    if (!selectedIncident) return;
    selectedIncident.assignee = assignee;
    correlationEngineRef.current.acknowledgeIncident(selectedIncident.id, assignee);
    setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
    setSelectedIncident({ ...selectedIncident });
  };

  // Add Note
  const handleAddNote = (text: string) => {
    if (!selectedIncident) return;
    const updated = correlationEngineRef.current.addOperatorNote(
      selectedIncident.id,
      'Operator (You)',
      text
    );
    if (updated) {
      setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
      setSelectedIncident({ ...updated });
    }
  };

  // Generate AI Investigation via Gemini 3.8 Flash
  const handleGenerateAiAnalysis = async () => {
    if (!selectedIncident) return;

    selectedIncident.isAiAnalyzing = true;
    setSelectedIncident({ ...selectedIncident });

    try {
      const relatedEvents = events.filter((e) => selectedIncident.eventIds.includes(e.id));
      const res = await requestIncidentAnalysis(selectedIncident, relatedEvents, topology);
      if (res.success && res.data) {
        correlationEngineRef.current.attachAiAnalysis(selectedIncident.id, res.data);
        setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
        setSelectedIncident({ ...selectedIncident, aiAnalysis: res.data, isAiAnalyzing: false });
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      // Fallback is also provided by server if GEMINI_API_KEY fails
    } finally {
      if (selectedIncident) {
        selectedIncident.isAiAnalyzing = false;
        setSelectedIncident({ ...selectedIncident });
      }
    }
  };

  // Apply Runbook Mitigation (Simulates command execution and resolves active cascade!)
  const handleApplyMitigation = (command: string, actionName: string) => {
    if (!selectedIncident) return;

    // Log to timeline
    correlationEngineRef.current.addOperatorNote(
      selectedIncident.id,
      'Autonomous Runbook Executor',
      `Executed mitigation: ${actionName} [${command}]`
    );

    // Switch scenario back to normal to simulate issue recovery
    handleSelectScenario('NORMAL');

    // Mark as mitigated
    const updated = correlationEngineRef.current.setIncidentStatus(
      selectedIncident.id,
      'MITIGATED',
      'Runbook Automation'
    );

    if (updated) {
      audioNotifier.playResolvedChime();
      setActiveIncidents([...correlationEngineRef.current.getActiveIncidents()]);
      setSelectedIncident({ ...updated });
    }
  };

  // Inject Manual Chaos Event
  const handleInjectChaos = (customEvent: Partial<NormalizedEvent>) => {
    if (simulatorRef.current) {
      simulatorRef.current.injectCustomEvent(customEvent);
    }
  };

  // Severity counts
  const severityCounts = useMemo(() => {
    const counts: Record<IncidentSeverity, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const inc of activeIncidents) {
      counts[inc.severity] = (counts[inc.severity] || 0) + 1;
    }
    return counts;
  }, [activeIncidents]);

  // Average telemetry metrics
  const avgLatency =
    latencyHistory.length > 0
      ? latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length
      : 35;
  const avgErrorRate =
    errorRateHistory.length > 0
      ? errorRateHistory.reduce((a, b) => a + b, 0) / errorRateHistory.length
      : 0.1;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        isStreaming={isStreaming}
        onToggleStreaming={handleToggleStreaming}
        eps={eps}
        onEpsChange={handleEpsChange}
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        totalEventsCount={events.length}
        activeIncidentsCount={activeIncidents.length}
        severityCounts={severityCounts}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenSoundSettings={() => setIsSoundModalOpen(true)}
        isSirenActive={isSirenActive}
        onSilenceSiren={handleSilenceSiren}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenManualInject={() => setIsManualChaosOpen(true)}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 p-3 sm:p-5 space-y-4 max-w-[1600px] w-full mx-auto">
        {/* Harmful Server Siren Emergency Banner */}
        <HarmfulServerBanner
          alert={harmfulServerAlert}
          isSirenActive={isSirenActive}
          onSilenceSiren={handleSilenceSiren}
          onIsolateServer={handleIsolateServer}
          onDismiss={() => {
            handleSilenceSiren();
            setHarmfulServerAlert(null);
          }}
        />

        {/* Real-time Telemetry Overview Strip */}
        <MetricsOverview
          latencyHistory={latencyHistory}
          errorRateHistory={errorRateHistory}
          eps={eps}
          anomalyThreshold={anomalyDetectorRef.current.getZThreshold()}
          avgLatency={avgLatency}
          avgErrorRate={avgErrorRate}
          anomaliesDetectedCount={anomaliesCount}
        />

        {/* 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Topology Map & Live Stream (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <TopologyMap
              topology={topology}
              activeIncidents={activeIncidents}
              selectedService={selectedServiceFilter}
              onSelectService={(svc) => setSelectedServiceFilter(svc)}
            />

            <div className="h-[430px]">
              <LiveEventStream
                events={events}
                isPaused={isTablePaused}
                onTogglePause={() => setIsTablePaused(!isTablePaused)}
                selectedServiceFilter={selectedServiceFilter}
                onClearServiceFilter={() => setSelectedServiceFilter(null)}
              />
            </div>
          </div>

          {/* Right Column: Correlated Incidents Center (5 cols) */}
          <div className="lg:col-span-5 h-[860px]">
            <IncidentList
              incidents={[...activeIncidents, ...resolvedIncidents]}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          </div>
        </div>

        {/* Historical Incident Trend Analysis (24h) */}
        <section className="w-full">
          <TrendAnalysis
            incidents={[...activeIncidents, ...resolvedIncidents]}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        </section>
      </main>

      {/* Deep Dive Modal */}
      <IncidentDeepDiveModal
        incident={selectedIncident}
        allEvents={events}
        topology={topology}
        onClose={() => setSelectedIncident(null)}
        onStatusChange={handleStatusChange}
        onSeverityChange={handleSeverityChange}
        onAssigneeChange={handleAssigneeChange}
        onAddNote={handleAddNote}
        onGenerateAiAnalysis={handleGenerateAiAnalysis}
        onApplyMitigation={handleApplyMitigation}
      />

      {/* Rules Config Modal */}
      <RulesConfigModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rulesEngineRef.current.getRules()}
        onToggleRule={(ruleId) => {
          rulesEngineRef.current.toggleRule(ruleId);
          setTopology({ ...topologyRef.current });
        }}
        onAddRule={(rule) => {
          rulesEngineRef.current.addRule(rule);
        }}
        onDeleteRule={(ruleId) => {
          rulesEngineRef.current.deleteRule(ruleId);
        }}
        zThreshold={anomalyDetectorRef.current.getZThreshold()}
        onZThresholdChange={(val) => {
          anomalyDetectorRef.current.setZThreshold(val);
        }}
      />

      {/* Manual Chaos Injection Modal */}
      <ManualChaosModal
        isOpen={isManualChaosOpen}
        onClose={() => setIsManualChaosOpen(false)}
        onInject={handleInjectChaos}
      />

      {/* System Alert Sound & Audio Configuration Modal */}
      <AlertSoundModal
        isOpen={isSoundModalOpen}
        onClose={() => setIsSoundModalOpen(false)}
        onSettingsChanged={(s) => setAudioEnabled(s.enabled)}
      />
    </div>
  );
}
