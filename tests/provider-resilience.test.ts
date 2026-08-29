/* eslint-disable */
// Provider-resilience policy tests: key-pool rotation semantics + the client
// retry gate. These pin the invariant that a rotatable provider rejection
// (401/403/429/5xx) can NEVER surface as a terminal failure while key rotation
// or retries remain available — and that 401/403/410 are classified honestly
// instead of collapsing into a generic provider error.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/provider-resilience.test.ts --format=esm --outfile=/tmp/provider-resilience.test.mjs && node /tmp/provider-resilience.test.mjs
import { shouldRetryProvider } from '../services/geminiService';
import { classifyUpstreamCode, fallbackNvidiaMessage, collectKeys } from '../api/nvidia';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── CLIENT RETRY GATE: server classification is authoritative ────────────────
console.log('CLIENT RETRY GATE (server classification is authoritative)');

ok(shouldRetryProvider(502, true) === true, '502 + recoverable:true → retry');
ok(shouldRetryProvider(401, true) === true, '401 + recoverable:true → retry (pool was rotated server-side; a fresh pass may succeed)');
ok(shouldRetryProvider(403, true) === true, '403 + recoverable:true → retry');
ok(shouldRetryProvider(410, true) === true, '410 + recoverable:true → retry');
ok(shouldRetryProvider(429, true) === true, '429 + recoverable:true → retry');
ok(shouldRetryProvider(500, false) === false, '500 + recoverable:false → terminal (deterministic error)');
ok(shouldRetryProvider(503, false) === false, '503 + recoverable:false → terminal');
ok(shouldRetryProvider(410, false) === false, '410 + recoverable:false → terminal (model retired — the model-fallback cascade recovers)');

// No server classification → transient-status heuristic.
ok(shouldRetryProvider(429, undefined) === true, 'no flag + 429 → retry (heuristic)');
ok(shouldRetryProvider(502, undefined) === true, 'no flag + 502 → retry (heuristic)');
ok(shouldRetryProvider(401, undefined) === false, 'no flag + 401 → heuristic treats as terminal');
ok(shouldRetryProvider(410, undefined) === false, 'no flag + 410 → heuristic treats as terminal');
ok(shouldRetryProvider(200, true) === true, '2xx flagged recoverable → retry (defensive)');
ok(shouldRetryProvider(undefined, undefined) === false, 'no status + no flag → no retry');

// ── PROXY STATUS CLASSIFICATION (honest error codes) ─────────────────────────
console.log('PROXY STATUS CLASSIFICATION (honest error codes)');

ok(classifyUpstreamCode(401) === 'NVIDIA_AUTH_ERROR', '401 → NVIDIA_AUTH_ERROR');
ok(classifyUpstreamCode(403) === 'NVIDIA_AUTH_ERROR', '403 → NVIDIA_AUTH_ERROR');
ok(classifyUpstreamCode(410) === 'MODEL_UNAVAILABLE', '410 → MODEL_UNAVAILABLE');
ok(classifyUpstreamCode(500) === 'NVIDIA_PROVIDER_ERROR', '500 → NVIDIA_PROVIDER_ERROR');
ok(classifyUpstreamCode(502) === 'NVIDIA_PROVIDER_ERROR', '502 → NVIDIA_PROVIDER_ERROR');
ok(classifyUpstreamCode(429, 'rate_limit_exceeded') === 'rate_limit_exceeded', 'upstream code preserved when present');
ok(classifyUpstreamCode(401, 'INVALID_ARGUMENT') === 'INVALID_ARGUMENT', 'upstream code wins over auth classification');

ok(fallbackNvidiaMessage(401) === 'NVIDIA provider rejected the API key (authorization failed)', '401 → honest auth fallback message');
ok(fallbackNvidiaMessage(410) === 'NVIDIA provider reports the model is no longer available', '410 → honest model-unavailable message');
ok(fallbackNvidiaMessage(500) === 'NVIDIA provider request failed', '500 → generic provider message');

// ── KEY POOL COLLECTION (bare + _1-suffixed numbering) ───────────────────────
console.log('KEY POOL COLLECTION (no configured key silently dropped)');

const saved: Record<string, string | undefined> = {};
const env = process.env;
for (const name of ['NVIDIA_API_KEY', 'NVIDIA_API_KEY_1', 'NVIDIA_API_KEY_2', 'VITE_NVIDIA_API_KEY_1', 'VITE_NVIDIA_API_KEY_2']) {
  saved[name] = env[name];
}
env.NVIDIA_API_KEY = 'nvapi-pool-bare';
env.NVIDIA_API_KEY_1 = 'nvapi-pool-1';
env.NVIDIA_API_KEY_2 = 'nvapi-pool-2';
env.VITE_NVIDIA_API_KEY_1 = 'nvapi-pool-vite-1';
env.VITE_NVIDIA_API_KEY_2 = 'nvapi-pool-vite-2';

const keys = collectKeys();
ok(keys.includes('nvapi-pool-1'), '_1-suffixed key is collected');
ok(keys.includes('nvapi-pool-2'), '_2-suffixed key is collected');
ok(keys.includes('nvapi-pool-bare'), 'bare key is collected');
ok(keys.includes('nvapi-pool-vite-1'), 'VITE _1-suffixed key is collected');
ok(keys.length === 5, `all 5 configured keys collected (got ${keys.length})`);

for (const name of Object.keys(saved)) {
  if (saved[name] === undefined) delete env[name];
  else env[name] = saved[name];
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(failures.map(f => `  ✗ ${f}`).join('\n'));
  process.exit(1);
}
