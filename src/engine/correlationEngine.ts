import {
  Incident,
  IncidentSeverity,
  IncidentTimelineEntry,
  NormalizedEvent,
  ServiceNode,
} from '../types';
import {
  areServicesTopologicallyRelated,
  getAffectedUpstreamServices,
  getDownstreamDependencies,
} from './topology';

export class CorrelationEngine {
  private activeIncidents: Map<string, Incident> = new Map();
  private resolvedIncidents: Incident[] = [];
  private topology: Record<string, ServiceNode>;
  private correlationWindowMs: number = 75000; // 75-second temporal correlation window
  private incidentCounter: number = 1000;

  constructor(topology: Record<string, ServiceNode>) {
    this.topology = topology;
  }

  public updateTopology(newTopology: Record<string, ServiceNode>): void {
    this.topology = newTopology;
  }

  public getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values()).sort(
      (a, b) => b.priorityScore - a.priorityScore || b.updatedAt - a.updatedAt
    );
  }

  public getResolvedIncidents(): Incident[] {
    return this.resolvedIncidents;
  }

  public getAllIncidents(): Incident[] {
    return [...this.getActiveIncidents(), ...this.resolvedIncidents];
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.activeIncidents.get(id) || this.resolvedIncidents.find((inc) => inc.id === id);
  }

  /**
   * Main correlation method: processes an anomalous/trigger event,
   * finds or creates an incident, updates cascade topology and timeline.
   */
  public correlate(
    event: NormalizedEvent,
    triggerContext?: {
      ruleTitle?: string;
      severity?: IncidentSeverity;
      reason?: string;
    }
  ): { incident: Incident; isNewIncident: boolean; isCascade: boolean } {
    const now = event.timestamp || Date.now();
    let matchedIncident: Incident | null = null;
    let isCascade = false;

    // 1. Check active incidents for exact traceId match
    for (const inc of this.activeIncidents.values()) {
      if (inc.status === 'RESOLVED') continue;

      // Temporal proximity check: if incident hasn't had activity in 2 minutes, don't correlate
      if (now - inc.updatedAt > this.correlationWindowMs * 2) continue;

      // Trace ID match across services
      if (event.traceId && inc.eventIds.some((id) => id.includes(event.traceId))) {
        matchedIncident = inc;
        break;
      }

      // Same service match within correlation window
      if (inc.rootCauseService === event.service || inc.cascadingServices.includes(event.service)) {
        matchedIncident = inc;
        break;
      }

      // Topological dependency match: is event.service in the cascading chain?
      if (areServicesTopologicallyRelated(inc.rootCauseService, event.service, this.topology)) {
        matchedIncident = inc;
        isCascade = true;
        break;
      }
    }

    if (matchedIncident) {
      // Correlate into existing incident
      event.correlatedIncidentId = matchedIncident.id;
      matchedIncident.eventIds.push(event.id);
      matchedIncident.updatedAt = now;

      // Update metrics snapshot
      matchedIncident.metricsSnapshot.peakLatency = Math.max(
        matchedIncident.metricsSnapshot.peakLatency,
        event.metrics.latencyMs || 0
      );
      matchedIncident.metricsSnapshot.peakErrorRate = Math.max(
        matchedIncident.metricsSnapshot.peakErrorRate,
        event.metrics.errorRatePct || 0
      );
      matchedIncident.metricsSnapshot.affectedEventsCount = matchedIncident.eventIds.length;

      // Check if event reveals an even deeper root cause (e.g. downstream dependency of current root)
      const downstreamDeps = getDownstreamDependencies(matchedIncident.rootCauseService, this.topology);
      if (downstreamDeps.includes(event.service) && matchedIncident.rootCauseService !== event.service) {
        // The newly degraded service is actually downstream of what we thought was root!
        // That means the new service is the deeper root culprit!
        const oldRoot = matchedIncident.rootCauseService;
        matchedIncident.rootCauseService = event.service;
        if (!matchedIncident.cascadingServices.includes(oldRoot)) {
          matchedIncident.cascadingServices.push(oldRoot);
        }

        matchedIncident.timeline.push({
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'ROOT_CAUSE_TRIGGER',
          title: `Root Cause Re-anchored to Deep Dependency: ${event.service}`,
          description: `Downstream dependency analysis revealed ${event.service} as the underlying origin of upstream failures in ${oldRoot}.`,
          service: event.service,
          severity: matchedIncident.severity,
        });
      } else if (
        event.service !== matchedIncident.rootCauseService &&
        !matchedIncident.cascadingServices.includes(event.service)
      ) {
        // Cascading propagation to a new service!
        matchedIncident.cascadingServices.push(event.service);
        isCascade = true;

        matchedIncident.timeline.push({
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'CASCADE_PROPAGATION',
          title: `Cascading Degradation Reached ${event.service}`,
          description: `Backpressure and timeouts propagated from ${matchedIncident.rootCauseService} to dependent service ${event.service}.`,
          service: event.service,
          severity: event.severity === 'CRITICAL' ? 'P1' : 'P2',
        });
      }

      // Check if severity should escalate
      if (triggerContext?.severity === 'P1' && matchedIncident.severity !== 'P1') {
        matchedIncident.severity = 'P1';
        matchedIncident.timeline.push({
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'SEVERITY_ESCALATION',
          title: `Incident Severity Escalated to P1`,
          description: `SLA breach or critical error threshold reached on ${event.service}.`,
          severity: 'P1',
        });
      }

      // Recalculate dynamic priority score
      matchedIncident.priorityScore = this.calculatePriorityScore(matchedIncident);

      return { incident: matchedIncident, isNewIncident: false, isCascade };
    }

    // 2. Create brand-new Incident
    this.incidentCounter++;
    const incidentId = `INC-${this.incidentCounter}`;
    event.correlatedIncidentId = incidentId;

    const severity: IncidentSeverity = triggerContext?.severity || (event.severity === 'CRITICAL' ? 'P1' : 'P2');
    const title = triggerContext?.ruleTitle || `Anomalous Failure Detected on ${event.service}`;

    const newIncident: Incident = {
      id: incidentId,
      title,
      summary: triggerContext?.reason || event.message,
      severity,
      priorityScore: 0, // Calculated below
      status: 'TRIGGERED',
      rootCauseService: event.service,
      cascadingServices: [],
      createdAt: now,
      updatedAt: now,
      eventIds: [event.id],
      timeline: [
        {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'ROOT_CAUSE_TRIGGER',
          title: `Incident Triggered on ${event.service}`,
          description: triggerContext?.reason || event.message,
          service: event.service,
          severity,
        },
      ],
      tags: [event.service, event.eventType, event.environment],
      operatorNotes: [],
      metricsSnapshot: {
        peakLatency: event.metrics.latencyMs || 0,
        peakErrorRate: event.metrics.errorRatePct || 0,
        affectedEventsCount: 1,
      },
    };

    newIncident.priorityScore = this.calculatePriorityScore(newIncident);
    this.activeIncidents.set(incidentId, newIncident);

    return { incident: newIncident, isNewIncident: true, isCascade: false };
  }

  /**
   * Automatic Incident Prioritization Score (0 - 100)
   * Factors: Base Severity + Service Tier + Cascade Depth + Metric Peaks
   */
  private calculatePriorityScore(incident: Incident): number {
    let score = 0;

    // Severity base
    switch (incident.severity) {
      case 'P1': score += 50; break;
      case 'P2': score += 35; break;
      case 'P3': score += 20; break;
      case 'P4': score += 10; break;
    }

    // Service Tier weight
    const rootNode = this.topology[incident.rootCauseService];
    if (rootNode) {
      if (rootNode.tier === 0) score += 25; // Critical database/cache
      else if (rootNode.tier === 1) score += 15; // Core microservice
      else score += 8; // Ingress/Edge
    }

    // Cascading blast radius (each affected dependent adds 6 pts)
    score += Math.min(20, incident.cascadingServices.length * 6);

    // Peak metric impact
    if (incident.metricsSnapshot.peakErrorRate > 30) score += 10;
    if (incident.metricsSnapshot.peakLatency > 2000) score += 8;

    return Math.min(100, score);
  }

  public acknowledgeIncident(incidentId: string, responderName: string = 'SRE On-Call'): Incident | null {
    const inc = this.activeIncidents.get(incidentId);
    if (!inc) return null;

    inc.status = 'ACKNOWLEDGED';
    inc.assignee = responderName;
    inc.updatedAt = Date.now();
    inc.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: Date.now(),
      type: 'OPERATOR_ACK',
      title: `Acknowledged by ${responderName}`,
      description: `Responder assigned. Active triage initiated.`,
      author: responderName,
    });
    return inc;
  }

  public setIncidentStatus(incidentId: string, status: Incident['status'], author: string = 'Operator'): Incident | null {
    const inc = this.activeIncidents.get(incidentId);
    if (!inc) return null;

    inc.status = status;
    inc.updatedAt = Date.now();

    if (status === 'RESOLVED') {
      inc.resolvedAt = Date.now();
      inc.timeline.push({
        id: `tl_${Date.now()}`,
        timestamp: Date.now(),
        type: 'RESOLVED',
        title: 'Incident Resolved',
        description: `Service telemetry stabilized. All alarms disarmed.`,
        author,
      });
      // Move to resolved history
      this.activeIncidents.delete(incidentId);
      this.resolvedIncidents.unshift(inc);
    } else if (status === 'MITIGATED') {
      inc.timeline.push({
        id: `tl_${Date.now()}`,
        timestamp: Date.now(),
        type: 'MITIGATION_APPLIED',
        title: 'Mitigation Applied',
        description: `Workaround or remediation executed. Monitoring recovery.`,
        author,
      });
    }

    return inc;
  }

  public addOperatorNote(incidentId: string, author: string, text: string): Incident | null {
    const inc = this.getIncidentById(incidentId);
    if (!inc) return null;

    const note = {
      id: `note_${Date.now()}`,
      author,
      timestamp: Date.now(),
      text,
    };
    inc.operatorNotes.push(note);
    inc.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: Date.now(),
      type: 'NOTE',
      title: `Note by ${author}`,
      description: text,
      author,
    });
    inc.updatedAt = Date.now();
    return inc;
  }

  public attachAiAnalysis(incidentId: string, analysis: any): Incident | null {
    const inc = this.getIncidentById(incidentId);
    if (!inc) return null;

    inc.aiAnalysis = analysis;
    inc.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: Date.now(),
      type: 'AI_RCA_GENERATED',
      title: 'AI Root Cause Analysis & Runbook Generated',
      description: `Gemini 3.8 Flash completed RCA and synthesized mitigation commands.`,
    });
    inc.updatedAt = Date.now();
    return inc;
  }

  public clearAll(): void {
    this.activeIncidents.clear();
    this.resolvedIncidents = [];
    this.incidentCounter = 1000;
  }
}
