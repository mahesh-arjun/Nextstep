export type EventSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';

export type RuleType = 'threshold' | 'rate' | 'pattern' | 'composite';

export interface EventMetrics {
  latencyMs: number;
  errorRatePct: number;
  cpuPct: number;
  memoryPct: number;
  qps?: number;
  dbConnectionsActive?: number;
  dbConnectionsMax?: number;
  packetDropRate?: number;
}

export interface NormalizedEvent {
  id: string;
  timestamp: number;
  source: string; // e.g., 'k8s-cluster', 'api-gateway', 'postgres-db', 'redis', 'cdn'
  service: string; // e.g., 'checkout-service', 'inventory-db', 'auth-service'
  host: string; // e.g., 'pod-checkout-77f98-b8d'
  environment: 'production' | 'staging';
  eventType: string; // e.g., 'DB_POOL_SATURATION', 'HTTP_5XX_SURGE', etc.
  severity: EventSeverity;
  message: string;
  metrics: EventMetrics;
  traceId: string;
  userId?: string;
  clientIp?: string;
  rawPayload: Record<string, any>;
  isAnomalous?: boolean;
  anomalyScore?: number; // e.g., Z-score magnitude
  anomalyReason?: string;
  correlatedIncidentId?: string;
}

export interface ServiceNode {
  id: string;
  name: string;
  tier: 0 | 1 | 2; // 0 = Core/Data (Highest criticality), 1 = Application/Service, 2 = Ingress/Edge
  category: 'database' | 'service' | 'gateway' | 'cache' | 'messaging' | 'edge';
  dependencies: string[]; // downstream IDs this service calls
  dependents: string[]; // upstream IDs that call this service
  status: 'healthy' | 'warning' | 'degraded' | 'critical';
  x: number;
  y: number;
  metrics: {
    currentLatency: number;
    currentErrorRate: number;
    currentCpu: number;
    activeAnomaliesCount: number;
  };
}

export interface RuleCondition {
  metric?: keyof EventMetrics;
  operator?: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value?: number;
  windowSeconds?: number;
  thresholdCount?: number;
  patternRegex?: string;
  serviceMatch?: string; // '*' or specific service
  eventTypeMatch?: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: IncidentSeverity;
  ruleType: RuleType;
  conditions: RuleCondition[];
  targetIncidentTitle: string;
  lastTriggeredAt?: number;
  triggerCount: number;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: number;
  type:
    | 'ROOT_CAUSE_TRIGGER'
    | 'CASCADE_PROPAGATION'
    | 'SEVERITY_ESCALATION'
    | 'OPERATOR_ACK'
    | 'AI_RCA_GENERATED'
    | 'MITIGATION_APPLIED'
    | 'RESOLVED'
    | 'NOTE';
  title: string;
  description: string;
  service?: string;
  severity?: string;
  author?: string;
}

export interface OperatorNote {
  id: string;
  author: string;
  timestamp: number;
  text: string;
}

export interface AIAnalysisAction {
  step: number;
  action: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  command?: string;
}

export interface AIAnalysisResult {
  executiveSummary: string;
  rootCauseHypothesis: string;
  cascadingPathExplanation: string;
  contributingFactors: string[];
  recommendedActions: AIAnalysisAction[];
  preventativeMeasures: string[];
  slackNotificationDraft: string;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  priorityScore: number; // 0 - 100
  status: IncidentStatus;
  rootCauseService: string;
  cascadingServices: string[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  assignee?: string;
  eventIds: string[];
  timeline: IncidentTimelineEntry[];
  tags: string[];
  aiAnalysis?: AIAnalysisResult;
  isAiAnalyzing?: boolean;
  operatorNotes: OperatorNote[];
  metricsSnapshot: {
    peakLatency: number;
    peakErrorRate: number;
    affectedEventsCount: number;
  };
}

export type ScenarioType =
  | 'NORMAL'
  | 'DB_CONNECTION_CASCADE'
  | 'PAYMENT_GATEWAY_OUTAGE'
  | 'AUTH_BRUTE_FORCE'
  | 'K8S_OOM_CRASH_LOOP'
  | 'CDN_CACHE_PURGE';
