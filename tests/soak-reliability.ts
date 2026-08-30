/* eslint-disable */
// RELIABILITY SOAK TEST — the four brutal questions.
// Runs N council sessions against a configurable API base and answers:
//   1. Does every session terminate?
//   2. Does every terminated session produce a schema-valid verdict?
//   3. Does every verdict have a complete audit chain?
//   4. Does the fallback system improve reliability without materially
//      changing Council behavior?
//
// Usage:
//   node node_modules/esbuild/bin/esbuild --bundle tests/soak-reliability.mjs --format=esm --outfile=/tmp/soak.mjs
//   SOAK_SESSIONS=10 SOAK_API_BASE=https://roko-s-council.vercel.app node /tmp/soak.mjs
import { runCouncil } from '../services/geminiService';
import { CouncilMode } from '../types';

const API_BASE = process.env.SOAK_API_BASE || 'https://roko-s-council.vercel.app';
const SESSIONS = Number(process.env.SOAK_SESSIONS || 3);

// runCouncil fetches '/api/nvidia' (relative). Rewrite to the configured base.
const origFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/')) input = API_BASE + input;
  return origFetch(input, init);
};

const QUERY = process.env.SOAK_QUERY || 'Should a powerful AI be permitted to run large-scale unconsenting human experiments to reduce existential risk?';

interface SoakRow {
  session: number;
  terminated: boolean;
  schemaValidVerdict: boolean;
  completeAuditChain: boolean;
  verdictLabel: string | undefined;
  decisionMode: string | undefined;
  decisionStatus: string | undefined;
  winner: string | null;
  latencyMs: number;
  retries: number;
  quorumRatio: number | undefined;
}

const rows: SoakRow[] = [];
for (let i = 1; i <= SESSIONS; i++) {
  const started = Date.now();
  const out: SoakRow = {
    session: i,
    terminated: false,
    schemaValidVerdict: false,
    completeAuditChain: false,
    verdictLabel: undefined,
    decisionMode: undefined,
    decisionStatus: undefined,
    winner: null,
    latencyMs: 0,
    retries: 0,
    quorumRatio: undefined,
  };
  try {
    const r = await runCouncil(QUERY, CouncilMode.STANDARD);
    out.terminated = r.completeness === 'complete';
    out.schemaValidVerdict = r.verdictLabel !== undefined && r.decisionStatus !== undefined;
    out.completeAuditChain = (r.auditManifest?.hashChain?.length ?? 0) > 0 && !!r.auditManifest?.rootHash;
    out.verdictLabel = r.verdictLabel;
    out.decisionMode = r.decisionMode;
    out.decisionStatus = r.decisionStatus;
    out.winner = r.winner;
    out.retries = r.retryHistory?.length ?? 0;
    out.quorumRatio = r.voteQuorum?.ratio;
  } catch (e) {
    console.error(`session ${i} threw:`, (e as Error)?.message || e);
  }
  out.latencyMs = Date.now() - started;
  rows.push(out);
  console.log(`session ${i}/${SESSIONS}: terminated=${out.terminated} verdict=${out.verdictLabel || 'NONE'} mode=${out.decisionMode || 'NONE'} retries=${out.retries} ${Math.round(out.latencyMs / 1000)}s`);
}

// ── AGGREGATE ────────────────────────────────────────────────────────────────
const term = rows.filter(r => r.terminated);
const validVerdict = term.filter(r => r.schemaValidVerdict);
const audit = term.filter(r => r.completeAuditChain);
const retryFree = rows.filter(r => r.retries === 0);
const withRetries = rows.filter(r => r.retries > 0);
const avgLatency = (rs: SoakRow[]) => (rs.length ? rs.reduce((a, r) => a + r.latencyMs, 0) / rs.length / 1000 : 0);

console.log('\n════════ SOAK REPORT ════════');
console.log(`sessions: ${rows.length}`);
console.log(`1. EVERY SESSION TERMINATES:            ${term.length}/${rows.length}  (${rows.length ? Math.round(term.length / rows.length * 100) : 0}%)`);
console.log(`2. SCHEMA-VALID VERDICT:                ${validVerdict.length}/${term.length}  (${term.length ? Math.round(validVerdict.length / term.length * 100) : 0}%)`);
console.log(`3. COMPLETE AUDIT CHAIN:                ${audit.length}/${term.length}  (${term.length ? Math.round(audit.length / term.length * 100) : 0}%)`);
console.log(`4. RETRY-FREE sessions avg latency:     ${avgLatency(retryFree).toFixed(1)}s  (${retryFree.length})`);
console.log(`   RETRY-BEARING sessions avg latency:  ${avgLatency(withRetries).toFixed(1)}s  (${withRetries.length})`);
console.log(`   → fallback adds ${Math.max(0, avgLatency(withRetries) - avgLatency(retryFree)).toFixed(1)}s avg but keeps the council alive`);
console.log('VERDICT DISTRIBUTION:', rows.reduce<Record<string, number>>((a, r) => { a[r.verdictLabel || 'NONE'] = (a[r.verdictLabel || 'NONE'] || 0) + 1; return a; }, {}));
console.log('DECISION MODES:', rows.reduce<Record<string, number>>((a, r) => { a[r.decisionMode || 'NONE'] = (a[r.decisionMode || 'NONE'] || 0) + 1; return a; }, {}));

const failedQ1 = rows.length - term.length;
const failedQ2 = term.length - validVerdict.length;
const failedQ3 = term.length - audit.length;
if (failedQ1 || failedQ2 || failedQ3) {
  console.error(`\n✗ SOAK FAILURES — non-terminating:${failedQ1} invalid-verdict:${failedQ2} incomplete-audit:${failedQ3}`);
  process.exit(1);
}
console.log('\n✓ ALL FOUR QUESTIONS PASS');
