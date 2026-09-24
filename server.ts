import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Route: Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: Boolean(apiKey),
    timestamp: Date.now(),
  });
});

// API Route: Gemini Root Cause Analysis & Runbook Generator
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { incident, relatedEvents, topologyContext } = req.body;

    if (!incident) {
      return res.status(400).json({ error: 'Incident data required' });
    }

    // If Gemini client is configured, call Gemini 3.8 Flash
    if (ai) {
      const prompt = `You are a Principal Site Reliability Engineer (SRE) and Incident Commander for an enterprise cloud platform.
Analyze the following active incident, event stream anomalies, and cascading service topology to provide a comprehensive Root Cause Analysis (RCA), immediate mitigation runbook, and stakeholder communication.

INCIDENT DETAILS:
- ID: ${incident.id}
- Title: ${incident.title}
- Severity: ${incident.severity}
- Priority Score: ${incident.priorityScore}/100
- Initial Root Service: ${incident.rootCauseService}
- Cascading Services Impacted: ${(incident.cascadingServices || []).join(', ') || 'None'}
- Peak Latency: ${incident.metricsSnapshot?.peakLatency || 'N/A'} ms
- Peak Error Rate: ${incident.metricsSnapshot?.peakErrorRate || 'N/A'}%

TOPOLOGY CONTEXT:
${JSON.stringify(topologyContext || {}, null, 2)}

SAMPLE ANOMALOUS & CORRELATED EVENTS (Most Recent ${Math.min((relatedEvents || []).length, 8)}):
${JSON.stringify((relatedEvents || []).slice(0, 8), null, 2)}

Provide your analysis in strictly valid JSON matching this schema:
{
  "executiveSummary": "Concise 2-sentence executive summary explaining what happened and current impact",
  "rootCauseHypothesis": "In-depth technical explanation of the fundamental root trigger and failure mechanism",
  "cascadingPathExplanation": "Detailed step-by-step breakdown of how the failure cascaded through dependent microservices",
  "contributingFactors": ["Array of secondary factors like connection limits, timeout settings, or burst traffic"],
  "recommendedActions": [
    {
      "step": 1,
      "action": "Description of immediate triage step",
      "priority": "URGENT" | "HIGH" | "MEDIUM",
      "command": "Executable CLI command (kubectl, psql, redis-cli, aws cli) to remediate"
    }
  ],
  "preventativeMeasures": ["Array of long-term architectural or configuration improvements"],
  "slackNotificationDraft": "Ready-to-send Slack/PagerDuty broadcast message formatted with emojis and clear status"
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            systemInstruction: 'You are an elite Site Reliability Engineering AI assistant specializing in distributed systems, real-time observability, and incident command.',
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return res.json({ success: true, data: parsed, source: 'gemini' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to heuristic engine:', geminiError?.message);
      }
    }

    // Fallback Heuristic Analysis Engine (Deterministic SRE expert output)
    const fallback = generateHeuristicAnalysis(incident, relatedEvents);
    res.json({ success: true, data: fallback, source: 'heuristic-engine' });
  } catch (error: any) {
    console.error('Error analyzing incident:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Deterministic Heuristic SRE analysis generator based on pattern
function generateHeuristicAnalysis(incident: any, events: any[] = []) {
  const rootSvc = incident.rootCauseService || 'database-cluster';
  const severity = incident.severity || 'P1';
  const cascading = incident.cascadingServices || [];
  const title = incident.title || '';

  if (rootSvc.includes('db') || rootSvc.includes('postgres') || title.toLowerCase().includes('database') || title.toLowerCase().includes('pool')) {
    return {
      executiveSummary: `Primary database connection pool exhaustion in ${rootSvc} has triggered cascading query queuing and HTTP 504 gateway timeouts across dependent services. Customer checkout transactions are currently degraded.`,
      rootCauseHypothesis: `A sudden influx of unindexed multi-table JOIN transactions saturated active connections (100/100) on ${rootSvc}. Upstream connection pools in checkout-service and payment-service entered starvation mode, exceeding the 5000ms acquisition timeout and backing up thread pools.`,
      cascadingPathExplanation: `${rootSvc} pool saturation -> payment-service & checkout-service connection wait timeout -> api-gateway thread pool backlog -> edge CDN returns 504 Gateway Timeout to end users.`,
      contributingFactors: [
        'Max connection limit set too low (100) for current traffic peak',
        'Absence of connection pool lease timeout circuit-breakers',
        'Slow query table lock on order_records table'
      ],
      recommendedActions: [
        {
          step: 1,
          action: 'Temporarily scale connection pool limits via PgBouncer / RDS Proxy',
          priority: 'URGENT',
          command: 'psql -U postgres -c "ALTER SYSTEM SET max_connections = 300; SELECT pg_reload_conf();"'
        },
        {
          step: 2,
          action: 'Terminate hanging idle-in-transaction client backends older than 120s',
          priority: 'HIGH',
          command: 'psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle in transaction\' AND now() - state_change > interval \'120 seconds\';"'
        },
        {
          step: 3,
          action: 'Restart checkout-service connection pool to flush stale sockets',
          priority: 'MEDIUM',
          command: 'kubectl rollout restart deployment/checkout-service -n production'
        }
      ],
      preventativeMeasures: [
        'Deploy PgBouncer transaction pooling in front of PostgreSQL cluster',
        'Implement Resilience4j circuit breakers on database DAO layers with 1500ms fallback',
        'Configure Prometheus alert for pg_stat_activity connection usage > 80%'
      ],
      slackNotificationDraft: `🚨 *[${severity} INCIDENT] ${incident.title}*\n*Status:* Investigating | *Lead:* SRE On-Call\n*Impact:* DB Connection Pool exhausted on \`${rootSvc}\`. Cascading to: \`${cascading.join(', ') || 'payment-service'}\`.\n*Mitigation:* PgBouncer connection expansion underway. Next update in 10 mins.`
    };
  }

  if (rootSvc.includes('payment') || title.toLowerCase().includes('payment')) {
    return {
      executiveSummary: `External payment gateway provider latency degradation (>4500ms) has caused worker thread pool exhaustion in payment-service, blocking upstream checkout workflows.`,
      rootCauseHypothesis: `The upstream payment processor API is experiencing elevated p99 response times. Synchronous HTTP client calls without aggressive read timeouts caused incoming checkout worker threads to block indefinitely, depleting the web container thread pool.`,
      cascadingPathExplanation: `payment-gateway p99 latency spike (4800ms) -> payment-service thread starvation -> checkout-service HTTP 500 failure surge -> frontend checkout modal freeze.`,
      contributingFactors: [
        'Aggressive retry loops without exponential jitter multiplying traffic 4x',
        'Missing fallback payment gateway failover automation',
        'HTTP client read timeout was set to 15s instead of 3s'
      ],
      recommendedActions: [
        {
          step: 1,
          action: 'Enable circuit breaker bypass to route payments to secondary gateway',
          priority: 'URGENT',
          command: 'curl -X POST http://payment-service.internal:8080/admin/gateway/failover -d \'{"target": "stripe_secondary"}\''
        },
        {
          step: 2,
          action: 'Cap retry attempts in checkout-service to 1 attempt max',
          priority: 'HIGH',
          command: 'kubectl set env deployment/checkout-service PAYMENT_MAX_RETRIES=1 -n production'
        }
      ],
      preventativeMeasures: [
        'Configure automated dual-rail payment gateway routing with automatic health probes',
        'Introduce asynchronous tokenized payment intent queue via Kafka'
      ],
      slackNotificationDraft: `🚨 *[${severity} INCIDENT] Payment Processing Degraded*\n*Impact:* Elevated checkout failure rates due to upstream processor latency.\n*Action:* Secondary gateway failover initiated. Monitoring error rate reduction.`
    };
  }

  if (rootSvc.includes('auth') || title.toLowerCase().includes('brute') || title.toLowerCase().includes('ddos')) {
    return {
      executiveSummary: `Distributed credential stuffing / bot attack against auth-service is causing high CPU saturation on Redis token store and elevated latency for legitimate user logins.`,
      rootCauseHypothesis: `Over 4,500 requests/sec with rotating bot IPs targeted /api/v1/auth/login. The high frequency of Bcrypt hashing operations saturated host CPU (98%), leading to severe authentication queue backlog.`,
      cascadingPathExplanation: `Auth brute-force wave -> auth-service CPU saturation -> redis-cache token verification delays -> api-gateway 401/429 surge.`,
      contributingFactors: [
        'WAF rate-limiting rule on /api/v1/auth/login was in monitor-only mode',
        'Bcrypt cost factor of 14 consumes ~350ms CPU time per failed attempt'
      ],
      recommendedActions: [
        {
          step: 1,
          action: 'Enforce Cloudflare / WAF IP challenge mode on /api/v1/auth/login',
          priority: 'URGENT',
          command: 'cloudflare-cli waf rules update --rule-id "auth_rate_limit" --action "managed_challenge"'
        },
        {
          step: 2,
          action: 'Scale auth-service pods from 4 to 16 replicas to distribute hashing load',
          priority: 'HIGH',
          command: 'kubectl scale deployment/auth-service --replicas=16 -n production'
        }
      ],
      preventativeMeasures: [
        'Deploy CAPTCHA challenge after 3 failed login attempts per username or IP subnet',
        'Shift password hashing verification to dedicated background auth workers'
      ],
      slackNotificationDraft: `🛡️ *[${severity} SECURITY INCIDENT] Auth Brute-Force Spike*\n*Impact:* High latency on user sign-ins.\n*Action:* WAF challenge mode activated; auth-service scaled up to 16 replicas.`
    };
  }

  // Generic SRE RCA
  return {
    executiveSummary: `Anomalous pattern detected on ${rootSvc} with cascading degradation across ${cascading.join(', ') || 'adjacent microservices'}. System error rates and p99 latency exceeded operational thresholds.`,
    rootCauseHypothesis: `Service ${rootSvc} encountered sudden resource saturation or unexpected exception surges, triggering backpressure and timeouts across upstream consumer endpoints.`,
    cascadingPathExplanation: `${rootSvc} metric threshold breach -> downstream RPC client timeouts -> degraded end-user request responses.`,
    contributingFactors: [
      'Sudden traffic surge exceeding provisioned capacity',
      'Insufficient downstream timeout and retry backoff configurations'
    ],
    recommendedActions: [
      {
        step: 1,
        action: `Inspect real-time logs and metrics for ${rootSvc}`,
        priority: 'URGENT',
        command: `kubectl logs -l app=${rootSvc} --tail=200 -n production | grep -E "ERROR|FATAL|WARN"`
      },
      {
        step: 2,
        action: `Horizontally autoscale ${rootSvc} to absorb current load`,
        priority: 'HIGH',
        command: `kubectl scale deployment/${rootSvc} --replicas=8 -n production`
      }
    ],
    preventativeMeasures: [
      'Tune Horizontal Pod Autoscaler (HPA) target CPU threshold to 70%',
      'Refine correlation rules to trigger automated canary rollbacks'
    ],
    slackNotificationDraft: `⚠️ *[${severity} INCIDENT] ${incident.title}*\n*Status:* In Progress | *Affected:* \`${rootSvc}\`\n*Action:* On-call SRE inspecting logs and applying mitigation.`
  };
}

// Start Server with Vite Middleware in dev or static serving in prod
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IncidentPulse Server running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${isProd ? 'production' : 'development'}`);
    console.log(`Gemini API: ${apiKey ? 'Configured' : 'Disabled (Heuristic Mode Active)'}`);
  });
}

startServer();
