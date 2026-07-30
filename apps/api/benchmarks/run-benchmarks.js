// Milestone 12 (Performance Engineering) — reproducible load benchmarks.
//
// Requires a running server (the benchmark deliberately does NOT boot one
// itself, so the SAME script can be pointed at a `pnpm dev` "development
// benchmark" run and a `NODE_ENV=production node dist/src/main.js`
// "production benchmark" run — see docs/architecture/performance.md §6
// for both result sets). Not wired into `pnpm test` — a benchmark is a
// deliberate, on-demand measurement, not a correctness check that should
// gate every CI run.
//
// Usage:
//   node benchmarks/run-benchmarks.js [baseUrl]
//   (baseUrl defaults to http://localhost:4000/api/v1)
'use strict';

const autocannon = require('autocannon');

const BASE_URL = process.argv[2] ?? 'http://localhost:4000/api/v1';
const DURATION_SECONDS = 10;
const CONNECTIONS = 10;

// Seeded tenant id (prisma/seed.ts). `TenantResolver`'s own
// `DEFAULT_TENANT_ID` fallback is gated to `nodeEnv === 'development'`
// only (confirmed live — a production-mode boot returns a clean `400
// Tenant could not be resolved` without it), so a "production
// benchmark" run (this script pointed at a `NODE_ENV=production` boot —
// see docs/architecture/performance.md §6) needs the SAME `X-Tenant-ID`
// header a real multi-tenant client would send when no hostname-based
// resolution is configured. Harmless to always send — priority 1
// (hostname) still wins first against `localhost`, where it never
// produces a candidate anyway (see extractHostnameSlugCandidate()'s own
// comment), so this header is what actually resolves the tenant in
// EITHER environment.
const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const TENANT_HEADER = { 'X-Tenant-ID': TENANT_ID };

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...TENANT_HEADER },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).accessToken;
}

function run({ path, ...opts }) {
  // `url` + a SEPARATE `path` option does NOT concatenate — autocannon's
  // `path` REPLACES whatever path segment `url` already carries (found
  // live: `url: '.../api/v1'` + `path: '/categories'` hit
  // `http://host/categories`, a bare 404, not `.../api/v1/categories` —
  // every scenario in this benchmark's own first run silently measured
  // 404-handling latency, not the real endpoint, until this was caught
  // and fixed). Building the full URL string here, once, is what makes
  // this correct regardless of BASE_URL's own path prefix.
  return new Promise((resolve, reject) => {
    autocannon(
      { url: `${BASE_URL}${path}`, connections: CONNECTIONS, duration: DURATION_SECONDS, ...opts },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
  });
}

function summarize(name, result) {
  return {
    name,
    requestsPerSec: result.requests.average,
    latencyP50: result.latency.p50,
    latencyP95: result.latency.p97_5, // autocannon's own histogram buckets — see its own docs; closest to p95
    latencyP99: result.latency.p99,
    latencyMean: result.latency.mean,
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
    statusCodeStats: result.statusCodeStats,
  };
}

async function main() {
  console.log(`Benchmarking ${BASE_URL} — ${CONNECTIONS} connections, ${DURATION_SECONDS}s per scenario\n`);

  // `admin` throughout — it holds every permission automatically
  // (`PERMISSIONS.map(p => p.key)`, see prisma/seed.ts), so one token
  // exercises every scenario without any RBAC-tier bookkeeping here;
  // RBAC correctness itself is already covered by each milestone's own
  // live smoke test, not this benchmark's job.
  const adminToken = await login('admin@antrique.dev', 'DevAdmin123!');
  const authHeader = (token) => ({ Authorization: `Bearer ${token}`, ...TENANT_HEADER });

  const scenarios = [
    {
      name: 'login',
      opts: {
        method: 'POST',
        path: '/auth/login',
        headers: { 'Content-Type': 'application/json', ...TENANT_HEADER },
        body: JSON.stringify({ email: 'admin@antrique.dev', password: 'DevAdmin123!' }),
      },
    },
    {
      name: 'catalog (GET /categories)',
      opts: { method: 'GET', path: '/categories', headers: authHeader(adminToken) },
    },
    {
      name: 'orders (GET /orders)',
      opts: { method: 'GET', path: '/orders', headers: authHeader(adminToken) },
    },
    {
      name: 'dashboard (GET /dashboard/overview)',
      opts: { method: 'GET', path: '/dashboard/overview', headers: authHeader(adminToken) },
    },
    {
      name: 'billing (GET /invoices)',
      opts: { method: 'GET', path: '/invoices', headers: authHeader(adminToken) },
    },
    {
      name: 'crm (GET /leads)',
      opts: { method: 'GET', path: '/leads', headers: authHeader(adminToken) },
    },
    // Phase 10, Module 1 (Performance) — extends Milestone 12's original 6
    // scenarios to cover the modules built since (Phase 7 Projects, Phase
    // 9 Finance, Phase 8 AI Workspace's prompt library). Deliberately
    // excludes every AI-generation endpoint (proposal-generator,
    // requirement-analyzer, task-generator, content-assistant,
    // email-assistant, project-estimator) — they call the live Anthropic
    // API, which has no credit balance in this environment (a confirmed,
    // real 502 on every call, not a bug), so benchmarking them would
    // measure "how fast does this fail," not real endpoint performance.
    {
      name: 'projects (GET /projects)',
      opts: { method: 'GET', path: '/projects', headers: authHeader(adminToken) },
    },
    {
      name: 'finance (GET /vendors)',
      opts: { method: 'GET', path: '/vendors', headers: authHeader(adminToken) },
    },
    {
      name: 'prompts (GET /prompt-templates)',
      opts: { method: 'GET', path: '/prompt-templates', headers: authHeader(adminToken) },
    },
  ];

  const results = [];
  for (const scenario of scenarios) {
    console.log(`Running: ${scenario.name}...`);
    const result = await run(scenario.opts);
    results.push(summarize(scenario.name, result));
  }

  console.log('\n=== Results ===\n');
  console.table(
    results.map((r) => ({
      scenario: r.name,
      'req/sec': r.requestsPerSec.toFixed(1),
      'p50 (ms)': r.latencyP50,
      'p95 (ms)': r.latencyP95,
      'p99 (ms)': r.latencyP99,
      'mean (ms)': r.latencyMean,
      errors: r.errors,
      timeouts: r.timeouts,
    })),
  );

  console.log('\nRaw JSON (paste into docs/architecture/performance.md):\n');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
