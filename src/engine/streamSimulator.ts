import { EventSeverity, NormalizedEvent, ScenarioType } from '../types';

export interface StreamSimulatorCallbacks {
  onEventGenerated: (event: NormalizedEvent) => void;
}

export class StreamSimulator {
  private isRunning: boolean = false;
  private timerId: any = null;
  private eps: number = 5; // Events per second
  private activeScenario: ScenarioType = 'NORMAL';
  private scenarioStep: number = 0;
  private eventSequence: number = 0;
  private callbacks: StreamSimulatorCallbacks;

  private services = [
    'cloud-cdn',
    'api-gateway',
    'auth-service',
    'redis-cache',
    'checkout-service',
    'payment-service',
    'inventory-db',
    'kafka-broker',
    'k8s-node-pool',
  ];

  constructor(callbacks: StreamSimulatorCallbacks) {
    this.callbacks = callbacks;
  }

  public setEPS(rate: number): void {
    this.eps = Math.max(1, Math.min(50, rate));
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  public getEPS(): number {
    return this.eps;
  }

  public getScenario(): ScenarioType {
    return this.activeScenario;
  }

  public setScenario(scenario: ScenarioType): void {
    this.activeScenario = scenario;
    this.scenarioStep = 0;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const intervalMs = Math.max(20, Math.floor(1000 / this.eps));

    this.timerId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  public getStatus(): boolean {
    return this.isRunning;
  }

  public injectCustomEvent(event: Partial<NormalizedEvent>): void {
    this.eventSequence++;
    const now = Date.now();
    const normalized: NormalizedEvent = {
      id: event.id || `evt_custom_${now}_${this.eventSequence}`,
      timestamp: event.timestamp || now,
      source: event.source || 'manual-injector',
      service: event.service || 'checkout-service',
      host: event.host || 'admin-console',
      environment: event.environment || 'production',
      eventType: event.eventType || 'MANUAL_CHAOS_INJECTION',
      severity: event.severity || 'WARNING',
      message: event.message || 'Operator manually triggered simulated anomaly event',
      metrics: {
        latencyMs: event.metrics?.latencyMs ?? 150,
        errorRatePct: event.metrics?.errorRatePct ?? 5.0,
        cpuPct: event.metrics?.cpuPct ?? 65,
        memoryPct: event.metrics?.memoryPct ?? 70,
        ...event.metrics,
      },
      traceId: event.traceId || `trc_${Math.random().toString(36).substring(2, 10)}`,
      rawPayload: event.rawPayload || { injectedBy: 'Operator', reason: 'Live Chaos Drill' },
    };

    this.callbacks.onEventGenerated(normalized);
  }

  private tick(): void {
    this.eventSequence++;
    this.scenarioStep++;
    const now = Date.now();

    let event: NormalizedEvent;

    switch (this.activeScenario) {
      case 'DB_CONNECTION_CASCADE':
        event = this.generateDbCascadeEvent(now);
        break;
      case 'PAYMENT_GATEWAY_OUTAGE':
        event = this.generatePaymentOutageEvent(now);
        break;
      case 'AUTH_BRUTE_FORCE':
        event = this.generateAuthBruteForceEvent(now);
        break;
      case 'K8S_OOM_CRASH_LOOP':
        event = this.generateOomCrashLoopEvent(now);
        break;
      case 'CDN_CACHE_PURGE':
        event = this.generateCdnPurgeEvent(now);
        break;
      case 'NORMAL':
      default:
        event = this.generateNormalEvent(now);
        break;
    }

    this.callbacks.onEventGenerated(event);
  }

  private generateNormalEvent(now: number): NormalizedEvent {
    const service = this.services[Math.floor(Math.random() * this.services.length)];
    const isSlightWarning = Math.random() < 0.03; // 3% transient harmless warning

    const baseLatencies: Record<string, number> = {
      'cloud-cdn': 12,
      'api-gateway': 32,
      'auth-service': 38,
      'redis-cache': 3,
      'checkout-service': 55,
      'payment-service': 85,
      'inventory-db': 10,
      'kafka-broker': 8,
      'k8s-node-pool': 14,
    };

    const latency = (baseLatencies[service] || 30) + Math.floor(Math.random() * 25);
    const cpu = 25 + Math.floor(Math.random() * 25);

    return {
      id: `evt_${now}_${this.eventSequence}`,
      timestamp: now,
      source: `sim-${service}`,
      service,
      host: `pod-${service}-${Math.random().toString(36).substring(2, 6)}`,
      environment: 'production',
      eventType: isSlightWarning ? 'TRANSIENT_GC_PAUSE' : 'HEALTHCHECK_OK',
      severity: isSlightWarning ? 'WARNING' : 'INFO',
      message: isSlightWarning
        ? `Minor garbage collection pause (${latency}ms) on ${service}`
        : `Normal heartbeat telemetry from ${service}: healthy, p95=${latency}ms`,
      metrics: {
        latencyMs: latency,
        errorRatePct: isSlightWarning ? 0.4 : 0.0,
        cpuPct: cpu,
        memoryPct: 40 + Math.floor(Math.random() * 20),
        qps: 150 + Math.floor(Math.random() * 100),
        dbConnectionsActive: service === 'inventory-db' ? 22 + Math.floor(Math.random() * 10) : undefined,
        dbConnectionsMax: service === 'inventory-db' ? 100 : undefined,
      },
      traceId: `trc_${Math.random().toString(36).substring(2, 9)}`,
      rawPayload: { healthy: true, uptimeSeconds: 184920 },
    };
  }

  private generateDbCascadeEvent(now: number): NormalizedEvent {
    const stepMod = this.scenarioStep % 60;
    const traceId = `trc_cascade_${Math.floor(this.scenarioStep / 6)}`;

    // Phase 1 (0-15): Root DB connection pool fills up
    if (stepMod < 18) {
      const activeConnections = Math.min(100, 75 + Math.floor(stepMod * 1.6));
      const latency = 450 + stepMod * 120;
      const isCritical = activeConnections >= 90;

      return {
        id: `evt_${now}_${this.eventSequence}`,
        timestamp: now,
        source: 'sim-inventory-db',
        service: 'inventory-db',
        host: 'pg-primary-cluster-01',
        environment: 'production',
        eventType: isCritical ? 'DB_POOL_SATURATION' : 'DB_CONNECTION_SPIKE',
        severity: isCritical ? 'CRITICAL' : 'ERROR',
        message: `PostgreSQL connection pool near capacity (${activeConnections}/100 active clients). Query queue depth rising!`,
        metrics: {
          latencyMs: latency,
          errorRatePct: isCritical ? 18.5 : 4.0,
          cpuPct: 88,
          memoryPct: 78,
          dbConnectionsActive: activeConnections,
          dbConnectionsMax: 100,
        },
        traceId,
        rawPayload: { waitingClients: stepMod * 4, idleInTx: 32 },
      };
    }

    // Phase 2 (18-38): Cascading to payment-service & checkout-service
    if (stepMod < 40) {
      const isPayment = Math.random() < 0.5;
      const targetService = isPayment ? 'payment-service' : 'checkout-service';
      return {
        id: `evt_${now}_${this.eventSequence}`,
        timestamp: now,
        source: `sim-${targetService}`,
        service: targetService,
        host: `pod-${targetService}-node-8x`,
        environment: 'production',
        eventType: 'DB_CONNECTION_TIMEOUT',
        severity: 'CRITICAL',
        message: `ConnectionAcquisitionTimeoutException: Could not obtain JDBC connection from HikariPool after 5000ms. Target DB: inventory-db`,
        metrics: {
          latencyMs: 3400 + Math.floor(Math.random() * 1200),
          errorRatePct: 42.0,
          cpuPct: 92,
          memoryPct: 85,
        },
        traceId,
        rawPayload: { poolActive: 30, poolIdle: 0, pendingThreads: 48 },
      };
    }

    // Phase 3 (40-60): Upstream Gateway 504 Timeouts
    return {
      id: `evt_${now}_${this.eventSequence}`,
      timestamp: now,
      source: 'sim-api-gateway',
      service: 'api-gateway',
      host: 'envoy-ingress-edge-02',
      environment: 'production',
      eventType: 'HTTP_504_GATEWAY_TIMEOUT',
      severity: 'CRITICAL',
      message: `Upstream response timeout (504): upstream service checkout-service failed to respond within 3000ms`,
      metrics: {
        latencyMs: 3050,
        errorRatePct: 35.0,
        cpuPct: 82,
        memoryPct: 65,
      },
      traceId,
      rawPayload: { path: '/api/v1/checkout/complete', upstreamStatus: 504 },
    };
  }

  private generatePaymentOutageEvent(now: number): NormalizedEvent {
    const stepMod = this.scenarioStep % 45;
    const isPaymentSvc = stepMod % 2 === 0;
    const targetService = isPaymentSvc ? 'payment-service' : 'checkout-service';

    return {
      id: `evt_${now}_${this.eventSequence}`,
      timestamp: now,
      source: `sim-${targetService}`,
      service: targetService,
      host: `pod-${targetService}-${Math.random().toString(36).substring(2, 5)}`,
      environment: 'production',
      eventType: isPaymentSvc ? 'PAYMENT_GATEWAY_TIMEOUT' : 'CHECKOUT_TRANSACTION_FAILED',
      severity: 'CRITICAL',
      message: isPaymentSvc
        ? `External 3rd-party banking provider API timeout after 4800ms. Circuit breaker tripped open!`
        : `Order payment confirmation failed due to downstream payment-service error`,
      metrics: {
        latencyMs: 4800 + Math.floor(Math.random() * 800),
        errorRatePct: 58.0,
        cpuPct: 89,
        memoryPct: 79,
      },
      traceId: `trc_pay_${Math.floor(this.scenarioStep / 4)}`,
      rawPayload: { gateway: 'stripe-connect', errorCode: 'ETIMEDOUT', retryAttempts: 3 },
    };
  }

  private generateAuthBruteForceEvent(now: number): NormalizedEvent {
    const isAuth = Math.random() < 0.7;
    const targetService = isAuth ? 'auth-service' : 'redis-cache';

    return {
      id: `evt_${now}_${this.eventSequence}`,
      timestamp: now,
      source: `sim-${targetService}`,
      service: targetService,
      host: `pod-${targetService}-w2`,
      environment: 'production',
      eventType: isAuth ? 'AUTH_BRUTE_FORCE' : 'REDIS_RATE_LIMIT_EXHAUSTED',
      severity: isAuth ? 'CRITICAL' : 'WARNING',
      message: isAuth
        ? `Credential stuffing detected: 120 consecutive 401 Unauthorized attempts from subnet 185.220.101.0/24`
        : `Redis rate-limiter token bucket starved: CPU 96%, keyspace ops/sec exceeded 45,000`,
      metrics: {
        latencyMs: 650 + Math.floor(Math.random() * 300),
        errorRatePct: 28.5,
        cpuPct: 96,
        memoryPct: 75,
      },
      traceId: `trc_bot_${Math.random().toString(36).substring(2, 7)}`,
      clientIp: `185.220.101.${Math.floor(Math.random() * 255)}`,
      rawPayload: { targetEndpoint: '/api/v1/auth/login', attackType: 'credential-stuffing' },
    };
  }

  private generateOomCrashLoopEvent(now: number): NormalizedEvent {
    const stepMod = this.scenarioStep % 40;
    const memPct = Math.min(99, 82 + stepMod);
    const isOom = memPct >= 96;

    return {
      id: `evt_${now}_${this.eventSequence}`,
      timestamp: now,
      source: 'sim-k8s-node-pool',
      service: 'checkout-service',
      host: 'worker-node-us-east-k8s-04',
      environment: 'production',
      eventType: isOom ? 'POD_CRASH_LOOP' : 'MEMORY_PRESSURE_CRITICAL',
      severity: 'CRITICAL',
      message: isOom
        ? `Container 'checkout-app' OOMKilled (Exit Code 137). Kubelet restart backoff: CrashLoopBackOff`
        : `Memory allocation approaching cgroup limit (${memPct}% used / 4Gi max)`,
      metrics: {
        latencyMs: 1400,
        errorRatePct: 32.0,
        cpuPct: 76,
        memoryPct: memPct,
      },
      traceId: `trc_oom_${Math.floor(this.scenarioStep / 5)}`,
      rawPayload: { cgroup: 'kubepods.slice', exitCode: isOom ? 137 : 0, restarts: 5 },
    };
  }

  private generateCdnPurgeEvent(now: number): NormalizedEvent {
    return {
      id: `evt_${now}_${this.eventSequence}`,
      timestamp: now,
      source: 'sim-cloud-cdn',
      service: 'cloud-cdn',
      host: 'edge-pop-ashburn-01',
      environment: 'production',
      eventType: 'CDN_CACHE_COLLAPSE',
      severity: 'CRITICAL',
      message: `Edge cache purge burst: Cache hit ratio plunged from 94% to 7.2%. Origin shield traffic overwhelmed!`,
      metrics: {
        latencyMs: 1850,
        errorRatePct: 22.0,
        cpuPct: 98,
        memoryPct: 88,
        qps: 12500,
      },
      traceId: `trc_cdn_${this.eventSequence}`,
      rawPayload: { cacheHitPct: 7.2, originRps: 11400 },
    };
  }
}
