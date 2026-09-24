import { DetectionRule, NormalizedEvent, RuleCondition } from '../types';

export const DEFAULT_DETECTION_RULES: DetectionRule[] = [
  {
    id: 'rule-db-pool-exhausted',
    name: 'PostgreSQL DB Connection Pool Saturation',
    description: 'Triggers when DB active connections reach or exceed 85 concurrent sockets or event is DB_POOL_SATURATION',
    enabled: true,
    severity: 'P1',
    ruleType: 'threshold',
    conditions: [
      {
        serviceMatch: 'inventory-db',
        metric: 'dbConnectionsActive',
        operator: '>=',
        value: 85,
      },
    ],
    targetIncidentTitle: 'Database Connection Pool Exhaustion & Thread Starvation',
    triggerCount: 0,
  },
  {
    id: 'rule-high-latency-p99',
    name: 'Service Critical Latency Spike (> 1200ms)',
    description: 'Detects severe response time degradation exceeding 1.2s SLA threshold',
    enabled: true,
    severity: 'P2',
    ruleType: 'threshold',
    conditions: [
      {
        serviceMatch: '*',
        metric: 'latencyMs',
        operator: '>=',
        value: 1200,
      },
    ],
    targetIncidentTitle: 'Critical SLA Breach: Latency Spike Exceeding 1.2s',
    triggerCount: 0,
  },
  {
    id: 'rule-error-rate-surge',
    name: 'Elevated HTTP 5xx Error Rate Surge (> 15%)',
    description: 'Triggers when service error rate exceeds 15% of request volume',
    enabled: true,
    severity: 'P1',
    ruleType: 'threshold',
    conditions: [
      {
        serviceMatch: '*',
        metric: 'errorRatePct',
        operator: '>=',
        value: 15,
      },
    ],
    targetIncidentTitle: 'High Frequency HTTP 5xx Error Rate Surge',
    triggerCount: 0,
  },
  {
    id: 'rule-cpu-saturation',
    name: 'Host/Pod CPU Saturation (> 90%)',
    description: 'Detects sustained CPU utilization exceeding 90% capacity',
    enabled: true,
    severity: 'P2',
    ruleType: 'threshold',
    conditions: [
      {
        serviceMatch: '*',
        metric: 'cpuPct',
        operator: '>=',
        value: 90,
      },
    ],
    targetIncidentTitle: 'Compute Resource Exhaustion: Pod CPU Saturation',
    triggerCount: 0,
  },
  {
    id: 'rule-k8s-oom-crash',
    name: 'Kubernetes Pod OOMKilled or CrashLoopBackOff',
    description: 'Matches fatal kernel OOM kills and recurring container crashes',
    enabled: true,
    severity: 'P1',
    ruleType: 'pattern',
    conditions: [
      {
        serviceMatch: '*',
        patternRegex: '(OOMKilled|CrashLoopBackOff|Container terminated with exit code 137)',
      },
    ],
    targetIncidentTitle: 'Kubernetes Workload Instability: Pod OOM Crash Loop',
    triggerCount: 0,
  },
  {
    id: 'rule-auth-brute-force',
    name: 'Authentication Credential Stuffing Attack',
    description: 'Detects rapid successive 401 Unauthorized / AUTH_FAILED spikes',
    enabled: true,
    severity: 'P2',
    ruleType: 'pattern',
    conditions: [
      {
        serviceMatch: 'auth-service',
        patternRegex: '(AUTH_BRUTE_FORCE|CREDENTIAL_STUFFING|High volume failed auth)',
      },
    ],
    targetIncidentTitle: 'Credential Stuffing & Distributed Bot Influx Detected',
    triggerCount: 0,
  },
  {
    id: 'rule-composite-degradation',
    name: 'Composite Gateway Degradation (High Latency + Errors)',
    description: 'Triggers when both latency > 800ms and error rate > 8% simultaneously occur on API Gateway',
    enabled: true,
    severity: 'P1',
    ruleType: 'composite',
    conditions: [
      {
        serviceMatch: 'api-gateway',
        metric: 'latencyMs',
        operator: '>=',
        value: 800,
      },
      {
        serviceMatch: 'api-gateway',
        metric: 'errorRatePct',
        operator: '>=',
        value: 8,
      },
    ],
    targetIncidentTitle: 'Ingress API Gateway Cascading Degradation',
    triggerCount: 0,
  },
];

export class RulesEngine {
  private rules: DetectionRule[] = [...DEFAULT_DETECTION_RULES];
  private recentEventsWindow: NormalizedEvent[] = [];
  private windowDurationMs: number = 30000; // 30s sliding window

  constructor(customRules?: DetectionRule[]) {
    if (customRules && customRules.length > 0) {
      this.rules = customRules;
    }
  }

  public getRules(): DetectionRule[] {
    return this.rules;
  }

  public toggleRule(ruleId: string): void {
    const r = this.rules.find((item) => item.id === ruleId);
    if (r) {
      r.enabled = !r.enabled;
    }
  }

  public updateRule(updatedRule: DetectionRule): void {
    const idx = this.rules.findIndex((r) => r.id === updatedRule.id);
    if (idx >= 0) {
      this.rules[idx] = updatedRule;
    } else {
      this.rules.push(updatedRule);
    }
  }

  public addRule(newRule: DetectionRule): void {
    this.rules.push(newRule);
  }

  public deleteRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  /**
   * Evaluates an incoming normalized event against enabled rules
   */
  public evaluate(event: NormalizedEvent): {
    triggered: boolean;
    rule?: DetectionRule;
    reason?: string;
  } {
    // Maintain sliding window for rate/frequency rules
    const now = event.timestamp || Date.now();
    this.recentEventsWindow.push(event);
    this.recentEventsWindow = this.recentEventsWindow.filter(
      (e) => now - e.timestamp <= this.windowDurationMs
    );

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      let ruleMatched = false;

      if (rule.ruleType === 'threshold') {
        ruleMatched = this.evaluateThresholdRule(rule, event);
      } else if (rule.ruleType === 'pattern') {
        ruleMatched = this.evaluatePatternRule(rule, event);
      } else if (rule.ruleType === 'composite') {
        ruleMatched = this.evaluateCompositeRule(rule, event);
      } else if (rule.ruleType === 'rate') {
        ruleMatched = this.evaluateRateRule(rule, event);
      }

      if (ruleMatched) {
        rule.lastTriggeredAt = now;
        rule.triggerCount++;
        return {
          triggered: true,
          rule,
          reason: `Breached rule: "${rule.name}" on ${event.service} (${event.eventType})`,
        };
      }
    }

    return { triggered: false };
  }

  private evaluateThresholdRule(rule: DetectionRule, event: NormalizedEvent): boolean {
    for (const cond of rule.conditions) {
      if (cond.serviceMatch && cond.serviceMatch !== '*' && cond.serviceMatch !== event.service) {
        continue;
      }

      if (cond.metric && cond.value !== undefined && cond.operator) {
        const eventVal = event.metrics[cond.metric];
        if (eventVal !== undefined && this.compare(eventVal, cond.operator, cond.value)) {
          return true;
        }
      }
    }
    return false;
  }

  private evaluatePatternRule(rule: DetectionRule, event: NormalizedEvent): boolean {
    for (const cond of rule.conditions) {
      if (cond.serviceMatch && cond.serviceMatch !== '*' && cond.serviceMatch !== event.service) {
        continue;
      }
      if (cond.patternRegex) {
        try {
          const re = new RegExp(cond.patternRegex, 'i');
          if (re.test(event.message) || re.test(event.eventType)) {
            return true;
          }
        } catch (e) {
          // ignore invalid regex
        }
      }
    }
    return false;
  }

  private evaluateCompositeRule(rule: DetectionRule, event: NormalizedEvent): boolean {
    // All conditions in composite rule must be satisfied
    for (const cond of rule.conditions) {
      if (cond.serviceMatch && cond.serviceMatch !== '*' && cond.serviceMatch !== event.service) {
        return false;
      }
      if (cond.metric && cond.value !== undefined && cond.operator) {
        const eventVal = event.metrics[cond.metric];
        if (eventVal === undefined || !this.compare(eventVal, cond.operator, cond.value)) {
          return false;
        }
      }
    }
    return rule.conditions.length > 0;
  }

  private evaluateRateRule(rule: DetectionRule, event: NormalizedEvent): boolean {
    for (const cond of rule.conditions) {
      const windowSec = cond.windowSeconds || 15;
      const countThreshold = cond.thresholdCount || 10;
      const cutoff = event.timestamp - windowSec * 1000;

      const matchingEvents = this.recentEventsWindow.filter((e) => {
        if (e.timestamp < cutoff) return false;
        if (cond.serviceMatch && cond.serviceMatch !== '*' && e.service !== cond.serviceMatch) return false;
        if (cond.eventTypeMatch && e.eventType !== cond.eventTypeMatch) return false;
        return e.severity === 'CRITICAL' || e.severity === 'ERROR';
      });

      if (matchingEvents.length >= countThreshold) {
        return true;
      }
    }
    return false;
  }

  private compare(a: number, op: string, b: number): boolean {
    switch (op) {
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '==': return a === b;
      case '!=': return a !== b;
      default: return false;
    }
  }
}
