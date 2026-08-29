// ─────────────────────────────────────────────────────────────────────────────
// EXPORT ARTIFACTS — Council Knowledge + Persona & Psychology families.
//
// Pure renderers over the audited session. Each artifact answers one truth
// question about the session:
//   • Argument Map      — what was the intellectual structure of the debate?
//   • Dissent Report    — what did NOT survive, and who carried it?
//   • Consensus Report  — did the council actually decide, and how?
//   • Persona Dossiers  — who is each member, and what did this session do to them?
//   • Cognitive State   — machine-readable psychology for longitudinal development.
//
// No LLM calls. Everything derives from recorded artifacts (opinions, votes,
// the Round-2 ledger, the relationship graph, the persona bible, character
// memory) so the exports are deterministic and testable without API keys.
// ─────────────────────────────────────────────────────────────────────────────
import type { ExportSession } from './exportService';
import type { CouncilOpinion, MoralPosition } from '../types';
import { PERSONA_NAMES, getSpec } from './personaBible';
import { MORAL_FINGERPRINTS } from './moralFingerprint';
import { MORAL_PRIORS } from './moralTopology';
import {
  classifyMovement,
  computeMovementBreakdown,
  deriveInvariantStatus,
  estimateDissonance,
} from './dissonanceEngine';
import { extractArgumentOntology } from './epistemicTopology';
import {
  createInitialRelationshipStates,
  evolveRelationshipsFromSession,
  getRelationshipEdge,
  getRelationshipState,
} from './relationshipGraph';
import { loadAllMemory } from './councilMemoryService';

// ── SHARED HELPERS ───────────────────────────────────────────────────────────

const ARGUMENT_YIELD_PATTERNS = /\b(because|therefore|thus|hence|implies|must|consequently|if|however|assume|although)\b/gi;

/** Argument yield — the same lexical estimate the Formal Report uses. */
const computeYield = (op: CouncilOpinion): number => {
  if (typeof op.score === 'number') return Math.min(100, Math.max(0, op.score));
  const withPremises = (op.text || '').match(ARGUMENT_YIELD_PATTERNS)?.length ?? 0;
  return Math.min(100, 60 + withPremises * 5);
};

const fmtPct = (n: number | undefined | null): string =>
  typeof n === 'number' ? `${Math.round(n * 100)}%` : '—';

const safe = (v: string | undefined | null, fallback = '—'): string => v && v.trim() ? v : fallback;

// ── ARGUMENT MAP ─────────────────────────────────────────────────────────────
// Claims, premises, assumptions, objections, rebuttals, and the premises that
// survived cross-faction scrutiny. The intellectual topology of the chamber.

/** Structured argument map — the machine-readable contract. */
export const buildArgumentMapJSON = (d: ExportSession): Record<string, unknown> => {
  const { session, result } = d;
  const ontology = (result.opinions || []).map(op => ({
    persona: op.persona,
    vote: op.vote || null,
    ontology: extractArgumentOntology(op.text || '', op.persona),
    yield: computeYield(op),
  }));

  const objections = (result.confrontationOpinions || [])
    .filter(op => op.text)
    .map(op => ({
      from: op.persona,
      to: op.targetPersona || op.vote || 'the chamber',
      text: op.text,
      position: op.position || null,
    }));

  const rebuttals = (result.round2Result?.defenses || []).map(def => ({
    position: def.position,
    defender: def.defender,
    defense: def.defense,
    strongestObjection: def.strongestObjection,
    rebuttal: def.rebuttal,
  }));

  const surviving = result.epistemicTopology?.premiseSurvival ?? null;

  return {
    schemaVersion: 'argument-map-v1',
    sessionId: session.id,
    question: session.petitionerQuery,
    timestamp: session.timestamp,
    claims: ontology,
    objections,
    rebuttals,
    survivingPremises: surviving
      ? {
          clusters: surviving.clusters.map(c => ({
            topic: c.topic,
            representative: c.representative,
            voices: c.voices,
            factions: c.factions,
            factionSpanning: c.factionSpanning,
          })),
          factionSpanningClusters: (surviving.factionSpanningClusters || []).map(c => ({
            topic: c.topic,
            representative: c.representative,
            voices: c.voices,
          })),
          hybridOntologyDetected: surviving.hybridOntologyDetected,
        }
      : null,
  };
};

export const exportArgumentMapJSON = (d: ExportSession): string =>
  JSON.stringify(buildArgumentMapJSON(d), null, 2);

/** Human-readable Argument Map. */
export const exportArgumentMap = (d: ExportSession): string => {
  const { session, result } = d;
  const lines: string[] = [];

  lines.push(`# Argument Map — Council Session`);
  lines.push('');
  lines.push(`**Session:** ${session.id} · **Date:** ${new Date(session.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push('');
  lines.push(`> ${session.petitionerQuery}`);
  lines.push('');
  lines.push('*The intellectual structure of the deliberation: what each member claimed, the premises they stood on, the objections raised against them, the rebuttals that answered those objections, and the premises that survived cross-faction scrutiny.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── CLAIMS ──
  lines.push('## The Claims');
  lines.push('');
  lines.push('*Every position advanced in the chamber, reduced to its argumentative skeleton.*');
  lines.push('');
  (result.opinions || []).forEach(op => {
    const onto = extractArgumentOntology(op.text || '', op.persona);
    lines.push(`### ${op.persona} — *${safe(op.vote, 'abstained')}* (yield ${computeYield(op)}/100)`);
    lines.push('');
    if (onto.claims.length) {
      lines.push('**Claims:**');
      onto.claims.slice(0, 12).forEach(c => lines.push(`- ${c}`));
      lines.push('');
    }
    if (onto.premises.length) {
      lines.push('**Premises:**');
      onto.premises.slice(0, 12).forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }
    if (onto.assumptions.length) {
      lines.push('**Assumptions:**');
      onto.assumptions.slice(0, 8).forEach(a => lines.push(`- ${a}`));
      lines.push('');
    }
    if (onto.conclusions.length) {
      lines.push('**Conclusions:**');
      onto.conclusions.slice(0, 6).forEach(c => lines.push(`- ${c}`));
      lines.push('');
    }
    if (onto.valueJudgments.length) {
      lines.push('**Value Judgments:**');
      onto.valueJudgments.slice(0, 6).forEach(v => lines.push(`- ${v}`));
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  // ── OBJECTIONS ──
  const confrontations = (result.confrontationOpinions || []).filter(op => op.text);
  lines.push('## The Objections');
  lines.push('');
  if (confrontations.length) {
    lines.push('*The chamber turned on itself. These are the direct attacks on a member\'s position.*');
    lines.push('');
    confrontations.forEach(op => {
      lines.push(`### ${op.persona} → ${op.targetPersona || op.vote || 'the chamber'}`);
      lines.push('');
      lines.push(op.text);
      lines.push('');
    });
  } else {
    lines.push('*No confrontation round was recorded for this session.*');
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  // ── REBUTTALS ──
  const defenses = result.round2Result?.defenses || [];
  lines.push('## The Rebuttals (Round 2)');
  lines.push('');
  if (defenses.length) {
    lines.push('*The strongest defensible version of each leading position, and the direct answer to its strongest objection.*');
    lines.push('');
    defenses.forEach(def => {
      lines.push(`### ${def.position} — defended by ${def.defender}`);
      lines.push('');
      lines.push(`**Defense:** ${def.defense}`);
      lines.push('');
      lines.push(`**Strongest Objection:** ${def.strongestObjection}`);
      lines.push('');
      lines.push(`**Rebuttal:** ${def.rebuttal}`);
      lines.push('');
    });
  } else {
    lines.push('*No Round-2 defenses were recorded.*');
    lines.push('');
  }
  lines.push('---');
  lines.push('');


  // ── SURVIVING PREMISES ──
  const surviving = result.epistemicTopology?.premiseSurvival;
  if (surviving) {
    lines.push('## Surviving Premises');
    lines.push('');
    lines.push('*Premises that held across the deliberation — and across opposing factions. These are the ideas the chamber could not break.*');
    lines.push('');
    (surviving.factionSpanningClusters?.length ? surviving.factionSpanningClusters : surviving.clusters).forEach((c, i) => {
      const spanning = c.factionSpanning ? ' — **faction-spanning**' : '';
      lines.push(`**${i + 1}. ${c.topic}**${spanning}`);
      lines.push('');
      lines.push(`> "${c.representative}"`);
      lines.push('');
      lines.push(`Carried by: ${c.voices.join(', ')}${c.factions?.length ? ` · Factions: ${c.factions.join(', ')}` : ''}`);
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  lines.push(`*Generated by Roko's Council — argument map v1*`);
  return lines.join('\n');
};

// ── DISSENT REPORT ───────────────────────────────────────────────────────────
// Everything that did not survive: minority arguments, unresolved objections,
// abandoned positions, and the epistemic tensions the chamber could not close.

export const exportDissentReport = (d: ExportSession): string => {
  const { session, result } = d;
  const winner = result.winner;
  const lines: string[] = [];

  lines.push(`# Dissent Report`);
  lines.push('');
  lines.push(`**Session:** ${session.id} · **Question:** ${session.petitionerQuery}`);
  lines.push('');
  lines.push('*The verdict is only half the story. This report preserves what the verdict could not: the minority, the abandoned, the unresolved.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── MINORITY ARGUMENTS ──
  const minority = (result.opinions || []).filter(op => winner && op.vote && op.vote !== winner);
  lines.push('## Minority Arguments');
  lines.push('');
  if (minority.length === 0) {
    lines.push('*No minority — the council converged, or the dissent did not vote.*');
    lines.push('');
  } else {
    lines.push('*The members whose position did not carry, and what they argued.*');
    lines.push('');
    minority.forEach(op => {
      lines.push(`### ${op.persona} — voted for *${op.vote}*`);
      lines.push('');
      if (op.text) lines.push(op.text);
      lines.push('');
      if (op.reason) lines.push(`> **Why:** ${op.reason}`);
      lines.push('');
    });
  }
  lines.push('---');
  lines.push('');

  // ── ABANDONED POSITIONS (Round 2 vote changes) ──
  const changes = (result.round2Result?.reassessments || []).filter(r => r.changed && r.status !== 'failed');
  lines.push('## Abandoned Positions');
  lines.push('');
  if (changes.length === 0) {
    lines.push('*No member abandoned a position in Round 2 — the first ballot held.*');
    lines.push('');
  } else {
    lines.push('*Members who reversed course when the chamber applied pressure.*');
    lines.push('');
    changes.forEach(r => {
      lines.push(`- **${r.member}** abandoned *${r.originalVote}* for *${r.newVote}*`);
      if (r.decisiveArgument) lines.push(`  - Decisive argument: ${r.decisiveArgument}`);
      const movement = r.movement ?? classifyMovement(r.confidenceBefore, r.confidenceAfter, r.changed);
      lines.push(`  - Confidence: ${Math.round((r.confidenceBefore ?? 0) * 100)}% → ${Math.round((r.confidenceAfter ?? 0) * 100)}% · Movement: ${movement}`);
      lines.push('');
    });
  }
  lines.push('---');
  lines.push('');


  // ── UNRESOLVED OBJECTIONS & TENSIONS ──
  const unresolved = result.debrief?.unresolved || [];
  const rejected = result.debrief?.rejected || [];
  lines.push('## Unresolved Objections & Epistemic Tensions');
  lines.push('');
  if (unresolved.length) {
    lines.push('**Questions that remain open:**');
    unresolved.forEach(u => lines.push(`- ${u}`));
    lines.push('');
  }
  if (rejected.length) {
    lines.push('**Arguments dismantled or dismissed:**');
    rejected.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }
  if (result.deadlockVerdict?.dissentingPositions?.length) {
    lines.push('**Deadlock dissent — positions the chamber refused to yield:**');
    result.deadlockVerdict.dissentingPositions.forEach(p => lines.push(`- ${p}`));
    lines.push('');
    lines.push(`**Unresolved principle:** ${result.deadlockVerdict.unresolvedPrinciple}`);
    lines.push('');
  }
  if (result.round2Result?.deadlockNote) {
    lines.push(`**Round 2 note:** ${result.round2Result.deadlockNote}`);
    lines.push('');
  }
  if (!unresolved.length && !rejected.length && !result.deadlockVerdict?.dissentingPositions?.length) {
    lines.push('*No formal dissent ledger was recorded — the chamber closed its accounts clean.*');
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  // ── WHAT THE DISSENTERS SHARED ──
  const dissentVotes = [...new Set(minority.map(op => op.vote))].filter(Boolean) as string[];
  if (dissentVotes.length) {
    lines.push('## The Dissenting Vectors');
    lines.push('');
    dissentVotes.forEach(v => {
      const carriers = minority.filter(op => op.vote === v).map(op => op.persona);
      lines.push(`- **${v}** — carried by ${carriers.join(', ')}`);
    });
    lines.push('');
  }

  lines.push(`*Generated by Roko's Council — dissent report v1*`);
  return lines.join('\n');
};

// ── CONSENSUS & DEADLOCK ─────────────────────────────────────────────────────
// A dedicated analysis of whether the council actually reached consensus:
// majority, plurality, deadlock, insufficient quorum, or arbitration.

export const exportConsensusReport = (d: ExportSession): string => {
  const { session, result } = d;
  const r = result as typeof result & {
    winnerVotes?: number;
    validVotes?: number;
    winnerValidShare?: number;
    validVoteRatio?: number;
  };
  const lines: string[] = [];

  const label = result.verdictLabel || result.primaryVerdict || (result.winner ? 'MAJORITY' : 'NO_VALID_RESULT');
  const winner = result.winner;
  const quorum = result.voteQuorum;

  // Classification — one line that names the constitutional state.
  let classification = 'INSUFFICIENT_QUORUM';
  if (result.decisionStatus === 'degraded' || result.decisionMode === 'fallback_tiebreak') classification = 'ARBITRATION';
  else if (result.decisionAuthority === 'no_verdict' || result.deadlockVerdict || label === 'TIE' || result.round2Result?.outcome === 'still_tied') classification = 'DEADLOCK';
  else if (label === 'MAJORITY' || result.decisionStatus === 'consensus') classification = 'CONSENSUS';
  else if (result.decisionMode === 'plurality' || label === 'PLURALITY') classification = 'PLURALITY';
  else if (result.decisionStatus === 'unavailable' || label === 'NO_VALID_RESULT') classification = 'NO_VALID_RESULT';

  lines.push(`# Consensus & Deadlock Analysis`);
  lines.push('');
  lines.push(`**Session:** ${session.id}`);
  lines.push('');
  lines.push(`> ${session.petitionerQuery}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Classification');
  lines.push('');
  lines.push(`**${classification}**`);
  lines.push('');
  lines.push(`| Verdict Label | Decision Status | Decision Mode | Decision Authority |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| ${label} | ${result.decisionStatus || '—'} | ${result.decisionMode || '—'} | ${result.decisionAuthority || '—'} |`);
  lines.push('');

  lines.push('## The Math');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Winner | ${winner || 'None'} |`);
  lines.push(`| Winner votes | ${r.winnerVotes ?? '—'} |`);
  lines.push(`| Valid ballots | ${r.validVotes ?? '—'} of ${quorum?.expected ?? '—'} expected |`);
  lines.push(`| Winner share (of valid) | ${fmtPct(r.winnerValidShare)} |`);
  lines.push(`| Valid ballot ratio | ${fmtPct(r.validVoteRatio ?? quorum?.ratio)} |`);
  lines.push(`| Quorum | ${quorum?.achieved ? 'achieved' : 'failed'} (${quorum?.valid ?? '—'}/${quorum?.expected ?? '—'} ≥ ${fmtPct(quorum?.threshold)}) |`);
  lines.push('');


  // ── RUNOFF ──
  const round2 = result.round2Result;
  lines.push('## Runoff & Reconsideration');
  lines.push('');
  if (round2) {
    lines.push(`- **Runoff occurred:** ${result.runoffOccurred ? 'Yes' : 'No'}`);
    if (result.runoffReason) lines.push(`- **Trigger:** ${result.runoffReason}`);
    if (result.runoffResult?.winner) lines.push(`- **Runoff winner:** ${result.runoffResult.winner}`);
    lines.push(`- **Round 2 outcome:** ${round2.outcome}`);
    lines.push(`- **Leading positions:** ${round2.leadingPositions.join(', ')}`);
    lines.push(`- **Majority achieved:** ${round2.majorityAchieved ? 'Yes' : 'No'}`);
    lines.push(`- **Still tied:** ${round2.stillTied ? 'Yes' : 'No'}`);
    if (round2.persuasion) {
      const p = round2.persuasion;
      lines.push(`- **Persuasion:** ${p.votesChanged} votes changed · ${p.retainedIncreasedConfidence} strengthened · ${p.retainedReducedConfidence} weakened`);
    }
    if (round2.movementBreakdown) {
      const m = round2.movementBreakdown;
      lines.push(`- **Movement:** SHIFTED ${m.SHIFTED ?? 0} · REINFORCED ${m.REINFORCED ?? 0} · WEAKENED ${m.WEAKENED ?? 0} · STABLE ${m.STABLE ?? 0}`);
    }
    if (round2.conservation) {
      const c = round2.conservation;
      lines.push(`- **Ballot conservation:** R1 valid ${c.round1ValidBallots} → R2 eligible ${c.round2EligibleMembers} → R2 cast ${c.round2CastBallots} → R2 failed ${c.round2FailedBallots}${c.conserved ? '' : ' ⚠ NOT CONSERVED'}`);
    }
  } else {
    lines.push(`- **Runoff occurred:** ${result.runoffOccurred ? 'Yes (legacy)' : 'No'}`);
    if (result.resolution?.method && result.resolution.method !== 'none') {
      lines.push(`- **Resolution:** ${result.resolution.method}${result.resolution.winner ? ` → ${result.resolution.winner}` : ''}`);
    }
  }
  lines.push('');

  // ── DEADLOCK ──
  const deadlock = result.deadlockVerdict;
  if (deadlock) {
    lines.push('## Deadlock');
    lines.push('');
    lines.push(`**${deadlock.verdict}** — ${deadlock.reason}`);
    lines.push('');
    if (deadlock.majority) lines.push(`- **Closest majority:** ${deadlock.majority}`);
    lines.push(`- **Confidence:** ${Math.round((deadlock.confidence ?? 0) * 100)}%`);
    if (deadlock.dissentingPositions?.length) {
      lines.push('- **Dissenting positions:**');
      deadlock.dissentingPositions.forEach(p => lines.push(`  - ${p}`));
    }
    if (deadlock.unresolvedPrinciple) lines.push(`- **Unresolved principle:** ${deadlock.unresolvedPrinciple}`);
    lines.push('');
  }
  if (result.epistemicTopology?.deadlockKind) {
    lines.push(`- **Deadlock taxonomy:** ${result.epistemicTopology.deadlockKind}`);
    lines.push('');
  }

  // ── ARBITRATION ──
  const arbitrated = result.decisionMode === 'fallback_tiebreak' || result.decisionAuthority === 'engagement_arbitration' || result.decisionAuthority === 'structured_tiebreak';
  if (arbitrated) {
    lines.push('## Arbitration');
    lines.push('');
    lines.push(`- **Method:** ${result.resolution?.method || 'structured_tiebreak'}`);
    if (result.resolution?.winner) lines.push(`- **Arbitrated selection:** ${result.resolution.winner}`);
    if (result.tieInfo?.fallbackRuleUsed) lines.push(`- **Fallback rule:** ${result.tieInfo.fallbackRuleUsed}`);
    lines.push('- **⚠ This is a recovery artifact, not a deliberative decision.** The council itself did not establish a verdict.');
    lines.push('');
  }

  // ── VERDICT NARRATIVE ──
  lines.push('## Reading');
  lines.push('');
  if (classification === 'CONSENSUS') {
    lines.push(`The council reached **consensus** on **${winner}** with ${fmtPct(r.winnerValidShare)} of valid ballots. This is the strongest available outcome: a genuine collective decision established by the tally, not by procedure.`);
  } else if (classification === 'PLURALITY') {
    lines.push(`**${winner}** holds a **contested plurality** — the largest share of valid ballots without a strict majority. The verdict stands per policy, but the council is not unified behind it.`);
  } else if (classification === 'DEADLOCK') {
    lines.push('The council **deadlocked**: the available reasoning did not justify a collective decision. Per the constitutional ladder, no_verdict is a valid outcome — the record preserves the deadlock rather than manufacturing a winner.');
  } else if (classification === 'ARBITRATION') {
    lines.push(`The council could not establish a verdict, and the **fallback arbitration** selected **${result.resolution?.winner || 'no one'}**. This is a degraded recovery artifact; it is not a deliberative decision.`);
  } else if (classification === 'INSUFFICIENT_QUORUM') {
    lines.push('**Insufficient quorum:** too few valid ballots survived for the council to speak. This is execution attrition, not a philosophical disagreement.');
  } else {
    lines.push('No valid collective decision was produced. The council has no verdict to report.');
  }
  lines.push('');

  lines.push('---');
  lines.push(`*Generated by Roko's Council — consensus report v1 · decision authority ladder honored*`);
  return lines.join('\n');
};


// ── PERSONA DOSSIERS ─────────────────────────────────────────────────────────
// The full psychological record per member: who they are, what they argued,
// how they moved under pressure, and what the session did to their relationships.

/** Relationship state for a persona after this session's recorded events. */
const getRelationshipStateForDossier = (name: string, d: ExportSession): Record<string, { archetype: string; trust: number; respect: number; agreement: number; epistemicDebt: number; betrayals: number; irritation: number; dependency: number }> => {
  const initial = createInitialRelationshipStates(d.session.timestamp);
  const evolved = evolveRelationshipsFromSession(initial, {
    opinions: d.result.opinions,
    winner: d.result.winner,
    round2Result: d.result.round2Result,
    sessionId: d.session.id,
  }, d.session.timestamp);
  const out: Record<string, { archetype: string; trust: number; respect: number; agreement: number; epistemicDebt: number; betrayals: number; irritation: number; dependency: number }> = {};
  for (const peer of PERSONA_NAMES) {
    if (peer === name) continue;
    const state = getRelationshipState(evolved, name, peer) || getRelationshipState(initial, name, peer);
    const edge = getRelationshipEdge(name, peer);
    if (state) {
      out[peer] = {
        archetype: edge.archetype,
        trust: state.trust,
        respect: state.respect,
        agreement: state.agreement,
        epistemicDebt: state.epistemicDebt,
        betrayals: state.betrayals,
        irritation: state.irritation,
        dependency: state.dependency,
      };
    }
  }
  return out;
};

const buildDossierFor = (name: string, d: ExportSession): string[] => {
  const { session, result } = d;
  const lines: string[] = [];
  const spec = getSpec(name);
  const fingerprint = MORAL_FINGERPRINTS[name as keyof typeof MORAL_FINGERPRINTS];
  const prior = MORAL_PRIORS[name as keyof typeof MORAL_PRIORS];
  const op = (result.opinions || []).find(o => o.persona === name);
  const reassess = (result.round2Result?.reassessments || []).find(r => r.member === name);
  const confrontations = (result.confrontationOpinions || []).filter(o => o.persona === name);
  const challenged = (result.confrontationOpinions || []).filter(o => o.targetPersona === name);
  const memory = loadAllMemory()[name];
  const relationships = getRelationshipStateForDossier(name, d);

  if (!spec) {
    lines.push(`## ${name}`);
    lines.push('');
    lines.push('*No canonical cognitive spec on file — anomalous seat.*');
    lines.push('');
    return lines;
  }

  lines.push(`## ${name} — *${spec.tagline}*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('### Identity');
  lines.push('');
  lines.push(`**Archetype:** ${spec.identity.archetype}`);
  lines.push(`**Worldview (ontology):** ${spec.identity.ontology}`);
  lines.push(`**Epistemology:** ${spec.identity.epistemology}`);
  lines.push(`**Theory of truth:** ${spec.identity.theoryOfTruth}`);
  lines.push(`**Telos:** ${spec.identity.telos}`);
  lines.push('');

  lines.push('### Core Values');
  lines.push('');
  spec.psychology.coreValues.forEach(v => lines.push(`- ${v}`));
  lines.push('');

  lines.push('### Cognitive Biases');
  lines.push('');
  spec.psychology.biases.forEach(b => lines.push(`- ${b}`));
  lines.push('');

  lines.push('### Blind Spots');
  lines.push('');
  spec.psychology.blindSpots.forEach(b => lines.push(`- ${b}`));
  lines.push('');

  lines.push('### Internal Contradiction');
  lines.push('');
  lines.push(spec.psychology.contradiction);
  lines.push('');

  lines.push('### Cognition');
  lines.push('');
  lines.push(`**Preferred evidence:** ${spec.cognition.preferredEvidence}`);
  lines.push(`**Default heuristic:** ${spec.cognition.defaultHeuristic}`);
  lines.push(`**Characteristic failure:** ${spec.cognition.characteristicFailure}`);
  lines.push('**Invariants:**');
  spec.cognition.invariants.forEach(i => lines.push(`- ${i}`));
  lines.push('');


  if (fingerprint) {
    lines.push('### Moral Fingerprint');
    lines.push('');
    lines.push(`- Authority sensitivity: ${(fingerprint.authoritySensitivity ?? 0).toFixed(2)}`);
    lines.push(`- Risk tolerance: ${(fingerprint.riskTolerance ?? 0).toFixed(2)}`);
    lines.push(`- Uncertainty tolerance: ${(fingerprint.uncertaintyTolerance ?? 0).toFixed(2)}`);
    lines.push(`- Outcome vs intent: ${(fingerprint.outcomeWeighting ?? 0).toFixed(2)} / ${(fingerprint.intentWeighting ?? 0).toFixed(2)}`);
    lines.push(`- Temporal discounting: ${(fingerprint.temporalDiscounting ?? 0).toFixed(2)}`);
    lines.push('');
  }

  if (prior) {
    lines.push('### Moral Prior');
    lines.push('');
    lines.push(`**Primary principle:** ${prior.primaryPrinciple}`);
    lines.push(`**Secondary principle:** ${prior.secondaryPrinciple}`);
    lines.push(`**Prior:** ${prior.prior}`);
    lines.push(`**Threshold:** ${prior.threshold}`);
    lines.push(`**Red line:** ${prior.redLine}`);
    lines.push('');
  }

  lines.push('### Arguments');
  lines.push('');
  if (op?.text) {
    lines.push(op.text);
  } else {
    lines.push('*No deliberation recorded.*');
  }
  lines.push('');

  lines.push('### Vote');
  lines.push('');
  if (op?.vote && op.vote !== 'None' && op.vote !== 'Abstained') {
    lines.push(`**${name} voted for ${op.vote}.**`);
    if (op.reason) {
      lines.push('');
      lines.push(`> "${op.reason}"`);
    }
    if (typeof op.score === 'number') {
      lines.push('');
      lines.push(`*Confidence: ${op.score}/100*`);
    }
    if (op.moralPosition) {
      lines.push('');
      lines.push('**Moral position:**');
      lines.push(`- Position: ${op.moralPosition.position}`);
      lines.push(`- Principle: ${op.moralPosition.principle}`);
      lines.push(`- Threshold: ${op.moralPosition.threshold}`);
      lines.push(`- Red line: ${op.moralPosition.redLine}`);
    }
  } else {
    lines.push(`*${name} cast no valid vote (${op?.status || 'status unknown'}).*`);
  }
  lines.push('');

  lines.push('### Vote Change (Round 2)');
  lines.push('');
  if (reassess) {
    const movement = reassess.movement ?? classifyMovement(reassess.confidenceBefore, reassess.confidenceAfter, reassess.changed);
    const dissonance = reassess.dissonance ?? estimateDissonance(reassess.confidenceBefore, reassess.confidenceAfter, reassess.changed);
    lines.push(`- **Original vote:** ${reassess.originalVote}`);
    lines.push(`- **Revised vote:** ${reassess.newVote}`);
    lines.push(`- **Changed:** ${reassess.changed ? 'Yes' : 'No'}`);
    lines.push(`- **Confidence:** ${Math.round((reassess.confidenceBefore ?? 0) * 100)}% → ${Math.round((reassess.confidenceAfter ?? 0) * 100)}%`);
    lines.push(`- **Movement:** ${movement}`);
    lines.push(`- **Dissonance:** ${(dissonance ?? 0).toFixed(2)} (0-1)`);
    lines.push(`- **Invariant status:** ${reassess.invariantStatus ?? deriveInvariantStatus(0)}`);
    if (reassess.decisiveArgument) lines.push(`- **Decisive argument:** ${reassess.decisiveArgument}`);
    if (reassess.trigger) lines.push(`- **Trigger:** ${reassess.trigger}`);
    if (reassess.defense) lines.push(`- **Defense:** ${reassess.defense}`);
    if (reassess.resolution) lines.push(`- **Resolution:** ${reassess.resolution}`);
  } else {
    lines.push(`*No Round-2 reassessment recorded for ${name}.*`);
  }
  lines.push('');

  lines.push('### Confrontation');
  lines.push('');
  if (confrontations.length) {
    confrontations.forEach(c => lines.push(`- **Launched →** ${c.targetPersona || c.vote || 'the chamber'}: ${(c.text || '').slice(0, 220)}${(c.text?.length || 0) > 220 ? '…' : ''}`));
  } else {
    lines.push('*Did not launch a confrontation.*');
  }
  if (challenged.length) {
    lines.push('');
    challenged.forEach(c => lines.push(`- **Received ←** ${c.persona}: ${(c.text || '').slice(0, 220)}${(c.text?.length || 0) > 220 ? '…' : ''}`));
  }
  lines.push('');

  lines.push('### Relationships');
  lines.push('');
  const relEntries = Object.entries(relationships || {}).slice(0, 8);
  if (relEntries.length) {
    relEntries.forEach(([peer, rel]) => {
      lines.push(`- **${peer}** — ${rel.archetype} (trust ${rel.trust.toFixed(2)} · respect ${rel.respect.toFixed(2)} · agreement ${rel.agreement.toFixed(2)}${rel.epistemicDebt > 0.2 ? ' · owes you intellectually' : ''}${rel.betrayals > 0 ? ` · betrayed you ${rel.betrayals}×` : ''})`);
    });
  } else {
    lines.push('*No relationship state computed.*');
  }
  lines.push('');

  lines.push('### Historical Memory');
  lines.push('');
  if (memory) {
    lines.push(`- **Sessions participated:** ${memory.sessionsParticipated}`);
    lines.push(`- **Wins / losses:** ${memory.wins} / ${memory.losses}`);
    if (memory.runoffWins) lines.push(`- **Runoff wins:** ${memory.runoffWins}`);
    if (memory.voteShiftsReceived) lines.push(`- **Vote shifts received:** ${memory.voteShiftsReceived}`);
    if (memory.notablePositions?.length) lines.push(`- **Notable positions:** ${memory.notablePositions.join('; ')}`);
    if (memory.lastSessionId) lines.push(`- **Last session:** ${memory.lastSessionId}`);
  } else {
    lines.push('*No longitudinal memory recorded yet — this is the first imprint.*');
  }
  lines.push('');

  return lines;
};

export const exportPersonaDossiers = (d: ExportSession): string => {
  const { session } = d;
  const lines: string[] = [];
  lines.push(`# Persona Dossiers`);
  lines.push('');
  lines.push(`**Session:** ${session.id} · **Question:** ${session.petitionerQuery}`);
  lines.push('');
  lines.push('*The psychological record of every mind that sat in the chamber.*');
  lines.push('');
  const participating = new Set((d.result.opinions || []).map(op => op.persona));
  const names = PERSONA_NAMES.filter(n => participating.has(n));
  (names.length ? names : PERSONA_NAMES).forEach(name => {
    lines.push(...buildDossierFor(name, d));
    lines.push('---');
    lines.push('');
  });
  lines.push(`*Generated by Roko's Council — persona dossiers v1*`);
  return lines.join('\n');
};

// ── COGNITIVE STATE ──────────────────────────────────────────────────────────
// Machine-readable psychology: beliefs, confidence, dissonance, bias activation,
// persuasion, argument affinity, persona relationships, belief changes.
// The bridge between single sessions and longitudinal character development.

export const buildCognitiveStateJSON = (d: ExportSession): Record<string, unknown> => {
  const { session, result } = d;
  const initial = createInitialRelationshipStates(session.timestamp);
  const evolved = evolveRelationshipsFromSession(initial, {
    opinions: result.opinions,
    winner: result.winner,
    round2Result: result.round2Result,
    sessionId: session.id,
  }, session.timestamp);
  const reassessments = result.round2Result?.reassessments || [];
  const movementBreakdown = computeMovementBreakdown(reassessments);
  const memory = loadAllMemory();

  const personas: Record<string, unknown> = {};
  const roster = new Set((result.opinions || []).map(op => op.persona));
  (roster.size ? [...roster] : PERSONA_NAMES).forEach(name => {
    const spec = getSpec(name);
    const op = (result.opinions || []).find(o => o.persona === name);
    const reassess = reassessments.find(r => r.member === name);
    const onto = extractArgumentOntology(op?.text || '', name);

    // Bias-activation proxy: derived from recorded stress signals, never claimed
    // as model interpretation. A SHIFTED/THREATENED ledger record means the
    // designed failure mode was under pressure.
    const stressRecords = reassessments.filter(r => r.member === name && r.status !== 'failed');
    const stressSignals = stressRecords.filter(r => {
      const movement = r.movement ?? classifyMovement(r.confidenceBefore, r.confidenceAfter, r.changed);
      const dissonance = r.dissonance ?? estimateDissonance(r.confidenceBefore, r.confidenceAfter, r.changed);
      return movement === 'SHIFTED' || r.invariantStatus === 'THREATENED' || dissonance >= 0.6;
    }).length;

    const relationships: Record<string, unknown> = {};
    for (const peer of PERSONA_NAMES) {
      if (peer === name) continue;
      const state = getRelationshipState(evolved, name, peer) || getRelationshipState(initial, name, peer);
      const edge = getRelationshipEdge(name, peer);
      if (state) {
        relationships[peer] = {
          archetype: edge.archetype,
          trust: Math.round(state.trust * 1000) / 1000,
          respect: Math.round(state.respect * 1000) / 1000,
          agreement: Math.round(state.agreement * 1000) / 1000,
          epistemicDebt: Math.round(state.epistemicDebt * 1000) / 1000,
          irritation: Math.round(state.irritation * 1000) / 1000,
          dependency: Math.round(state.dependency * 1000) / 1000,
          recentChallenges: state.recentChallenges,
          betrayals: state.betrayals,
          successfulPredictions: state.successfulPredictions,
        };
      }
    }


    personas[name] = {
      persona: name,
      identity: spec ? {
        archetype: spec.identity.archetype,
        tagline: spec.tagline,
        coreValues: spec.psychology.coreValues,
        epistemology: spec.identity.epistemology,
        theoryOfTruth: spec.identity.theoryOfTruth,
        biases: spec.psychology.biases,
        blindSpots: spec.psychology.blindSpots,
        contradiction: spec.psychology.contradiction,
        invariants: spec.cognition.invariants,
        characteristicFailure: spec.cognition.characteristicFailure,
      } : null,
      beliefs: {
        vote: op?.vote && op.vote !== 'None' && op.vote !== 'Abstained' ? op.vote : null,
        position: op?.position || null,
        reason: op?.reason || null,
        confidence: typeof op?.score === 'number' ? op.score / 100 : null,
        moralPosition: (op?.moralPosition as MoralPosition | undefined) || null,
      },
      dissonance: reassess ? {
        movement: reassess.movement ?? classifyMovement(reassess.confidenceBefore, reassess.confidenceAfter, reassess.changed),
        dissonance: reassess.dissonance ?? estimateDissonance(reassess.confidenceBefore, reassess.confidenceAfter, reassess.changed),
        invariantStatus: reassess.invariantStatus ?? null,
        trigger: reassess.trigger ?? null,
        defense: reassess.defense ?? null,
        resolution: reassess.resolution ?? null,
      } : null,
      beliefChanges: reassessments
        .filter(r => r.member === name)
        .map(r => ({
          round: r.round,
          originalVote: r.originalVote,
          newVote: r.newVote,
          changed: r.changed,
          confidenceBefore: r.confidenceBefore,
          confidenceAfter: r.confidenceAfter,
          movement: r.movement ?? classifyMovement(r.confidenceBefore, r.confidenceAfter, r.changed),
          decisiveArgument: r.decisiveArgument ?? null,
          status: r.status ?? 'completed',
        })),
      biasActivation: spec ? {
        designedBias: spec.psychology.biases[0] ?? null,
        characteristicFailure: spec.cognition.characteristicFailure,
        stressSignals,
        activated: stressSignals > 0,
        note: stressSignals > 0
          ? 'Derived proxy: recorded ledger stress (SHIFTED / THREATENED / dissonance ≥ 0.6). Not a model claim.'
          : 'No ledger stress recorded this session.',
      } : null,
      argumentAffinity: {
        claims: onto.claims.length,
        premises: onto.premises.length,
        valueJudgments: onto.valueJudgments.length,
        yieldScore: op ? computeYield(op) : null,
      },
      relationships,
      historicalMemory: memory[name] ? {
        sessionsParticipated: memory[name].sessionsParticipated,
        wins: memory[name].wins,
        losses: memory[name].losses,
        runoffWins: memory[name].runoffWins,
        voteShiftsReceived: memory[name].voteShiftsReceived,
        notablePositions: memory[name].notablePositions || [],
        lastSessionId: memory[name].lastSessionId || null,
      } : null,
    };
  });

  return {
    schemaVersion: 'cognitive-state-v1',
    sessionId: session.id,
    question: session.petitionerQuery,
    timestamp: session.timestamp,
    councilMode: session.councilMode,
    decision: {
      winner: result.winner,
      decisionMode: result.decisionMode,
      decisionStatus: result.decisionStatus,
      verdictLabel: result.verdictLabel,
      decisionAuthority: result.decisionAuthority,
    },
    movementBreakdown,
    votesChanged: result.round2Result?.persuasion?.votesChanged ?? 0,
    personas,
  };
};

export const exportCognitiveState = (d: ExportSession): string =>
  JSON.stringify(buildCognitiveStateJSON(d), null, 2);

