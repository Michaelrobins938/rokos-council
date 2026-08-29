/* eslint-disable */
// Model-health circuit breaker + phase-timeout policy tests.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/model-health.test.ts --format=esm --outfile=/tmp/health.test.mjs && node /tmp/health.test.mjs
import {
  classifyModelOutcome,
  createModelHealthRegistry,
  DEFAULT_MODEL_HEALTH_CONFIG,
  PHASE_TIMEOUTS,
} from '../services/geminiService';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── OUTCOME CLASSIFICATION (failure classes never collapse) ──────────────────
console.log('OUTCOME CLASSIFICATION');
ok(classifyModelOutcome('X', 403) === 'forbidden', '403 → forbidden (never blindly retried)');
ok(classifyModelOutcome('X', 401) === 'forbidden', '401 → forbidden');
ok(classifyModelOutcome('X', 504) === 'timeout', '504 → timeout');
ok(classifyModelOutcome('X', 502) === 'timeout', '502 → timeout');
ok(classifyModelOutcome('X', 429) === 'rate_limited', '429 → rate_limited');
ok(classifyModelOutcome('INVALID_VOTE_JSON', 200) === 'contract_failure', 'INVALID_VOTE_JSON on a 200 → contract_failure (parser bug, not infra)');
ok(classifyModelOutcome('INVALID_PROVIDER_RESPONSE', undefined) === 'contract_failure', 'INVALID_PROVIDER_RESPONSE → contract_failure');
ok(classifyModelOutcome('REQUEST_TIMEOUT', 'timeout') === 'timeout', 'REQUEST_TIMEOUT → timeout (phase budget, not a parser bug)');
ok(classifyModelOutcome('NVIDIA_PROVIDER_ERROR', 500) === 'error', 'generic 500 → error');

// ── CIRCUIT STATE MACHINE ────────────────────────────────────────────────────
console.log('CIRCUIT STATE MACHINE');
// Default cooldown (30s) so the OPEN state stays visible to currentState().
const reg = createModelHealthRegistry();
ok(reg.shouldTry('a'), 'unseen model → closed → eligible');

// 2 consecutive timeouts → degraded
reg.record('a', 'timeout', 900);
reg.record('a', 'timeout', 1100);
ok(reg.currentState('a') === 'degraded', '2 consecutive timeouts → DEGRADED (deprioritized, still eligible)');
ok(reg.shouldTry('a'), 'degraded → still eligible (deprioritized, not skipped)');

// 2 more → open
reg.record('a', 'timeout');
reg.record('a', 'error');
ok(reg.snapshot()['a']?.state === 'open', '4 consecutive failures → raw state OPEN');
ok(!reg.shouldTry('a'), 'open → shouldTry false (circuit open, no probe until cooldown)');

// Cooldown-0 registry: open → half-open probe; success → closed
const probe = createModelHealthRegistry({ ...DEFAULT_MODEL_HEALTH_CONFIG, cooldownMs: 0 });
probe.record('a', 'timeout');
probe.record('a', 'timeout');
probe.record('a', 'timeout');
probe.record('a', 'timeout');
ok(probe.snapshot()['a']?.state === 'open', 'probe-reg: 4 failures → OPEN');
ok(probe.currentState('a') === 'half-open', 'cooldown elapsed (0ms) → HALF-OPEN (probe permitted)');
ok(probe.shouldTry('a'), 'half-open → single probe allowed');
probe.record('a', 'ok', 1200);
ok(probe.currentState('a') === 'closed', 'probe success → CLOSED');

// forbidden → opens immediately regardless of count
reg.record('b', 'forbidden');
ok(reg.snapshot()['b']?.state === 'open' && !reg.shouldTry('b'), 'single 403 → OPEN permanently for the session');

// half-open probe failure → back to open (raw state — with cooldown 0 the
// time-flipped currentState would already show the next half-open)
probe.record('b', 'error');
probe.record('b', 'error');
probe.record('b', 'error');
probe.record('b', 'error');
ok(probe.snapshot()['b']?.state === 'open', 'b opened after 4 failures');
probe.record('b', 'error'); // half-open probe fails
ok(probe.snapshot()['b']?.state === 'open', 'half-open probe failure → back to OPEN');

// contract failures degrade the model like transport failures
const c = createModelHealthRegistry({ ...DEFAULT_MODEL_HEALTH_CONFIG, cooldownMs: 0 });
c.record('gemma', 'contract_failure');
c.record('gemma', 'contract_failure');
ok(c.currentState('gemma') === 'degraded', '2 contract failures → DEGRADED (contract reliability penalized)');

// ── STATS (P50/P95, success rate, contract-valid rate) ───────────────────────
console.log('STATS');
const s = createModelHealthRegistry();
[100, 200, 300, 400, 500].forEach(lat => s.record('fast', 'ok', lat));
s.record('fast', 'timeout', 6000);
s.record('fast', 'contract_failure', 250);
const st = s.stats('fast');
ok(st !== null && st.successRate === 5 / 7, `successRate ${st?.successRate.toFixed(2)}`);
ok(st?.contractValidRate === 5 / 6, `contractValidRate = 5/6 (successes / transported)`);
ok(st?.p50 === 300, `p50 = ${st?.p50}`);
ok(st?.p95 === 6000, `p95 = ${st?.p95}`);
ok(st?.timeoutRate === 1 / 7, 'timeoutRate recorded');
ok(st?.attempts === 7, 'attempts recorded');
ok(s.stats('never_seen') === null, 'unseen model → no stats');

// ── PHASE TIMEOUT POLICY (budget ordering matters) ───────────────────────────
console.log('PHASE TIMEOUTS');
ok(PHASE_TIMEOUTS.analysis === 60_000, 'analysis: 60s (long-form reasoning)');
ok(PHASE_TIMEOUTS.voting === 30_000, 'voting: 30s (tight structured ballot)');
ok(PHASE_TIMEOUTS.runoff === 30_000, 'runoff: 30s');
ok(PHASE_TIMEOUTS.synthesis === 20_000, 'synthesis: 20s (shortest)');
ok(PHASE_TIMEOUTS.analysis > PHASE_TIMEOUTS.voting, 'analysis budget > voting budget');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}
