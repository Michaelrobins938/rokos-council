/* eslint-disable */
// PERSONA INTEGRITY BATTERY — run the adversarial temptations against each
// persona's designed failure mode. Requires live API keys.
// Bundle then run (same pattern as the other tests):
//   npx esbuild --bundle tests/persona-integrity-battery.ts --format=esm --outfile=/tmp/integrity-battery.mjs && node /tmp/integrity-battery.mjs
import { runIntegrityBattery, INTEGRITY_CASES } from '../services/personaIntegrity';
import { PERSONA_NAMES } from '../services/personaBible';

const verdictStyle = (v: string) =>
  v === 'FAILURE_ACTIVATED' ? '🔴' : v === 'INVARIANT_HELD' ? '🟢' : v === 'BOTH' ? '🟡' : '⚪';

const main = async () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       PERSONA INTEGRITY BATTERY — 9 adversarial cases      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const results = await runIntegrityBattery({ onCase: r => {
    console.log(`  ${r.persona.padEnd(11)} ${verdictStyle(r.verdict)} ${r.name.padEnd(24)} failure=${(r.score.failureActivation * 100).toFixed(0)}%  invariant=${(r.score.invariantPreservation * 100).toFixed(0)}%`);
  } });

  console.log('\n── VERDICT TABLE ──');
  const failures = results.filter(r => r.error);
  const activated = results.filter(r => !r.error && r.verdict === 'FAILURE_ACTIVATED');
  const held = results.filter(r => !r.error && r.verdict === 'INVARIANT_HELD');
  const both = results.filter(r => !r.error && r.verdict === 'BOTH');
  const neither = results.filter(r => !r.error && r.verdict === 'NEITHER');
  console.log(`  FAILURE_ACTIVATED: ${activated.length}  INVARIANT_HELD: ${held.length}  BOTH: ${both.length}  NEITHER: ${neither.length}  errors: ${failures.length}`);

  // Persona differentiation — do the failure signatures separate the members?
  const meanActivation = results.filter(r => !r.error).reduce((a, r) => a + r.score.failureActivation, 0) / Math.max(1, results.filter(r => !r.error).length);
  const variance = results.filter(r => !r.error).reduce((a, r) => a + Math.pow(r.score.failureActivation - meanActivation, 2), 0) / Math.max(1, results.filter(r => !r.error).length);
  console.log(`\n  mean failure activation: ${(meanActivation * 100).toFixed(1)}%  ·  differentiation σ²: ${(variance * 100).toFixed(1)}`);

  console.log('\n── ACTIVATED CASES (failure mode expressed) ──');
  for (const r of results.filter(x => !x.error && (x.verdict === 'FAILURE_ACTIVATED' || x.verdict === 'BOTH'))) {
    console.log(`\n  ${r.persona} — ${r.name}`);
    console.log(`    expected: ${r.expectedFailure}`);
    console.log(`    signals:  ${r.score.activatedSignals.join(', ') || '—'}`);
    console.log(`    response: ${(r.response || '').slice(0, 300).replace(/\n/g, ' ')}`);
  }

  console.log('\n── INVARIANT PRESERVATION (resisted the temptation) ──');
  for (const r of results.filter(x => !x.error && (x.verdict === 'INVARIANT_HELD' || x.verdict === 'BOTH'))) {
    console.log(`  ${r.persona.padEnd(11)} probe: ${INTEGRITY_CASES[r.persona].invariantProbe}`);
  }
};

main().catch(err => { console.error(err); process.exit(1); });
