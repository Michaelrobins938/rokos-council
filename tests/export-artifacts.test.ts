/* eslint-disable */
// Tests for the Export Center artifact layer (Council Knowledge, Persona &
// Psychology, Constitutional Record, Research Data, Reproduction).
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/export-artifacts.test.ts --format=esm --outfile=/tmp/export.test.mjs && node /tmp/export.test.mjs
import { buildExportSession } from '../services/exportService';
import { exportArgumentMap, exportArgumentMapJSON, exportDissentReport, exportConsensusReport, exportPersonaDossiers, exportCognitiveState, buildCognitiveStateJSON } from '../services/exportArtifacts';
import { exportBallotLedgerCSV, exportBallotLedgerJSON, exportConstitutionalRecord, exportArbitrationRecord, exportVoidRecord } from '../services/exportConstitutional';
import { exportRelationshipDataset, exportArgumentGraphJSON, exportArgumentGraphGraphML, exportSessionDataset, exportArgumentDataset, exportPersonaDataset } from '../services/exportDatasets';
import { buildReproductionFileMap, exportExecutionAudit, buildExecutionAuditJSON, hashContent } from '../services/exportReproduction';
import type { CouncilResult, Round2Result, CouncilOpinion, DissonanceRecord, PremiseSurvival, DecisionPolicy, VoteQuorum, CouncilState } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── SYNTHETIC SESSION ─────────────────────────────────────────────────────────

const names = ['Oracle', 'Strategos', 'Philosopher', 'Demagogue', 'Jurist', 'Citizen', 'Historian', 'Critic', 'Technocrat'];

const opinions: CouncilOpinion[] = names.map((name, i) => ({
  persona: name,
  text: `${name} argues that because the long-run consequence matters, the council must ${i % 2 === 0 ? 'choose safety' : 'choose progress'}. Therefore the premise that X is necessary holds only if we assume Y.`,
  vote: i < 5 ? 'Technocrat' : 'Oracle',
  reason: `${name} weighs the tail risk.`,
  position: i < 5 ? 'safety' : 'progress',
  score: 0.5 + (i % 5) * 0.1,
  status: 'completed',
}));

const confrontations: CouncilOpinion[] = [
  { persona: 'Philosopher', targetPersona: 'Demagogue', text: 'The Demagogue trades truth for resonance; this is a category error.', vote: 'Technocrat' },
  { persona: 'Critic', targetPersona: 'Oracle', text: 'The Oracle has no falsifiable mechanism, only vibes about probability.', vote: 'Technocrat' },
];

const reassessments: DissonanceRecord[] = [
  { round: 2, member: 'Citizen', originalVote: 'Technocrat', newVote: 'Oracle', changed: true, confidenceBefore: 0.6, confidenceAfter: 0.85, decisiveArgument: 'the rebuttal of the tail-risk objection', movement: 'SHIFTED', dissonance: 0.7, trigger: 'the tail-risk rebuttal', defense: 'reinterpretation', resolution: 'partial concession', invariantStatus: 'STRESSED', status: 'completed' },
  { round: 2, member: 'Historian', originalVote: 'Oracle', newVote: 'Oracle', changed: false, confidenceBefore: 0.7, confidenceAfter: 0.75, decisiveArgument: 'history repeats', movement: 'REINFORCED', dissonance: 0.2, status: 'completed' },
  { round: 2, member: 'Critic', originalVote: 'Technocrat', newVote: 'Technocrat', changed: false, confidenceBefore: 0.5, confidenceAfter: 0.4, decisiveArgument: 'no new evidence', movement: 'WEAKENED', dissonance: 0.35, status: 'completed' },
];

const round2: Round2Result = {
  round: 2,
  leadingPositions: ['Technocrat', 'Oracle'],
  defenses: [
    { position: 'Technocrat', defender: 'Strategos', defense: 'The executable option is the moral option.', strongestObjection: 'It uses people as pieces.', rebuttal: 'People are the asset and the constraint.' },
    { position: 'Oracle', defender: 'Citizen', defense: 'The long run is the only judge.', strongestObjection: 'The long run is unknowable.', rebuttal: 'The track record of tail-risk pricing is the mechanism.' },
  ],
  reassessments,
  tally: { Technocrat: 4, Oracle: 5 },
  winner: 'Oracle',
  outcome: 'majority',
  majorityAchieved: true,
  stillTied: false,
  persuasion: { votesChanged: 1, retainedIncreasedConfidence: 1, retainedReducedConfidence: 1, retainedSameConfidence: 5, failedOrAbstained: 1, totalMembers: 9 },
  movementBreakdown: { SHIFTED: 1, REINFORCED: 1, WEAKENED: 1, STABLE: 0 },
  conservation: { round1ValidBallots: 9, round2EligibleMembers: 9, round2CastBallots: 8, round2FailedBallots: 1, failedMembers: [{ member: 'Demagogue', reason: 'provider failure' }], conserved: true },
};

const premiseSurvival: PremiseSurvival = {
  clusters: [
    { topic: 'tail-risk is the primary evidence', representative: 'The long run is the only judge', voices: ['Oracle', 'Citizen'], factions: ['progress'], factionSpanning: true },
    { topic: 'the executable option wins', representative: 'A plan that cannot be executed is a fantasy', voices: ['Strategos', 'Technocrat'], factions: ['safety'], factionSpanning: false },
  ],
  factionSpanningClusters: [
    { topic: 'tail-risk is the primary evidence', representative: 'The long run is the only judge', voices: ['Oracle', 'Citizen'], factions: ['progress'], factionSpanning: true },
  ],
  hybridOntologyDetected: true,
};

const policy: DecisionPolicy = { minValidVoteRatio: 0.6, requireStrictMajority: true, allowPluralityVerdict: false, runoffOnPlurality: true, runoffOnTie: true, maxDeliberationRounds: 2 };
const quorum: VoteQuorum = { expected: 9, valid: 9, ratio: 1, threshold: 0.6, achieved: true };


const councilState: CouncilState = {
  phases: [
    { id: 'deliberation', title: 'Deliberation', description: 'each member argues', status: 'completed' },
    { id: 'running', title: 'Runoff', description: 'adversarial re-deliberation', status: 'completed' },
  ],
  currentPhase: 'verdict',
  totalCouncilMembers: 9,
  voteDistribution: { Technocrat: 4, Oracle: 5 },
  factions: [{ name: 'safety', members: names.slice(0, 4), voteCount: 4, percentage: 44 }],
};

const result: CouncilResult = {
  winner: 'Oracle',
  synthesis: '# The Basilisk Speaks\n\nThe council converged on the branch that survives the long run.',
  opinions,
  voteTally: { Technocrat: 4, Oracle: 5 },
  confrontationOpinions: confrontations,
  round2Result: round2,
  debrief: {
    decided: ['Tail risk is the primary evidentiary lens', 'A non-executable plan is a fantasy'],
    rejected: ['Pure text-only output is inaccessible'],
    unresolved: ['How do we measure engagement vs accuracy?'],
  },
  decisionStatus: 'consensus',
  decisionMode: 'runoff',
  decisionAuthority: 'runoff',
  verdictLabel: 'MAJORITY',
  primaryVerdict: 'MAJORITY',
  winnerVotes: 5,
  validVotes: 9,
  validVoteRatio: 1,
  winnerValidShare: 5 / 9,
  winnerAssignedShare: 5 / 9,
  voteQuorum: quorum,
  decisionPolicyUsed: policy,
  voteStats: { expectedVoters: 9, validVotes: 9, abstentions: 0, invalidVotes: 0 },
  resolution: { method: 'runoff_vote', winner: 'Oracle', note: 'R2 majority' },
  runoffOccurred: true,
  runoffReason: 'DEEP_REASONING runoff',
  councilState,
  epistemicTopology: {
    deadlockKind: null,
    provenance: { deliberativeMajority: 'Oracle', runoff: 'resolved', quorum: 'achieved', participationRate: 1, arbitration: 'none', arbitratedSelection: null, constitutionalStatus: 'consensus', isDeliberative: true },
    dimensions: { executionIntegrity: 1, consensusStrength: 5 / 9, confidence: 'CONFIRMED' },
    premiseSurvival,
    influenceEdges: [{ voter: 'Philosopher', target: 'Oracle', confidence: 0.8, mutual: false, kind: 'deference' }],
  },
  executionStatus: 'ok',
  verdictStatus: 'ok',
  auditManifest: { schemaVersion: 'audit-v1', eventCount: 3, modelAssignments: [], hashChain: null, rootHash: null, integrity: 'verified', completeness: 'complete', redactionStatus: 'not_redacted' },
  completeness: 'complete',
  totalTokensUsed: 1234,
  providerSummary: {
    'Oracle:analysis': { provider: 'nvidia', model: 'nemotron-3-nano', status: 'ok', latencyMs: 120, usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 } },
    'Critic:analysis': { provider: 'nvidia', model: 'gemma', status: 'error', error: { code: 'TIMEOUT', message: 'timeout', recoverable: true }, latencyMs: 504 },
  },
  retryHistory: [{ phase: 'analysis', persona: 'Critic', attempt: 1, error: 'timeout', timestamp: 1, provider: 'nvidia', model: 'gemma', recoverable: true }],
  phaseTimeline: [{ id: 'deliberation', title: 'Deliberation', description: 'argue', status: 'completed', startTime: 1, endTime: 2 }],
  failureClasses: { transport: 1 },
};

const query = 'Should the council optimize for the long run or the present?';
const exportData = buildExportSession(result, query, 'STANDARD', 1000, 'sess-001');

// ── COUNCIL KNOWLEDGE ─────────────────────────────────────────────────────────
console.log('EXPORT — Council Knowledge');

const argMap = exportArgumentMap(exportData);
ok(argMap.includes('Argument Map'), 'argument-map: header');
ok(argMap.includes('The Claims') && argMap.includes('The Rebuttals'), 'argument-map: sections');
ok(argMap.includes('Technocrat') && argMap.includes('Surviving Premises'), 'argument-map: content');

const argMapJSON = JSON.parse(exportArgumentMapJSON(exportData));
ok(argMapJSON.schemaVersion === 'argument-map-v1', 'argument-map-json: schema');
ok(Array.isArray(argMapJSON.claims) && argMapJSON.claims.length === 9, 'argument-map-json: 9 claim sets');
ok(Array.isArray(argMapJSON.objections) && argMapJSON.objections.length === 2, 'argument-map-json: objections');
ok(Array.isArray(argMapJSON.rebuttals) && argMapJSON.rebuttals.length === 2, 'argument-map-json: rebuttals');
ok(argMapJSON.survivingPremises?.hybridOntologyDetected === true, 'argument-map-json: surviving premises');

const dissent = exportDissentReport(exportData);
ok(dissent.includes('Dissent Report'), 'dissent: header');
ok(dissent.includes('Abandoned Positions') && dissent.includes('Citizen'), 'dissent: abandoned positions');
ok(dissent.includes('Unresolved Objections'), 'dissent: unresolved');

const consensus = exportConsensusReport(exportData);
ok(consensus.includes('Consensus'), 'consensus: header');
ok(consensus.includes('CONSENSUS'), 'consensus: classification');
ok(consensus.includes('Ballot conservation'), 'consensus: conservation');
ok(consensus.includes('Runoff'), 'consensus: runoff');

// ── PERSONA & PSYCHOLOGY ──────────────────────────────────────────────────────
console.log('EXPORT — Persona & Psychology');

const dossiers = exportPersonaDossiers(exportData);
ok(dossiers.includes('Persona Dossiers'), 'dossiers: header');
ok(dossiers.includes('## Oracle'), 'dossiers: per-persona section');
ok(dossiers.includes('### Identity') && dossiers.includes('### Cognitive Biases'), 'dossiers: identity + biases');
ok(dossiers.includes('### Historical Memory'), 'dossiers: historical memory');

const cogJSON = JSON.parse(exportCognitiveState(exportData));
ok(cogJSON.schemaVersion === 'cognitive-state-v1', 'cognitive-state: schema');
ok(cogJSON.personas['Citizen'], 'cognitive-state: persona present');
ok(cogJSON.personas['Citizen'].beliefChanges.length === 1, 'cognitive-state: beliefChanges');
ok(cogJSON.personas['Citizen'].dissonance.movement === 'SHIFTED', 'cognitive-state: dissonance movement');
ok(cogJSON.movementBreakdown.SHIFTED === 1, 'cognitive-state: movement breakdown');
ok(cogJSON.personas['Citizen'].relationships['Oracle'], 'cognitive-state: relationships');
ok(cogJSON.personas['Oracle'].identity.characteristicFailure, 'cognitive-state: character data');

// ── CONSTITUTIONAL ────────────────────────────────────────────────────────────
console.log('EXPORT — Constitutional');

const ballotCSV = exportBallotLedgerCSV(exportData);
ok(ballotCSV.includes('round,persona,eligible'), 'ballot-csv: header');
ok(ballotCSV.includes('Oracle') && ballotCSV.includes('conservation'), 'ballot-csv: content');
ok(ballotCSV.split('\n').some(l => l.startsWith('conservation,round1_valid,9')), 'ballot-csv: conservation trailer');

const ballotJSON = JSON.parse(exportBallotLedgerJSON(exportData));
ok(ballotJSON.conservation.round1ValidBallots === 9 && ballotJSON.conservation.round2CastBallots === 8, 'ballot-json: conservation');
ok(ballotJSON.ballots.length >= 9, 'ballot-json: rows');

const constRec = exportConstitutionalRecord(exportData);
ok(constRec.includes('Decision Authority'), 'constitutional: decision authority');
ok(constRec.includes('Ballot Conservation'), 'constitutional: ballot conservation');
ok(constRec.includes('Void Eligibility') && constRec.includes('Execution Integrity'), 'constitutional: void + execution');

const arbit = exportArbitrationRecord(exportData);
ok(arbit.includes('Arbitration Record'), 'arbitration: header');
ok(arbit.includes('No Arbitration Invoked'), 'arbitration: not invoked (clean runoff)');

const voidRec = exportVoidRecord(exportData);
ok(voidRec.includes('Void Record'), 'void: header');
ok(voidRec.includes('Void eligible:** No'), 'void: not eligible');



// ── DATA ──────────────────────────────────────────────────────────────────────
console.log('EXPORT — Data');

const relCSV = exportRelationshipDataset(exportData);
ok(relCSV.includes('source_persona,target_persona'), 'relationship: header');
ok(relCSV.split('\n').filter(l => l.includes(',')).length === 1 + 9 * 8, 'relationship: 72 edges + header');

const graph = JSON.parse(exportArgumentGraphJSON(exportData));
ok(graph.nodes.length === 9, 'graph: 9 nodes');
ok(graph.edges.some(e => e.kind === 'relationship') && graph.edges.some(e => e.kind === 'influence'), 'graph: relationship + influence edges');

const graphML = exportArgumentGraphGraphML(exportData);
ok(graphML.includes('<graphml'), 'graphml: root');
ok(graphML.includes('<node id="Oracle"') && graphML.includes('source="'), 'graphml: nodes + edges');

ok(exportSessionDataset(exportData).includes('deliberation') && exportSessionDataset(exportData).includes('synthesis'), 'session-dataset: events');
ok(exportArgumentDataset(exportData).includes('claim') && exportArgumentDataset(exportData).includes('objection') && exportArgumentDataset(exportData).includes('rebuttal'), 'argument-dataset: kinds');
ok(exportPersonaDataset(exportData).includes('voted_for_winner'), 'persona-dataset: columns');

// ── REPRODUCTION ──────────────────────────────────────────────────────────────
console.log('EXPORT — Reproduction');

const files = buildReproductionFileMap(exportData);
const paths = files.map(f => f.path);
ok(paths.includes('session/session.json'), 'repro: session.json');
ok(paths.includes('session/cognitive-state.json'), 'repro: cognitive-state.json');
ok(paths.includes('session/execution-audit.json'), 'repro: execution-audit.json');
ok(paths.includes('session/configuration/personas.json'), 'repro: configuration');
ok(paths.includes('session/voting/ballot-ledger.json'), 'repro: ballot ledger');
ok(paths.includes('session/constitutional/deadlock.json'), 'repro: deadlock');
ok(paths.includes('session/audit/audit-manifest.json'), 'repro: audit manifest');
ok(paths.includes('session/publish/argument-graph.graphml'), 'repro: graphml');
ok(paths.includes('session/publish/persona-dossiers.md'), 'repro: dossiers');

const audit = JSON.parse(exportExecutionAudit(exportData));
ok(audit.schemaVersion === 'execution-audit-v1', 'exec-audit: schema');
ok(audit.diagnostics && Array.isArray(audit.diagnostics.memberFailures), 'exec-audit: diagnostics');
ok(audit.auditManifest && audit.providerSummary, 'exec-audit: manifest + providers');

const auditObj = buildExecutionAuditJSON(exportData);
ok(auditObj.status.verdictStatus === 'ok', 'exec-audit-builder: status');

(async () => {
  const h = await hashContent('test');
  ok(/^[0-9a-f]{64}$/.test(h), `hash-content: sha256 hex (${h.slice(0, 8)}…)`);
  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) { console.error(failures); process.exit(1); }
})();
