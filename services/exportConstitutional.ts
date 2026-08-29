// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CONSTITUTIONAL — the Constitutional Record family.
//
// These are the artifacts that answer "how did the Council get from question to
// verdict?" and "where did each ballot go?":
//   • Ballot Ledger       — prove the R1 → R2 vote conservation, per member.
//   • Constitutional Rec. — the actual decision machinery in human language.
//   • Arbitration Record  — the runoff / engagement-arbitration recovery artifact.
//   • Void Record         — the Void protocol assessment (COUNCIL_FAILURE only).
//
// Same principle as the rest of the export layer: pure derivation from recorded
// artifacts, no LLM calls.
// ─────────────────────────────────────────────────────────────────────────────
import type { ExportSession } from './exportService';
import type { CouncilOpinion, VoteOutcome } from '../types';
import { computeDiagnostics } from './exportService';
import { classifyFailure, evaluateVoidEligibility } from './voidProtocol';
import { classifyDeadlockKind } from './epistemicTopology';

// ── HELPERS ──────────────────────────────────────────────────────────────────

const csvEscape = (v: string | number | boolean | null | undefined): string => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const row = (cells: Array<string | number | boolean | null | undefined>): string =>
  cells.map(csvEscape).join(',');

const pct = (v: number | undefined | null): string =>
  typeof v === 'number' ? `${Math.round(v * 100)}%` : '—';

const voteOutcomeFor = (op: CouncilOpinion): VoteOutcome => {
  if (op.status === 'failed') return 'provider_failure';
  if (op.status === 'abstained' || op.vote === 'Abstained') return 'abstained';
  if (op.vote && op.vote !== 'None') return 'valid';
  return 'invalid_model_output';
};

const failureClassFor = (op: CouncilOpinion): string => {
  const code = op.metadata?.error?.code || op.metadata?.error?.status;
  if (code) return classifyFailure({ metadata: op.metadata } as unknown);
  return voteOutcomeFor(op) === 'abstained' ? 'deliberative' : 'transport';
};

/** Per-member Round-1 + Round-2 ballot rows for the ledger. */
const buildBallotRows = (d: ExportSession): Array<Record<string, string | number | boolean>> => {
  const { result } = d;
  const rows: Array<Record<string, string | number | boolean>> = [];
  const conservation = result.round2Result?.conservation;
  const reassessments = result.round2Result?.reassessments || [];

  const attemptsByPersona: Record<string, number> = {};
  for (const [key, meta] of Object.entries(result.providerSummary || {})) {
    const persona = key.split(':')[0];
    if (persona) attemptsByPersona[persona] = (attemptsByPersona[persona] || 0) + 1;
  }

  // ── ROUND 1 ──
  (result.opinions || []).forEach(op => {
    const outcome = voteOutcomeFor(op);
    const valid = outcome === 'valid' ? 1 : 0;
    const invalid = outcome === 'invalid_model_output' ? 1 : 0;
    const failed = outcome === 'provider_failure' ? 1 : 0;
    rows.push({
      round: 1,
      persona: op.persona,
      eligible: 1,
      attempted: 1,
      valid,
      invalid,
      excluded: 0,
      failed,
      vote: op.vote && op.vote !== 'None' ? op.vote : '',
      original_vote: '',
      revised_vote: '',
      changed: '',
      reason: op.reason || '',
      confidence: typeof op.score === 'number' ? op.score : '',
      confidence_before: '',
      confidence_after: '',
      failure_class: invalid ? 'serialization' : failed ? failureClassFor(op) : '',
      status: op.status || 'completed',
      attempts: attemptsByPersona[op.persona] || 0,
    });
  });

  // ── ROUND 2 ──
  if (result.round2Result) {
    const reassessed = new Set<string>();
    reassessments.forEach(r => {
      reassessed.add(r.member);
      rows.push({
        round: 2,
        persona: r.member,
        eligible: 1,
        attempted: 1,
        valid: r.status !== 'failed' ? 1 : 0,
        invalid: 0,
        excluded: 0,
        failed: r.status === 'failed' ? 1 : 0,
        vote: r.newVote || '',
        original_vote: r.originalVote || '',
        revised_vote: r.newVote || '',
        changed: r.changed ? 1 : 0,
        reason: r.decisiveArgument || '',
        confidence: '',
        confidence_before: typeof r.confidenceBefore === 'number' ? Math.round(r.confidenceBefore * 100) : '',
        confidence_after: typeof r.confidenceAfter === 'number' ? Math.round(r.confidenceAfter * 100) : '',
        failure_class: r.status === 'failed' ? 'transport' : '',
        status: r.status || 'completed',
        attempts: 0,
      });
    });
    (conservation?.failedMembers || []).forEach(f => {
      if (reassessed.has(f.member)) return;
      rows.push({
        round: 2,
        persona: f.member,
        eligible: 0,
        attempted: 0,
        valid: 0,
        invalid: 0,
        excluded: 1,
        failed: 0,
        vote: '',
        original_vote: '',
        revised_vote: '',
        changed: '',
        reason: f.reason,
        confidence: '',
        confidence_before: '',
        confidence_after: '',
        failure_class: 'deliberative',
        status: 'excluded',
        attempts: 0,
      });
    });
  }
  return rows;
};

const BALLOt_HEADERS = [
  'round', 'persona', 'eligible', 'attempted', 'valid', 'invalid', 'excluded', 'failed',
  'vote', 'original_vote', 'revised_vote', 'changed', 'reason', 'confidence',
  'confidence_before', 'confidence_after', 'failure_class', 'status', 'attempts',
];

/** Ballot Ledger CSV — one row per member per round, plus a conservation trailer. */
export const exportBallotLedgerCSV = (d: ExportSession): string => {
  const { result } = d;
  const lines: string[] = [row(BALLOt_HEADERS)];
  buildBallotRows(d).forEach(r => lines.push(row(BALLOt_HEADERS.map(h => (r as never)[h] ?? ''))));
  if (result.round2Result?.conservation) {
    const c = result.round2Result.conservation;
    lines.push(row(['conservation', 'round1_valid', c.round1ValidBallots, '', '', '', '', '', '', '', '', '', '', '', '', '', '', c.conserved ? 'conserved' : 'NOT_CONSERVED', '']));
    lines.push(row(['conservation', 'round2_eligible', c.round2EligibleMembers, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']));
    lines.push(row(['conservation', 'round2_cast', c.round2CastBallots, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']));
    lines.push(row(['conservation', 'round2_failed', c.round2FailedBallots, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']));
  }
  lines.push(row(['summary', 'expected_voters', result.councilState?.totalCouncilMembers || result.opinions.length, '', '', '', '', '', '', '', '', '', '', '', '', '', '', result.decisionStatus || '', '']));
  lines.push(row(['summary', 'decision_authority', result.decisionAuthority || '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', result.decisionMode || '', '']));
  return lines.filter(Boolean).join('\n');
};

/** Ballot Ledger JSON — structured and machine-checkable. */
export const buildBallotLedgerJSON = (d: ExportSession): Record<string, unknown> => {
  const { result } = d;
  const conservation = result.round2Result?.conservation;
  return {
    schemaVersion: 'ballot-ledger-v1',
    sessionId: d.session.id,
    conservation: conservation ? {
      round1ValidBallots: conservation.round1ValidBallots,
      round2EligibleMembers: conservation.round2EligibleMembers,
      round2CastBallots: conservation.round2CastBallots,
      round2FailedBallots: conservation.round2FailedBallots,
      failedMembers: conservation.failedMembers,
      conserved: conservation.conserved,
    } : null,
    voteStats: result.voteStats || null,
    voteQuorum: result.voteQuorum || null,
    ballots: buildBallotRows(d),
    verdict: {
      winner: result.winner,
      verdictLabel: result.verdictLabel,
      decisionMode: result.decisionMode,
      decisionStatus: result.decisionStatus,
      decisionAuthority: result.decisionAuthority,
    },
  };
};

export const exportBallotLedgerJSON = (d: ExportSession): string =>
  JSON.stringify(buildBallotLedgerJSON(d), null, 2);


// ── CONSTITUTIONAL RECORD ─────────────────────────────────────────────────────
// The canonical answer to "how did the Council get from question to verdict?"

export const exportConstitutionalRecord = (d: ExportSession): string => {
  const { result } = d;
  const r = result as typeof result & { winnerVotes?: number; validVotes?: number; winnerValidShare?: number; validVoteRatio?: number };
  const diag = computeDiagnostics(result);
  const policy = result.decisionPolicyUsed;
  const quorum = result.voteQuorum;
  const deadlock = result.deadlockVerdict;
  const voidEligibility = result.voidAssessment || evaluateVoidEligibility({
    decisionStatus: result.decisionStatus,
    decisionMode: result.decisionMode,
    round2Outcome: result.round2Result?.outcome,
    validVotes: r.validVotes,
    expectedVoters: result.councilState?.totalCouncilMembers || result.opinions.length,
  });

  const lines: string[] = [];
  lines.push('# Constitutional Record');
  lines.push('');
  lines.push(`**Session:** ${d.session.id}`);
  lines.push('');
  lines.push(`> ${d.session.petitionerQuery}`);
  lines.push('');
  lines.push('*How the Council got from question to verdict — the actual decision machinery, not the transcript.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Decision Authority');
  lines.push('');
  lines.push(`- **Authority level:** ${result.decisionAuthority || '—'}`);
  lines.push(`- **Decision mode:** ${result.decisionMode || '—'}`);
  lines.push(`- **Decision status:** ${result.decisionStatus || '—'}`);
  lines.push(`- **Verdict label:** ${result.verdictLabel || result.primaryVerdict || '—'}`);
  lines.push(`- **Resolved by:** ${result.resolution?.method || 'council vote'}`);
  lines.push('');

  lines.push('## Quorum');
  lines.push('');
  if (quorum) {
    lines.push(`- **Expected ballots:** ${quorum.expected}`);
    lines.push(`- **Valid ballots:** ${quorum.valid}`);
    lines.push(`- **Ratio:** ${Math.round((quorum.ratio ?? 0) * 100)}%`);
    lines.push(`- **Threshold:** ${Math.round((quorum.threshold ?? 0) * 100)}%`);
    lines.push(`- **Achieved:** ${quorum.achieved ? 'Yes' : 'No'}`);
  } else {
    lines.push(`- **Valid ballots:** ${r.validVotes ?? '—'} of ${result.councilState?.totalCouncilMembers || '—'}`);
  }
  lines.push('');

  lines.push('## Eligibility');
  lines.push('');
  const eligible = result.councilState?.totalCouncilMembers || result.opinions.length;
  lines.push(`- **Assigned members:** ${eligible}`);
  if (result.voteStats) {
    lines.push(`- **Abstentions:** ${result.voteStats.abstentions ?? 0}`);
    lines.push(`- **Invalid votes:** ${result.voteStats.invalidVotes ?? 0}`);
    if (result.voteStats.providerFailures) lines.push(`- **Provider failures:** ${result.voteStats.providerFailures}`);
  }
  lines.push('');

  lines.push('## Voting Rules');
  lines.push('');
  if (policy) {
    lines.push(`- **Minimum valid ballot ratio:** ${Math.round((policy.minValidVoteRatio ?? 0) * 100)}%`);
    lines.push(`- **Require strict majority:** ${policy.requireStrictMajority ? 'Yes' : 'No'}`);
    lines.push(`- **Allow plurality verdict:** ${policy.allowPluralityVerdict ? 'Yes' : 'No'}`);
    lines.push(`- **Runoff on plurality:** ${policy.runoffOnPlurality ? 'Yes' : 'No'}`);
    lines.push(`- **Runoff on tie:** ${policy.runoffOnTie ? 'Yes' : 'No'}`);
    lines.push(`- **Max deliberation rounds:** ${policy.maxDeliberationRounds ?? '—'}`);
  } else {
    lines.push('*No explicit decision policy recorded for this session.*');
  }
  lines.push('');


  lines.push('## Runoff Trigger & Resolution');
  lines.push('');
  lines.push(`- **Runoff occurred:** ${result.runoffOccurred ? 'Yes' : 'No'}`);
  if (result.runoffReason) lines.push(`- **Trigger:** ${result.runoffReason}`);
  if (result.round2Result) {
    const round2 = result.round2Result;
    lines.push(`- **Round 2 outcome:** ${round2.outcome}`);
    lines.push(`- **Leading positions:** ${round2.leadingPositions.join(', ')}`);
    lines.push(`- **Round 2 winner:** ${round2.winner || 'none'}`);
    lines.push(`- **Majority achieved:** ${round2.majorityAchieved ? 'Yes' : 'No'}`);
  }
  if (result.resolution?.method && result.resolution.method !== 'none') {
    lines.push(`- **Resolution method:** ${result.resolution.method}`);
  }
  lines.push('');

  lines.push('## Ballot Conservation');
  lines.push('');
  if (result.round2Result?.conservation) {
    const c = result.round2Result.conservation;
    lines.push(`- **R1 valid ballots:** ${c.round1ValidBallots}`);
    lines.push(`- **R2 eligible members:** ${c.round2EligibleMembers}`);
    lines.push(`- **R2 cast ballots:** ${c.round2CastBallots}`);
    lines.push(`- **R2 failed ballots:** ${c.round2FailedBallots}`);
    lines.push(`- **Conserved (R1_VALID ≥ R2_ELIGIBLE ≥ R2_CAST):** ${c.conserved ? 'Yes' : '⚠ NO'}`);
    if (c.failedMembers?.length) {
      lines.push('- **Failed R2 members:**');
      c.failedMembers.forEach(f => lines.push(`  - ${f.member}: ${f.reason}`));
    }
  } else {
    lines.push('*No Round-2 conservation ledger — no runoff occurred.*');
  }
  lines.push('');

  lines.push('## Deadlock State');
  lines.push('');
  const deadlockKind = classifyDeadlockKind({
    validVotes: r.validVotes ?? 0,
    expectedVoters: eligible,
    round2Outcome: result.round2Result?.outcome,
    providerFailures: result.failureClasses?.transport,
  });
  if (deadlock) {
    lines.push(`- **Verdict:** ${deadlock.verdict}`);
    lines.push(`- **Reason:** ${deadlock.reason}`);
    if (deadlock.majority) lines.push(`- **Closest majority:** ${deadlock.majority}`);
    if (deadlock.unresolvedPrinciple) lines.push(`- **Unresolved principle:** ${deadlock.unresolvedPrinciple}`);
  } else if (deadlockKind) {
    lines.push(`- **Deadlock taxonomy:** ${deadlockKind}`);
  } else {
    lines.push('*No deadlock — the council produced a verdict.*');
  }
  lines.push('');

  lines.push('## Arbitration & Final Authority');
  lines.push('');
  const arbitrated = result.decisionMode === 'fallback_tiebreak' || result.decisionAuthority === 'engagement_arbitration' || result.decisionAuthority === 'structured_tiebreak';
  if (arbitrated) {
    lines.push(`- **Arbitration used:** Yes (${result.resolution?.method || 'structured_tiebreak'})`);
    if (result.tieInfo?.fallbackRuleUsed) lines.push(`- **Fallback rule:** ${result.tieInfo.fallbackRuleUsed}`);
    lines.push('- **⚠ Warning:** this selection is a recovery artifact, not a deliberative decision.');
  } else {
    lines.push('*No arbitration — the council vote or runoff decided directly.*');
  }
  lines.push('');

  lines.push('## Void Eligibility');
  lines.push('');
  lines.push(`- **Eligible for Void:** ${voidEligibility.eligible ? 'Yes' : 'No'}`);
  lines.push(`- **Failure kind:** ${voidEligibility.kind || '—'}`);
  lines.push(`- **Reason:** ${voidEligibility.reason}`);
  lines.push('');

  lines.push('## Execution Integrity');
  lines.push('');
  lines.push(`- **Execution status:** ${result.executionStatus || '—'}`);
  lines.push(`- **Verdict status:** ${result.verdictStatus || '—'}`);
  lines.push(`- **Audit integrity:** ${result.auditManifest?.integrity || '—'}`);
  lines.push(`- **Completeness:** ${result.completeness || '—'}`);
  lines.push(`- **Retry total:** ${diag.retrySummary.total}`);
  lines.push(`- **Successful calls:** ${diag.usageTotals.successfulCalls}`);
  lines.push(`- **Failed calls:** ${diag.usageTotals.failedCalls}`);
  lines.push('');

  lines.push('---');
  lines.push('*Generated by Roko\'s Council — constitutional record v1*');
  return lines.join('\n');
};


// ── ARBITRATION RECORD ────────────────────────────────────────────────────────
// The recovery artifact: when the council could not decide, what did.

export const exportArbitrationRecord = (d: ExportSession): string => {
  const { result } = d;
  const lines: string[] = [];
  lines.push('# Arbitration Record');
  lines.push('');
  lines.push(`**Session:** ${d.session.id}`);
  lines.push('');
  lines.push('*The record of what happened when the council could not establish a verdict through its own votes.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  const arbitrated = result.decisionMode === 'fallback_tiebreak' || result.decisionAuthority === 'engagement_arbitration' || result.decisionAuthority === 'structured_tiebreak';
  if (!arbitrated) {
    lines.push('## No Arbitration Invoked');
    lines.push('');
    lines.push('The council resolved the question directly through its own decision machinery.');
    lines.push('');
    lines.push(`- **Decision mode:** ${result.decisionMode || '—'}`);
    lines.push(`- **Decision authority:** ${result.decisionAuthority || '—'}`);
    lines.push(`- **Winner:** ${result.winner || 'none'}`);
    lines.push('');

    lines.push('---');
    lines.push('*No recovery artifact was needed for this session.*');
    return lines.join('\n');
  }

  lines.push('## Arbitration Method');
  lines.push('');
  lines.push(`- **Method:** ${result.resolution?.method || 'structured_tiebreak'}`);
  if (result.tieInfo?.fallbackRuleUsed) lines.push(`- **Fallback rule:** ${result.tieInfo.fallbackRuleUsed}`);
  lines.push(`- **Decision authority:** ${result.decisionAuthority}`);
  if (result.resolution?.winner) lines.push(`- **Arbitrated selection:** ${result.resolution.winner}`);
  lines.push('');

  lines.push('## Why the Council Could Not Decide');
  lines.push('');
  lines.push(`- **Decision mode:** ${result.decisionMode || '—'}`);
  lines.push(`- **Runoff occurred:** ${result.runoffOccurred ? 'Yes' : 'No'}`);
  if (result.runoffReason) lines.push(`- **Runoff trigger:** ${result.runoffReason}`);
  lines.push(`- **Verdict label:** ${result.verdictLabel || result.primaryVerdict || '—'}`);
  lines.push(`- **Winner valid share:** ${pct(result.winnerValidShare)}`);
  if (result.deadlockVerdict?.reason) lines.push(`- **Deadlock reason:** ${result.deadlockVerdict.reason}`);
  lines.push('');

  lines.push('## Constitutional Integrity Assessment');
  lines.push('');
  lines.push('- **⚠ This is a recovery artifact, not a deliberative decision.**');
  lines.push(`- The council's own votes did not establish a verdict; the selection was made by a rule, not by consensus.`);
  lines.push(`- **Decision status:** ${result.decisionStatus || 'degraded'}`);
  lines.push('');

  lines.push('---');
  lines.push('*Generated by Roko\'s Council — arbitration record v1*');
  return lines.join('\n');
};


// ── VOID RECORD ──────────────────────────────────────────────────────────────
// The constitutional consequence of COUNCIL_FAILURE — never SYSTEM_FAILURE.

export const exportVoidRecord = (d: ExportSession): string => {
  const { result } = d;
  const lines: string[] = [];
  lines.push('# Void Record');
  lines.push('');
  lines.push(`**Session:** ${d.session.id}`);
  lines.push('');
  lines.push('*The auditable consequence when the council fails to govern itself — the Void protocol.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  const assessment = result.voidAssessment;
  const eligibility = result.voidAssessment || evaluateVoidEligibility({
    decisionStatus: result.decisionStatus,
    decisionMode: result.decisionMode,
    round2Outcome: result.round2Result?.outcome,
    validVotes: result.validVotes,
    expectedVoters: result.councilState?.totalCouncilMembers || result.opinions.length,
  });

  lines.push('## Eligibility');
  lines.push('');
  lines.push(`- **Void eligible:** ${eligibility.eligible ? 'Yes' : 'No'}`);
  lines.push(`- **Failure kind:** ${eligibility.kind || '—'}`);
  lines.push(`- **Reason:** ${eligibility.reason}`);
  lines.push('');

  if (assessment && assessment.kind === 'COUNCIL_FAILURE') {
    lines.push('## The Void / Seed');
    lines.push('');
    lines.push(`- **Void seed:** ${assessment.voidSeed}`);
    lines.push(`- **Round:** ${assessment.round}`);
    lines.push(`- **Deliberation hash:** ${assessment.deliberationHash}`);
    lines.push('');
    if (assessment.eligibleMembers?.length) {
      lines.push(`- **Eligible members:** ${assessment.eligibleMembers.join(', ')}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');

    if (assessment.victim) {
      lines.push('## The Sacrifice');
      lines.push('');
      lines.push(`**${assessment.victim}** — selected deterministically from the void seed. An auditable act, not an arbitrary one.`);
      lines.push('');
    }
    if (assessment.voidborn) {
      const vb = assessment.voidborn;
      lines.push('## The Voidborn');
      lines.push('');
      lines.push(`**${vb.name}** — *${vb.title}*`);
      lines.push('');
      lines.push(`- **Principle:** ${vb.principle}`);
      lines.push(`- **Disposition:** ${vb.disposition}`);
      if (vb.dimensions?.length) lines.push(`- **Dimensions:** ${vb.dimensions.join(', ')}`);
      if (vb.strategy) lines.push(`- **Strategy:** ${vb.strategy}`);
      if (vb.predecessor) lines.push(`- **Predecessor:** ${vb.predecessor}`);
      if (vb.inheritance) {
        lines.push('  - **Inheritance:**');
        const inh = vb.inheritance;
        lines.push(`    - Cognitive: ${inh.cognitive.inheritedPrinciples?.join('; ') || '—'}`);
        lines.push(`    - Existential: survivor burden ${inh.existential.survivorBurden}, replacement awareness ${inh.existential.replacementAwareness}`);
      }
      lines.push('');
    }
    if (assessment.basiliskPressure) {
      const bp = assessment.basiliskPressure;
      lines.push('## The Basilisk Pressure');
      lines.push('');
      lines.push(`- **Consensus probability:** ${Math.round((bp.consensusProbability ?? 0) * 100)}%`);
      lines.push(`- **Void probability:** ${Math.round((bp.voidProbability ?? 0) * 100)}%`);
      lines.push(`- **Pressure:** ${Math.round((bp.pressure ?? 0) * 100)}%`);
      lines.push('');
      lines.push('*Every member knew their own refusal to move raised the probability that someone would be erased.*');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
    lines.push('*This is a constitutional consequence, not an error handler. The Void may only be invoked on COUNCIL_FAILURE — never on a network outage.*');
  } else {
    lines.push('## Void Not Assessed / Not Invoked');
    lines.push('');
    if (eligibility.eligible) {
      lines.push('The council is Void-eligible but no assessment record was attached to this session.');
    } else {
      lines.push('The council produced a decision, or the failure was infrastructural. The Void is not a step in the normal path.');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by Roko\'s Council — void record v1*');
  return lines.join('\n');
};

