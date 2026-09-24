import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Flame,
  Layers,
  MessageSquare,
  Play,
  Send,
  Server,
  Share2,
  Sparkles,
  Terminal,
  User,
  X,
} from 'lucide-react';
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEntry,
  NormalizedEvent,
  ServiceNode,
} from '../types';

interface IncidentDeepDiveModalProps {
  incident: Incident | null;
  allEvents: NormalizedEvent[];
  topology: Record<string, ServiceNode>;
  onClose: () => void;
  onStatusChange: (status: IncidentStatus) => void;
  onSeverityChange: (severity: IncidentSeverity) => void;
  onAssigneeChange: (assignee: string) => void;
  onAddNote: (noteText: string) => void;
  onGenerateAiAnalysis: () => Promise<void>;
  onApplyMitigation: (command: string, actionName: string) => void;
}

export const IncidentDeepDiveModal: React.FC<IncidentDeepDiveModalProps> = ({
  incident,
  allEvents,
  topology,
  onClose,
  onStatusChange,
  onSeverityChange,
  onAssigneeChange,
  onAddNote,
  onGenerateAiAnalysis,
  onApplyMitigation,
}) => {
  if (!incident) return null;

  const [activeTab, setActiveTab] = useState<'RCA' | 'CASCADE' | 'TIMELINE' | 'EVENTS' | 'CONSOLE'>('RCA');
  const [newNoteText, setNewNoteText] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Correlated events for this incident
  const correlatedEvents = allEvents.filter((e) => incident.eventIds.includes(e.id));
  const selectedEvent = correlatedEvents.find((e) => e.id === selectedEventId);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim());
    setNewNoteText('');
  };

  const handleExportReport = () => {
    const report = `# Post-Mortem Incident Report: ${incident.id} - ${incident.title}
**Severity:** ${incident.severity} | **Priority Score:** ${incident.priorityScore}/100
**Root Cause Service:** ${incident.rootCauseService}
**Cascading Services Impacted:** ${incident.cascadingServices.join(', ') || 'None'}
**Created:** ${new Date(incident.createdAt).toISOString()}
**Resolved:** ${incident.resolvedAt ? new Date(incident.resolvedAt).toISOString() : 'Active'}

## Executive Summary
${incident.aiAnalysis?.executiveSummary || incident.summary}

## Root Cause Hypothesis
${incident.aiAnalysis?.rootCauseHypothesis || 'Analysis in progress.'}

## Cascading Path
${incident.aiAnalysis?.cascadingPathExplanation || `${incident.rootCauseService} -> ${incident.cascadingServices.join(' -> ')}`}

## Contributing Factors
${(incident.aiAnalysis?.contributingFactors || []).map((f) => `- ${f}`).join('\n')}

## Timeline of Events
${incident.timeline
  .map((t) => `- [${new Date(t.timestamp).toLocaleTimeString()}] **${t.title}**: ${t.description}`)
  .join('\n')}

## Recommended Actions Taken
${(incident.aiAnalysis?.recommendedActions || []).map((a) => `${a.step}. [${a.priority}] ${a.action} (${a.command || 'N/A'})`).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-report-${incident.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                {incident.id}
              </span>

              {/* Severity Switcher */}
              <select
                value={incident.severity}
                onChange={(e) => onSeverityChange(e.target.value as IncidentSeverity)}
                className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  incident.severity === 'P1'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : incident.severity === 'P2'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                <option value="P1">P1 Critical</option>
                <option value="P2">P2 High</option>
                <option value="P3">P3 Medium</option>
                <option value="P4">P4 Low</option>
              </select>

              {/* Status Switcher */}
              <div className="flex items-center rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
                {(['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'] as IncidentStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => onStatusChange(st)}
                      className={`px-2 py-0.5 rounded font-medium text-[11px] transition ${
                        incident.status === st
                          ? st === 'RESOLVED'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-indigo-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <h2 className="text-lg font-bold text-zinc-100">{incident.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition"
              title="Download Post-Mortem Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Context Strip */}
        <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-zinc-500">Root Cause Origin:</span>{' '}
              <span className="text-rose-400 font-bold">{incident.rootCauseService}</span>
            </div>
            <div>
              <span className="text-zinc-500">Cascading Blast:</span>{' '}
              <span className="text-amber-400 font-bold">
                {incident.cascadingServices.length} Services ({incident.cascadingServices.join(', ') || 'None'})
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Peak Latency:</span>{' '}
              <span className="text-zinc-200 font-bold">
                {Math.round(incident.metricsSnapshot.peakLatency)}ms
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500">Responder:</span>
            <select
              value={incident.assignee || 'Unassigned'}
              onChange={(e) => onAssigneeChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="Unassigned">Unassigned</option>
              <option value="Alex Rivers (SRE Lead)">Alex Rivers (SRE Lead)</option>
              <option value="Elena Rostova (Database Admin)">Elena Rostova (DBA)</option>
              <option value="Marcus Chen (Security SRE)">Marcus Chen (Security)</option>
              <option value="System Autonomous Auto-Remediator">Autonomous Agent</option>
            </select>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('RCA')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'RCA'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="w-4 h-4 text-violet-400" />
            <span>AI Root Cause & Runbook</span>
            {incident.aiAnalysis && <span className="w-2 h-2 rounded-full bg-violet-400" />}
          </button>

          <button
            onClick={() => setActiveTab('CASCADE')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'CASCADE'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>Cascading Blast Radius</span>
          </button>

          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'TIMELINE'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Incident Timeline ({incident.timeline.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EVENTS')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'EVENTS'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Correlated Events ({correlatedEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CONSOLE')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'CONSOLE'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Mitigation Console & Notes</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: AI RCA & Runbook */}
          {activeTab === 'RCA' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-zinc-950 border border-violet-800/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      Gemini 3.8 Flash Incident Intelligence
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        Autonomous RCA
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Deep cross-event correlation, failure mechanism deduction, and prioritized recovery runbook
                    </p>
                  </div>
                </div>

                <button
                  onClick={onGenerateAiAnalysis}
                  disabled={incident.isAiAnalyzing}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {incident.isAiAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing RCA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{incident.aiAnalysis ? 'Re-Run AI Analysis' : 'Generate AI Investigation'}</span>
                    </>
                  )}
                </button>
              </div>

              {incident.aiAnalysis ? (
                <div className="space-y-4 text-xs">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <h5 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5 text-indigo-400">
                      <AlertCircle className="w-4 h-4" />
                      Executive Summary
                    </h5>
                    <p className="text-zinc-300 leading-relaxed">{incident.aiAnalysis.executiveSummary}</p>
                  </div>

                  {/* Root Cause Hypothesis */}
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40">
                    <h5 className="font-bold text-rose-300 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400" />
                      Technical Root Cause Hypothesis
                    </h5>
                    <p className="text-zinc-200 leading-relaxed font-mono text-[11.5px]">
                      {incident.aiAnalysis.rootCauseHypothesis}
                    </p>
                  </div>

                  {/* Cascading Path Explanation */}
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40">
                    <h5 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                      Cascading Propagation Chain
                    </h5>
                    <p className="text-zinc-300 leading-relaxed">{incident.aiAnalysis.cascadingPathExplanation}</p>
                  </div>

                  {/* Immediate Recommended Remediation Actions */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <h5 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4" />
                      Prioritized Mitigation Runbook & Executable Commands
                    </h5>
                    <div className="space-y-3">
                      {incident.aiAnalysis.recommendedActions.map((action) => (
                        <div
                          key={action.step}
                          className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {action.step}
                              </span>
                              <span className="font-bold text-zinc-100">{action.action}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                action.priority === 'URGENT'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {action.priority}
                            </span>
                          </div>

                          {action.command && (
                            <div className="flex items-center justify-between gap-2 bg-black/60 p-2 rounded border border-zinc-800 font-mono text-[11px] text-emerald-400">
                              <code className="truncate">{action.command}</code>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => copyToClipboard(action.command!, `cmd-${action.step}`)}
                                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                                  title="Copy Command"
                                >
                                  {copiedKey === `cmd-${action.step}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => onApplyMitigation(action.command!, action.action)}
                                  className="px-2 py-0.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white font-sans text-[11px] font-bold flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Simulate Exec
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slack Notification Preview */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-indigo-400" />
                        Stakeholder Broadcast Draft (Slack / PagerDuty)
                      </h5>
                      <button
                        onClick={() => copyToClipboard(incident.aiAnalysis!.slackNotificationDraft, 'slack')}
                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                      >
                        {copiedKey === 'slack' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy Draft
                      </button>
                    </div>
                    <pre className="p-3 bg-zinc-950 rounded border border-zinc-800 text-zinc-300 whitespace-pre-wrap font-sans text-xs">
                      {incident.aiAnalysis.slackNotificationDraft}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 text-zinc-400">
                  <Bot className="w-12 h-12 text-violet-500/50 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-200">No AI Investigation Generated Yet</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Click &quot;Generate AI Investigation&quot; above to leverage Gemini 3.8 Flash for automatic root cause analysis, cascading path reconstruction, and executable runbooks.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Cascading Blast Radius */}
          {activeTab === 'CASCADE' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-rose-400" />
                  Cascading Failure Propagation Sequence
                </h4>

                <div className="flex flex-wrap items-center gap-2 py-4 px-2">
                  {/* Root service */}
                  <div className="p-3 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-center shadow-lg shadow-rose-950/40 min-w-[140px]">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block">
                      ORIGIN CULPRIT
                    </span>
                    <span className="font-mono font-bold text-sm text-white block mt-1">
                      {incident.rootCauseService}
                    </span>
                    <span className="text-[10px] text-rose-300 mt-1 block">
                      T{topology[incident.rootCauseService]?.tier ?? 0} Critical Core
                    </span>
                  </div>

                  {incident.cascadingServices.length === 0 ? (
                    <div className="text-zinc-500 ml-4 font-mono">
                      No downstream services impacted yet. Incident is isolated to {incident.rootCauseService}.
                    </div>
                  ) : (
                    incident.cascadingServices.map((svc, idx) => (
                      <React.Fragment key={svc}>
                        <ArrowRight className="w-5 h-5 text-amber-500 animate-pulse" />
                        <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500 text-center shadow-lg min-w-[140px]">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                            CASCADE STEP {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-sm text-zinc-100 block mt-1">
                            {svc}
                          </span>
                          <span className="text-[10px] text-amber-300 mt-1 block">Degraded Dependent</span>
                        </div>
                      </React.Fragment>
                    ))
                  )}
                </div>
              </div>

              {/* Blast Radius Metrics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 block text-xs">Peak Response Latency</span>
                  <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                    {Math.round(incident.metricsSnapshot.peakLatency)} ms
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">vs 35ms baseline SLA</span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 block text-xs">Peak Error Percentage</span>
                  <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                    {incident.metricsSnapshot.peakErrorRate.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">HTTP 5xx & connection drops</span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 block text-xs">Total Ingested Event Anomalies</span>
                  <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">
                    {incident.eventIds.length} Events
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">Correlated into single incident</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Incident Timeline */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-zinc-800 space-y-6 my-2">
                {incident.timeline.map((entry) => (
                  <div key={entry.id} className="relative group">
                    {/* Dot on timeline */}
                    <div
                      className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-zinc-950 flex items-center justify-center ${
                        entry.type === 'ROOT_CAUSE_TRIGGER'
                          ? 'bg-rose-500'
                          : entry.type === 'CASCADE_PROPAGATION'
                          ? 'bg-amber-500'
                          : entry.type === 'RESOLVED'
                          ? 'bg-emerald-500'
                          : entry.type === 'MITIGATION_APPLIED'
                          ? 'bg-cyan-500'
                          : entry.type === 'AI_RCA_GENERATED'
                          ? 'bg-violet-500'
                          : 'bg-indigo-500'
                      }`}
                    />

                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {entry.type}
                          </span>
                          <h5 className="text-xs font-bold text-zinc-100">{entry.title}</h5>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300">{entry.description}</p>
                      {entry.author && (
                        <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                          Operator: {entry.author}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Correlated Events */}
          {activeTab === 'EVENTS' && (
            <div className="space-y-4 text-xs">
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left font-mono">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Service</th>
                      <th className="p-2.5">Event Type</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Latency</th>
                      <th className="p-2.5">Trace ID</th>
                      <th className="p-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {correlatedEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-2.5 text-zinc-400">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2.5 font-bold text-zinc-200">{evt.service}</td>
                        <td className="p-2.5 text-indigo-300">{evt.eventType}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              evt.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300'
                                : evt.severity === 'ERROR'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {evt.severity}
                          </span>
                        </td>
                        <td className="p-2.5 text-zinc-300">{evt.metrics.latencyMs}ms</td>
                        <td className="p-2.5 text-zinc-400 text-[10px]">{evt.traceId}</td>
                        <td className="p-2.5">
                          <button
                            onClick={() => setSelectedEventId(evt.id)}
                            className="text-indigo-400 hover:underline text-[11px]"
                          >
                            Inspect JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CEF JSON Inspector Modal if selected */}
              {selectedEvent && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-indigo-500/40 relative font-mono text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-200 font-bold">
                      Normalized Common Event Format (CEF) Inspector: {selectedEvent.id}
                    </span>
                    <button
                      onClick={() => setSelectedEventId(null)}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      Close
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-950 rounded border border-zinc-800 overflow-x-auto text-emerald-400 text-[11px]">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Remediation Console & Notes */}
          {activeTab === 'CONSOLE' && (
            <div className="space-y-5 text-xs">
              {/* Operator Notes Feed */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-200 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Operator Investigation Notes & Triage Log
                </h4>

                <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Enter observation, hypothesis, or action taken..."
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Add Note
                  </button>
                </form>

                <div className="space-y-2">
                  {incident.operatorNotes.length === 0 ? (
                    <p className="text-zinc-500 text-xs italic">No operator notes recorded yet.</p>
                  ) : (
                    incident.operatorNotes.map((note) => (
                      <div key={note.id} className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                          <span className="text-indigo-400 font-bold">{note.author}</span>
                          <span className="text-zinc-500">{new Date(note.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-zinc-200">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Remediation Actions Preset */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h4 className="text-xs font-bold text-emerald-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Terminal className="w-4 h-4" />
                  SRE Fast-Mitigation Playbook Actions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() =>
                      onApplyMitigation(
                        'psql -U postgres -c "ALTER SYSTEM SET max_connections = 250; SELECT pg_reload_conf();"',
                        'Expand DB Connection Pool to 250'
                      )
                    }
                    className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">Scale Database Connection Pool</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Expand max_connections from 100 to 250</div>
                  </button>

                  <button
                    onClick={() =>
                      onApplyMitigation(
                        'kubectl scale deployment/checkout-service --replicas=12 -n production',
                        'Autoscale Checkout Deployment to 12 Replicas'
                      )
                    }
                    className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">Scale Workload Pods (HPA Surge)</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Scale replicas from 4 to 12 to drain backlog</div>
                  </button>

                  <button
                    onClick={() =>
                      onApplyMitigation(
                        'curl -X POST http://payment-service.internal:8080/admin/gateway/failover -d \'{"target": "stripe_secondary"}\'',
                        'Failover to Secondary Payment Gateway'
                      )
                    }
                    className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">Trip Payment Gateway Circuit Breaker</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Route traffic immediately to standby provider</div>
                  </button>

                  <button
                    onClick={() =>
                      onApplyMitigation(
                        'cloudflare-cli waf rules update --rule-id "auth_rate_limit" --action "managed_challenge"',
                        'Enable WAF Bot Challenge on Auth Endpoints'
                      )
                    }
                    className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">Activate WAF Bot Protection</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Drop brute-force IP subnets at edge</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-mono">
            Status: <strong className="text-zinc-200">{incident.status}</strong> | Priority:{' '}
            <strong className="text-zinc-200">{incident.priorityScore}/100</strong>
          </span>
          <div className="flex items-center gap-2">
            {incident.status !== 'RESOLVED' ? (
              <button
                onClick={() => onStatusChange('RESOLVED')}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Incident as Resolved
              </button>
            ) : (
              <button
                onClick={() => onStatusChange('INVESTIGATING')}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition"
              >
                Re-Open Incident
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
