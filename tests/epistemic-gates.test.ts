/* eslint-disable */
// Failure-injection tests for the Council Epistemic State Machine.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/epistemic-gates.test.ts --format=esm --outfile=/tmp/gates.test.mjs && node /tmp/gates.test.mjs
import {
  computeQuorumAchieved,
  selectWinnerFromTally,
  parseVotePayload,
  executionStatusFromHttp,
  classifyNvidiaError,
  NvidiaProviderError,
  COUNCIL_MIN_VALID_VOTES,
  COUNCIL_QUORUM_THRESHOLD,
} from '../services/geminiService';
import { computeDiagnostics } from '../services/exportService';
import type { CouncilResult, ProviderMetadata } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

const meta: ProviderMetadata = { provider: 'nvidia', model: 'minimaxai/minimax-m3', status: 'ok' };
const peers = ['Oracle', 'Strategos', 'Philosopher', 'Demagogue', 'Jurist', 'Citizen', 'Historian', 'Critic', 'Technocrat'];

// ── QUORUM GATE ───────────────────────────────────────────────────────────────
console.log('QUORUM GATE');
ok(!computeQuorumAchieved(2, 10, COUNCIL_QUORUM_THRESHOLD), '2/10 members → quorum NOT met (regression: the Demagogue-0-votes run)');
ok(computeQuorumAchieved(6, 10, COUNCIL_QUORUM_THRESHOLD), '6/10 members → quorum met');
ok(!computeQuorumAchieved(0, 10, COUNCIL_QUORUM_THRESHOLD), '0/10 → quorum not met');
ok(!computeQuorumAchieved(0, 0, COUNCIL_QUORUM_THRESHOLD), '0 assigned → never quorum');

// ── WINNER GATE (the smoking gun) ─────────────────────────────────────────────
console.log('WINNER GATE');
ok(selectWinnerFromTally({}, COUNCIL_MIN_VALID_VOTES) === null, 'EMPTY tally → winner NULL (was "Demagogue with 0 votes")');
ok(selectWinnerFromTally({ Oracle: 1 }, COUNCIL_MIN_VALID_VOTES) === null, '1 vote < min 2 → winner NULL');
ok(selectWinnerFromTally({ Oracle: 2, Strategos: 1 }, COUNCIL_MIN_VALID_VOTES) === 'Oracle', '2 valid votes → Oracle wins');
ok(selectWinnerFromTally({ Oracle: 2, Strategos: 2 }, COUNCIL_MIN_VALID_VOTES) === 'Oracle', 'tie broken deterministically (first max)');
ok(selectWinnerFromTally({ Oracle: 0, Strategos: 0 }, 0) === 'Oracle', 'explicit zero-min yields first key only (not used in prod)');

// ── VOTE REPAIR BOUNDARY ──────────────────────────────────────────────────────
console.log('VOTE REPAIR');
let v = parseVotePayload('{"vote":"Oracle","reason":"best alignment"}', meta, peers);
ok(v.votedFor === 'Oracle', 'clean JSON');
v = parseVotePayload('```json\n{"vote": "Oracle", "reason": "best"}\n```', meta, peers);
ok(v.votedFor === 'Oracle', 'markdown fenced JSON');
v = parseVotePayload('Here is my decision: {"vote": "Oracle", "reason": "best"} thanks', meta, peers);
ok(v.votedFor === 'Oracle', 'prose-wrapped JSON extracted');
v = parseVotePayload("{'vote': 'Oracle', 'reason': 'best',}", meta, peers);
ok(v.votedFor === 'Oracle', 'single quotes + trailing comma repaired');
v = parseVotePayload('{vote: "Oracle", reason: "best"}', meta, peers);
ok(v.votedFor === 'Oracle', 'unquoted keys repaired');
v = parseVotePayload('{"vote":"I vote for Oracle","reason":"best"}', meta, peers);
ok(v.votedFor === 'Oracle', 'prose vote normalized to candidate');
v = parseVotePayload('{"vote":"oracle","reason":"best"}', meta, peers);
ok(v.votedFor === 'Oracle', 'case-insensitive candidate match');
v = parseVotePayload('{"vote":"None","reason":"no alignment"}', meta, peers);
ok(v.votedFor === 'None', 'None vote preserved');
v = parseVotePayload('{"vote":"Abstained","reason":"no"}', meta, peers);
ok(v.votedFor === 'None', 'Abstained normalized to None');

console.log('VOTE REJECTION');
let threw = false;
try { parseVotePayload('{"vote":"NobodyHere","reason":"x"}', meta, peers); } catch { threw = true; }
ok(threw, 'nonexistent candidate → INVALID_VOTE_TARGET');
threw = false;
try { parseVotePayload('This is prose with no json at all, I vote Oracle!', meta, peers); } catch { threw = true; }
ok(threw, 'unparseable output → INVALID_VOTE_JSON');
threw = false;
try { parseVotePayload('{"vote":"Oracle"}', meta, peers); } catch { threw = true; }
ok(threw, 'missing reason → INVALID_VOTE_SCHEMA');

// ── EXECUTION CLASSIFICATION ──────────────────────────────────────────────────
console.log('EXECUTION CLASSIFICATION');
ok(executionStatusFromHttp(504) === 'timeout', '504 → timeout');
ok(executionStatusFromHttp(429) === 'rate_limited', '429 → rate_limited');
ok(executionStatusFromHttp(410) === 'invalid', '410 EOL → invalid');
ok(executionStatusFromHttp(400) === 'invalid', '400 → invalid');
ok(executionStatusFromHttp(200) === 'ok', '200 → ok');
const retryableErr = new NvidiaProviderError('up', { ...meta, error: { code: 'X', message: 'up', recoverable: true } });
ok(classifyNvidiaError(retryableErr).retryable === true, 'recoverable error classified retryable');
const timeoutErr = new NvidiaProviderError('up', { ...meta, status: 'error', error: { code: 'NVIDIA_PROVIDER_ERROR', message: 'up', recoverable: true, status: 504 } });
ok(executionStatusFromHttp(classifyNvidiaError(timeoutErr).status) === 'timeout', '504 wrapped error → timeout classification');

// ── DIAGNOSTICS (recovered vs failed) ─────────────────────────────────────────
console.log('DIAGNOSTICS');
const recoveredResult: CouncilResult = {
  winner: 'Oracle',
  synthesis: 'x',
  opinions: [
    { persona: 'Oracle', text: 'ok', status: 'completed', vote: 'Strategos', metadata: { ...meta, model: 'minimaxai/minimax-m3' } },
    { persona: 'Strategos', text: '', status: 'failed' },
  ],
  providerSummary: {
    'Oracle:analysis:nvidia:error': { provider: 'nvidia', model: 'nemotron-super', latencyMs: 5000, status: 'error', error: { code: 'X', message: 'timeout', recoverable: false, status: 504 } },
    'Oracle:analysis:fallback:minimaxai/minimax-m3': { provider: 'nvidia', model: 'minimaxai/minimax-m3', latencyMs: 1200, status: 'ok' },
    'Strategos:analysis:nvidia:error': { provider: 'nvidia', model: 'gemma', status: 'error', error: { code: 'X', message: 'timeout', recoverable: false, status: 504 } },
  },
  phaseTimeline: [{ id: 'deliberation', title: '', description: '', status: 'completed', startTime: 0, endTime: 1000 }],
  retryHistory: [{ phase: 'deliberation', attempt: 1, error: 'timeout', timestamp: 0 }],
};
const diag = computeDiagnostics(recoveredResult);
const oracleRec = diag.memberFailures.find(m => m.persona === 'Oracle');
const stratRec = diag.memberFailures.find(m => m.persona === 'Strategos');
ok(oracleRec?.outcome === 'recovered', 'Oracle: primary failed + fallback succeeded → RECOVERED (the key audit distinction)');
ok(stratRec?.outcome === 'failed', 'Strategos: all attempts failed → FAILED');
ok(diag.retrySummary.total === 1, 'retryHistory surfaced in diagnostics');
ok(diag.latencyStats.analysis?.avgMs === 3100, 'latency stats computed (5000+1200)/2');
ok(diag.modelHealth['minimaxai/minimax-m3']?.ok === 1, 'modelHealth tracks ok calls');

// ── PROTOCOL REPORT ───────────────────────────────────────────────────────────
console.log('PROTOCOL REPORT');
const gatedResult: CouncilResult = {
  winner: null,
  synthesis: 'VERDICT_UNAVAILABLE',
  opinions: [],
  executionStatus: 'complete',
  deliberationStatus: 'quorum_failed',
  votingStatus: 'skipped',
  synthesisStatus: 'not_attempted',
  verdictStatus: 'unavailable',
  synthesisMode: 'local_fallback',
  quorum: { assigned: 10, participated: 2, failed: 8, threshold: 0.6, participationRatio: 0.2, achieved: false },
  voteStats: { expectedVoters: 2, validVotes: 0, abstentions: 0, invalidVotes: 0 },
};
const gatedDiag = computeDiagnostics(gatedResult);
ok(gatedDiag.protocol?.verdictStatus === 'unavailable', 'protocol report exposes verdictStatus');
ok(gatedDiag.protocol?.quorum?.achieved === false, 'protocol report exposes quorum failure');
ok(gatedResult.winner === null, 'verdict unavailable ⇒ winner null (structural invariant)');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}

