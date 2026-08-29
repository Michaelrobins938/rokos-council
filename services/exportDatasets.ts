// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DATASETS — Research Data family.
//
// Analytical tables outside the application, plus the intellectual graph in a
// format (GraphML) that visualization tooling understands:
//   • Session Dataset       — one row per deliberative event.
//   • Argument Dataset      — one row per claim/premise/objection/rebuttal.
//   • Persona Dataset       — one row per persona/session.
//   • Relationship Dataset  — the 9×9 social field, flattened.
//   • Argument Graph        — JSON + GraphML of the intellectual topology.
//
// Pure derivation from recorded artifacts. No LLM calls.
// ─────────────────────────────────────────────────────────────────────────────
import type { ExportSession } from './exportService';
import type { CouncilOpinion } from '../types';
import { PERSONA_NAMES, getSpec } from './personaBible';
import { extractArgumentOntology } from './epistemicTopology';
import {
  createInitialRelationshipStates,
  evolveRelationshipsFromSession,
  getRelationshipEdge,
  getRelationshipState,
  RELATIONSHIP_SEED,
} from './relationshipGraph';
import { classifyMovement } from './dissonanceEngine';

// ── HELPERS ──────────────────────────────────────────────────────────────────

const csvEscape = (v: string | number | boolean | null | undefined): string => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const row = (cells: Array<string | number | boolean | null | undefined>): string =>
  cells.map(csvEscape).join(',');

const totalMembers = (d: ExportSession): number =>
  d.result.councilState?.totalCouncilMembers || d.result.opinions.length;

// ── SESSION DATASET ──────────────────────────────────────────────────────────
// One row per deliberative event: every opinion (deliberation + confrontation)
// plus the synthesis as a terminal event.

export const exportSessionDataset = (d: ExportSession): string => {
  const { session, result } = d;
  const header = ['session_id', 'timestamp', 'mode', 'event_sequence', 'event_type', 'persona', 'target', 'vote', 'argument', 'yield_score', 'decision_status'];
  const lines: string[] = [];
  let seq = 0;
  lines.push(row(header));
  (result.opinions || []).forEach(op => {
    seq += 1;
    lines.push(row([
      session.id, session.timestamp, session.councilMode, seq, 'deliberation',
      op.persona, '', op.vote && op.vote !== 'None' ? op.vote : '',
      (op.text || '').slice(0, 1200), typeof op.score === 'number' ? op.score : '', result.decisionStatus || '',
    ]));
  });
  (result.confrontationOpinions || []).forEach(op => {
    seq += 1;
    lines.push(row([
      session.id, session.timestamp, session.councilMode, seq, 'confrontation',
      op.persona, op.targetPersona || op.vote || '', op.vote && op.vote !== 'None' ? op.vote : '',
      (op.text || '').slice(0, 1200), '', result.decisionStatus || '',
    ]));
  });
  seq += 1;
  lines.push(row([
    session.id, session.timestamp, session.councilMode, seq, 'synthesis',
    'COUNCIL', '', result.winner || '', (result.synthesis || '').slice(0, 2000), '', result.decisionStatus || '',
  ]));
  return lines.join('\n');
};

// ── ARGUMENT DATASET ──────────────────────────────────────────────────────────
// One row per extracted claim/premise/assumption/inference/conclusion/value
// judgment, plus objections, defenses, and rebuttals.

export const exportArgumentDataset = (d: ExportSession): string => {
  const { session, result } = d;
  const header = ['session_id', 'persona', 'kind', 'text'];
  const lines: string[] = [];
  lines.push(row(header));

  (result.opinions || []).forEach(op => {
    const onto = extractArgumentOntology(op.text || '', op.persona);
    const push = (kind: string, text: string) => { if (text) lines.push(row([session.id, op.persona, kind, text].map(v => v))); };
    onto.claims.slice(0, 20).forEach(c => push('claim', c));
    onto.premises.slice(0, 20).forEach(c => push('premise', c));
    onto.assumptions.slice(0, 15).forEach(c => push('assumption', c));
    onto.inferences.slice(0, 15).forEach(c => push('inference', c));
    onto.conclusions.slice(0, 10).forEach(c => push('conclusion', c));
    onto.valueJudgments.slice(0, 10).forEach(c => push('value_judgment', c));
  });
  (result.confrontationOpinions || []).forEach(op => {
    if (op.text) lines.push(row([session.id, op.persona, 'objection', op.text]));
  });
  (result.round2Result?.defenses || []).forEach(def => {
    lines.push(row([session.id, def.defender, 'defense', def.defense]));
    lines.push(row([session.id, def.defender, 'strongest_objection', def.strongestObjection]));
    lines.push(row([session.id, def.defender, 'rebuttal', def.rebuttal]));
  });
  return lines.join('\n');
};

// ── PERSONA DATASET ──────────────────────────────────────────────────────────
// One row per persona/session.

export const exportPersonaDataset = (d: ExportSession): string => {
  const { session, result } = d;
  const header = ['session_id', 'persona', 'vote', 'position', 'reason', 'confidence', 'yield', 'argument_count', 'premise_count', 'movement', 'dissonance', 'voted_for_winner', 'changed', 'challenges_launched', 'challenges_received'];
  const lines: string[] = [];
  lines.push(row(header));

  (result.opinions || []).forEach(op => {
    const onto = extractArgumentOntology(op.text || '', op.persona);
    const reassess = (result.round2Result?.reassessments || []).find(r => r.member === op.persona);
    const launched = (result.confrontationOpinions || []).filter(o => o.persona === op.persona).length;
    const received = (result.confrontationOpinions || []).filter(o => o.targetPersona === op.persona).length;
    const movement = reassess
      ? (reassess.movement ?? classifyMovement(reassess.confidenceBefore, reassess.confidenceAfter, reassess.changed))
      : '';
    const dissonance = reassess?.dissonance != null ? Math.round(reassess.dissonance * 100) : '';
    const yield_ = typeof op.score === 'number'
      ? op.score
      : Math.min(100, 60 + ((op.text || '').match(/\b(because|therefore|thus|hence|implies|must|consequently)\b/gi)?.length ?? 0) * 5);
    lines.push(row([
      session.id, op.persona, op.vote && op.vote !== 'None' ? op.vote : '', op.position || '',
      op.reason || '', typeof op.score === 'number' ? op.score : '', yield_,
      onto.claims.length, onto.premises.length, movement, dissonance,
      result.winner && op.vote === result.winner ? 1 : 0,
      reassess?.changed ? 1 : 0, launched, received,
    ]));
  });
  return lines.join('\n');
};


// ── RELATIONSHIP DATASET ─────────────────────────────────────────────────────
// The 9×9 social field flattened into rows: source_persona, target_persona,
// relationship (archetype), affinity (agreement), opposition, persuasion
// (epistemic debt), trust, respect, and the dynamic deltas.

const buildEvolvedStates = (d: ExportSession) => {
  const initial = createInitialRelationshipStates(d.session.timestamp);
  const evolved = evolveRelationshipsFromSession(initial, {
    opinions: d.result.opinions,
    winner: d.result.winner,
    round2Result: d.result.round2Result,
    sessionId: d.session.id,
  }, d.session.timestamp);
  return { initial, evolved };
};

export const exportRelationshipDataset = (d: ExportSession): string => {
  const { session } = d;
  const header = ['session_id', 'source_persona', 'target_persona', 'relationship', 'affinity_agreement', 'opposition', 'persuasion', 'trust', 'respect', 'ideological_distance', 'status_tension', 'dependency', 'epistemic_debt', 'betrayals', 'recent_challenges'];
  const lines: string[] = [];
  lines.push(row(header));
  const { initial, evolved } = buildEvolvedStates(d);
  const roster = new Set((d.result.opinions || []).map(op => op.persona));
  const names = (roster.size ? [...roster] : PERSONA_NAMES) as string[];

  names.forEach(a => {
    names.forEach(b => {
      if (a === b) return;
      const edge = getRelationshipEdge(a, b);
      const state = getRelationshipState(evolved, a, b) || getRelationshipState(initial, a, b);
      if (!state) return;
      lines.push(row([
        session.id, a, b, edge.archetype,
        state.agreement.toFixed(2), (1 - state.agreement).toFixed(2), state.epistemicDebt.toFixed(2),
        state.trust.toFixed(2), state.respect.toFixed(2), edge.ideologicalDistance.toFixed(2),
        edge.statusTension.toFixed(2), state.dependency.toFixed(2), state.epistemicDebt.toFixed(2),
        state.betrayals, state.recentChallenges,
      ]));
    });
  });
  return lines.join('\n');
};

// ── ARGUMENT GRAPH ───────────────────────────────────────────────────────────
// JSON node/edge graph + GraphML. Nodes = personas; edges = relationship seed +
// dynamic state, plus the influence edges from the epistemic topology.

export const buildArgumentGraphJSON = (d: ExportSession): Record<string, unknown> => {
  const { session, result } = d;
  const { initial, evolved } = buildEvolvedStates(d);
  const roster = new Set((result.opinions || []).map(op => op.persona));
  const names = (roster.size ? [...roster] : PERSONA_NAMES) as string[];

  const nodes = names.map(name => {
    const op = (result.opinions || []).find(o => o.persona === name);
    const spec = getSpec(name);
    return {
      id: name,
      label: name,
      archetype: spec?.tagline || spec?.identity.archetype || name,
      vote: op?.vote && op.vote !== 'None' ? op.vote : null,
      yieldScore: typeof op?.score === 'number' ? op.score : null,
    };
  });

  const edges: Array<Record<string, unknown>> = [];
  names.forEach(a => {
    names.forEach(b => {
      if (a === b) return;
      const edge = getRelationshipEdge(a, b);
      const state = getRelationshipState(evolved, a, b) || getRelationshipState(initial, a, b);
      edges.push({
        source: a,
        target: b,
        kind: 'relationship',
        archetype: edge.archetype,
        trust: state ? Math.round(state.trust * 1000) / 1000 : edge.trust,
        respect: state ? Math.round(state.respect * 1000) / 1000 : edge.respect,
        agreement: state ? Math.round(state.agreement * 1000) / 1000 : (1 - edge.ideologicalDistance),
        ideologicalDistance: edge.ideologicalDistance,
        epistemicCompatibility: edge.epistemicCompatibility,
        statusTension: edge.statusTension,
        epistemicDebt: state ? Math.round(state.epistemicDebt * 1000) / 1000 : 0,
        dependency: state ? Math.round(state.dependency * 1000) / 1000 : 0,
        betrayalCount: state?.betrayals ?? 0,
      });
    });
  });

  (result.epistemicTopology?.influenceEdges || []).forEach(ie => {
    edges.push({ source: ie.voter, target: ie.target, kind: 'influence', confidence: ie.confidence, mutual: ie.mutual });
  });

  return {
    schemaVersion: 'argument-graph-v1',
    sessionId: session.id,
    question: session.petitionerQuery,
    nodes,
    edges,
  };
};

export const exportArgumentGraphJSON = (d: ExportSession): string =>
  JSON.stringify(buildArgumentGraphJSON(d), null, 2);


const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const exportArgumentGraphGraphML = (d: ExportSession): string => {
  const g = buildArgumentGraphJSON(d);
  const nodes = (g.nodes as Array<Record<string, unknown>>) || [];
  const edges = (g.edges as Array<Record<string, unknown>>) || [];

  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">');
  out.push('  <key id="d0" for="node" attr.name="archetype" attr.type="string"/>');
  out.push('  <key id="d1" for="node" attr.name="vote" attr.type="string"/>');
  out.push('  <key id="d2" for="node" attr.name="yield" attr.type="int"/>');
  out.push('  <key id="d3" for="edge" attr.name="kind" attr.type="string"/>');
  out.push('  <key id="d4" for="edge" attr.name="trust" attr.type="double"/>');
  out.push('  <key id="d5" for="edge" attr.name="respect" attr.type="double"/>');
  out.push('  <key id="d6" for="edge" attr.name="agreement" attr.type="double"/>');
  out.push('  <key id="d7" for="edge" attr.name="ideologicalDistance" attr.type="double"/>');
  out.push('  <key id="d8" for="edge" attr.name="statusTension" attr.type="double"/>');
  out.push('  <key id="d9" for="edge" attr.name="epistemicDebt" attr.type="double"/>');
  out.push('  <key id="d10" for="edge" attr.name="dependency" attr.type="double"/>');
  out.push('  <key id="d11" for="edge" attr.name="betrayalCount" attr.type="int"/>');
  out.push(`  <graph id="council-${xmlEscape(String((g as any).sessionId || ''))}" edgedefault="directed">`);

  nodes.forEach(n => {
    const id = xmlEscape(String(n.id));
    out.push(`    <node id="${id}">`);
    out.push(`      <data key="d0">${xmlEscape(String(n.archetype || ''))}</data>`);
    out.push(`      <data key="d1">${xmlEscape(n.vote ? String(n.vote) : '')}</data>`);
    out.push(`      <data key="d2">${n.yieldScore != null ? String(n.yieldScore) : ''}</data>`);
    out.push(`    </node>`);
  });

  edges.forEach(e => {
    const src = xmlEscape(String(e.source));
    const tgt = xmlEscape(String(e.target));
    out.push(`    <edge source="${src}" target="${tgt}">`);
    out.push(`      <data key="d3">${xmlEscape(String(e.kind || ''))}</data>`);
    out.push(`      <data key="d4">${e.trust ?? ''}</data>`);
    out.push(`      <data key="d5">${e.respect ?? ''}</data>`);
    out.push(`      <data key="d6">${e.agreement ?? ''}</data>`);
    out.push(`      <data key="d7">${e.ideologicalDistance ?? ''}</data>`);
    out.push(`      <data key="d8">${e.statusTension ?? ''}</data>`);
    out.push(`      <data key="d9">${e.epistemicDebt ?? ''}</data>`);
    out.push(`      <data key="d10">${e.dependency ?? ''}</data>`);
    out.push(`      <data key="d11">${e.betrayalCount ?? ''}</data>`);
    out.push(`    </edge>`);
  });

  out.push('  </graph>');
  out.push('</graphml>');
  return out.join('\n');
};

