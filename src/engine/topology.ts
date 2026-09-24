import { ServiceNode } from '../types';

export const INITIAL_TOPOLOGY_NODES: Record<string, ServiceNode> = {
  'cloud-cdn': {
    id: 'cloud-cdn',
    name: 'Cloud Edge CDN',
    tier: 2,
    category: 'edge',
    dependencies: ['api-gateway'],
    dependents: [],
    status: 'healthy',
    x: 80,
    y: 190,
    metrics: { currentLatency: 18, currentErrorRate: 0.05, currentCpu: 22, activeAnomaliesCount: 0 },
  },
  'api-gateway': {
    id: 'api-gateway',
    name: 'API Gateway (Envoy)',
    tier: 1,
    category: 'gateway',
    dependencies: ['auth-service', 'checkout-service'],
    dependents: ['cloud-cdn'],
    status: 'healthy',
    x: 270,
    y: 190,
    metrics: { currentLatency: 35, currentErrorRate: 0.1, currentCpu: 38, activeAnomaliesCount: 0 },
  },
  'auth-service': {
    id: 'auth-service',
    name: 'Auth & Identity Svc',
    tier: 1,
    category: 'service',
    dependencies: ['redis-cache'],
    dependents: ['api-gateway'],
    status: 'healthy',
    x: 480,
    y: 80,
    metrics: { currentLatency: 42, currentErrorRate: 0.1, currentCpu: 34, activeAnomaliesCount: 0 },
  },
  'redis-cache': {
    id: 'redis-cache',
    name: 'Redis Token Cluster',
    tier: 0,
    category: 'cache',
    dependencies: [],
    dependents: ['auth-service'],
    status: 'healthy',
    x: 710,
    y: 80,
    metrics: { currentLatency: 4, currentErrorRate: 0.0, currentCpu: 25, activeAnomaliesCount: 0 },
  },
  'checkout-service': {
    id: 'checkout-service',
    name: 'Checkout & Cart Svc',
    tier: 1,
    category: 'service',
    dependencies: ['payment-service', 'kafka-broker'],
    dependents: ['api-gateway'],
    status: 'healthy',
    x: 480,
    y: 280,
    metrics: { currentLatency: 65, currentErrorRate: 0.12, currentCpu: 45, activeAnomaliesCount: 0 },
  },
  'payment-service': {
    id: 'payment-service',
    name: 'Payment Processing Svc',
    tier: 1,
    category: 'service',
    dependencies: ['inventory-db'],
    dependents: ['checkout-service'],
    status: 'healthy',
    x: 710,
    y: 230,
    metrics: { currentLatency: 95, currentErrorRate: 0.08, currentCpu: 42, activeAnomaliesCount: 0 },
  },
  'inventory-db': {
    id: 'inventory-db',
    name: 'PostgreSQL Primary DB',
    tier: 0,
    category: 'database',
    dependencies: [],
    dependents: ['payment-service', 'checkout-service'],
    status: 'healthy',
    x: 930,
    y: 230,
    metrics: { currentLatency: 12, currentErrorRate: 0.0, currentCpu: 30, activeAnomaliesCount: 0 },
  },
  'kafka-broker': {
    id: 'kafka-broker',
    name: 'Kafka Event Bus',
    tier: 0,
    category: 'messaging',
    dependencies: [],
    dependents: ['checkout-service'],
    status: 'healthy',
    x: 710,
    y: 380,
    metrics: { currentLatency: 9, currentErrorRate: 0.02, currentCpu: 28, activeAnomaliesCount: 0 },
  },
  'k8s-node-pool': {
    id: 'k8s-node-pool',
    name: 'K8s Worker Node Pool',
    tier: 0,
    category: 'service',
    dependencies: [],
    dependents: ['checkout-service', 'auth-service', 'payment-service'],
    status: 'healthy',
    x: 480,
    y: 420,
    metrics: { currentLatency: 15, currentErrorRate: 0.0, currentCpu: 40, activeAnomaliesCount: 0 },
  },
};

/**
 * Returns all upstream dependent services recursively (e.g. if DB fails, who depends on it?)
 */
export function getAffectedUpstreamServices(
  targetServiceId: string,
  topology: Record<string, ServiceNode>
): string[] {
  const visited = new Set<string>();
  const queue = [...(topology[targetServiceId]?.dependents || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      const dependents = topology[current]?.dependents || [];
      for (const dep of dependents) {
        if (!visited.has(dep)) queue.push(dep);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Returns all downstream dependencies recursively (e.g. what does checkout-service call?)
 */
export function getDownstreamDependencies(
  targetServiceId: string,
  topology: Record<string, ServiceNode>
): string[] {
  const visited = new Set<string>();
  const queue = [...(topology[targetServiceId]?.dependencies || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      const dependencies = topology[current]?.dependencies || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) queue.push(dep);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Determines whether service A affects service B in the dependency topology
 */
export function areServicesTopologicallyRelated(
  serviceA: string,
  serviceB: string,
  topology: Record<string, ServiceNode>
): boolean {
  if (serviceA === serviceB) return true;
  const upstreamOfA = getAffectedUpstreamServices(serviceA, topology);
  if (upstreamOfA.includes(serviceB)) return true;
  const downstreamOfA = getDownstreamDependencies(serviceA, topology);
  if (downstreamOfA.includes(serviceB)) return true;
  return false;
}
