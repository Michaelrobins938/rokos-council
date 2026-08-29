// ─────────────────────────────────────────────────────────────────────────────
// EXPORT REPRODUCTION — the Reproduction Package + the three-JSON split.
//
//   • execution-audit.json — machine execution: providers, retries, latency,
//     tokens, failures, events, hashes, model assignments.
//   • buildReproductionPackage — the ZIP ALL umbrella: the session turned into
//     a research specimen (session / configuration / deliberation / voting /
//     constitutional / execution / audit / publish).
//
// The package is deterministic and self-hashing so a session can be re-run and
// verified against the original artifact-by-artifact.
// ─────────────────────────────────────────────────────────────────────────────
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { CouncilResult, ExportSession } from './exportService';
import {
  buildExportSession,
  computeDiagnostics,
  exportToCSV,
  exportToJSON,
  exportToMarkdown,
  exportToScript,
  exportToSubstack,
} from './exportService';
import {
  buildArgumentMapJSON,
  exportArgumentMap,
  exportCognitiveState,
  exportConsensusReport,
  exportDissentReport,
  exportPersonaDossiers,
} from './exportArtifacts';
import {
  buildBallotLedgerJSON,
  exportArbitrationRecord,
  exportBallotLedgerCSV,
  exportConstitutionalRecord,
  exportVoidRecord,
} from './exportConstitutional';
import {
  exportArgumentDataset,
  exportArgumentGraphGraphML,
  exportArgumentGraphJSON,
  exportPersonaDataset,
  exportRelationshipDataset,
  exportSessionDataset,
} from './exportDatasets';
import { PERSONA_NAMES, PERSONA_BIBLE } from './personaBible';
import { hashString } from './voidProtocol';

// ── HASHING ──────────────────────────────────────────────────────────────────

const hex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 when available (secure context), deterministic fallback otherwise. */
export const hashContent = async (content: string): Promise<string> => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
      return hex(digest);
    }
  } catch { /* fall through to deterministic hash */ }
  return hashString(content);
};

// ── EXECUTION AUDIT ──────────────────────────────────────────────────────────
// The machine-level JSON contract. This is the hard evidence of how the run
// actually executed, kept separate from the semantic session.

export const buildExecutionAuditJSON = (d: ExportSession): Record<string, unknown> => {
  const { session, result } = d;
  const diag = computeDiagnostics(result);
  return {
    schemaVersion: 'execution-audit-v1',
    sessionId: session.id,
    runId: result.runId || session.runId || null,
    status: {
      executionStatus: result.executionStatus,
      deliberationStatus: result.deliberationStatus,
      votingStatus: result.votingStatus,
      synthesisStatus: result.synthesisStatus,
      verdictStatus: result.verdictStatus,
      completeness: result.completeness,
    },
    diagnostics: diag,
    auditManifest: result.auditManifest || session.auditManifest || null,
    providerSummary: result.providerSummary || null,
    retryHistory: result.retryHistory || null,
    phaseTimeline: result.phaseTimeline || null,
    modelRoster: result.modelRoster || session.modelRoster || null,
    events: result.events || session.events || null,
    failureClasses: result.failureClasses || null,
    totals: {
      tokensUsed: result.totalTokensUsed ?? diag.usageTotals.promptTokens + diag.usageTotals.completionTokens,
    },
  };
};

export const exportExecutionAudit = (d: ExportSession): string =>
  JSON.stringify(buildExecutionAuditJSON(d), null, 2);

// ── REPRODUCTION FILE MAP ────────────────────────────────────────────────────
// One session → a tree of canonical artifacts. Every file below is produced from
// the SAME underlying ExportSession, so the package is internally consistent:
// one source of truth, many representations.

export const buildReproductionFileMap = (d: ExportSession): Array<{ path: string; content: string }> => {
  const { session, result } = d;
  const map = new Map<string, string>();
  const set = (path: string, content: string) => { map.set(path, content); };

  const argMap = buildArgumentMapJSON(d) as { claims?: Array<Record<string, unknown>>; objections?: Array<Record<string, unknown>> };

  // ── ROOT ──
  set('session/README.md', buildReproductionReadme(d));
  set('session/session.json', exportToJSON(d));
  set('session/cognitive-state.json', exportCognitiveState(d));
  set('session/execution-audit.json', exportExecutionAudit(d));

  // ── CONFIGURATION ──
  set('session/configuration/council.json', JSON.stringify({
    schemaVersion: 'council-config-v1',
    id: session.id,
    mode: session.councilMode,
    tieBreakRules: session.tieBreakRules,
    totalCouncilMembers: session.councilState.totalCouncilMembers,
    question: session.petitionerQuery,
  }, null, 2));
  set('session/configuration/personas.json', JSON.stringify({
    schemaVersion: 'persona-config-v1',
    personas: PERSONA_NAMES.map(name => {
      const spec = PERSONA_BIBLE[name];
      return spec ? {
        name, tagline: spec.tagline, archetype: spec.identity.archetype,
        coreValues: spec.psychology.coreValues, epistemology: spec.identity.epistemology,
        characteristicFailure: spec.cognition.characteristicFailure,
      } : { name };
    }),
  }, null, 2));
  set('session/configuration/rules.json', JSON.stringify({
    schemaVersion: 'decision-policy-v1',
    decisionPolicyUsed: result.decisionPolicyUsed || null,
    decisionAuthority: result.decisionAuthority || null,
    decisionMode: result.decisionMode || null,
    decisionStatus: result.decisionStatus || null,
  }, null, 2));

  // ── DELIBERATION ──
  set('session/deliberation/arguments.json', JSON.stringify(argMap, null, 2));
  set('session/deliberation/claims.json', JSON.stringify({
    schemaVersion: 'claims-v1',
    sessionId: session.id,
    claims: argMap?.claims || [],
  }, null, 2));
  set('session/deliberation/objections.json', JSON.stringify({
    schemaVersion: 'objections-v1',
    sessionId: session.id,
    objections: argMap?.objections || [],
  }, null, 2));

  // ── VOTING ──
  set('session/voting/round1.json', JSON.stringify({
    schemaVersion: 'round1-v1',
    sessionId: session.id,
    opinions: (result.opinions || []).map(op => ({ persona: op.persona, vote: op.vote, position: op.position, reason: op.reason, status: op.status })),
    voteTally: result.voteTally || null,
  }, null, 2));
  set('session/voting/round2.json', JSON.stringify({
    schemaVersion: 'round2-v1',
    sessionId: session.id,
    round2: result.round2Result || null,
    runoffResult: result.runoffResult || null,
  }, null, 2));
  set('session/voting/ballot-ledger.json', JSON.stringify(buildBallotLedgerJSON(d), null, 2));


  // ── CONSTITUTIONAL ──
  set('session/constitutional/state-transitions.json', JSON.stringify({
    schemaVersion: 'state-transitions-v1',
    sessionId: session.id,
    phases: session.councilState.phases || null,
    phaseTimeline: result.phaseTimeline || null,
    decision: {
      decisionAuthority: result.decisionAuthority,
      decisionMode: result.decisionMode,
      decisionStatus: result.decisionStatus,
      verdictLabel: result.verdictLabel,
      winner: result.winner,
    },
  }, null, 2));
  set('session/constitutional/arbitration.json', JSON.stringify({
    schemaVersion: 'arbitration-v1',
    invoked: result.decisionMode === 'fallback_tiebreak' || result.decisionAuthority === 'engagement_arbitration' || result.decisionAuthority === 'structured_tiebreak',
    resolution: result.resolution || null,
    tieInfo: result.tieInfo || null,
    decisionAuthority: result.decisionAuthority,
  }, null, 2));
  set('session/constitutional/deadlock.json', JSON.stringify({
    schemaVersion: 'deadlock-v1',
    sessionId: session.id,
    deadlockVerdict: result.deadlockVerdict || null,
    deadlockKind: result.epistemicTopology?.deadlockKind || null,
    round2Outcome: result.round2Result?.outcome || null,
    deadlockNote: result.round2Result?.deadlockNote || null,
    classification: { label: result.verdictLabel, decisionStatus: result.decisionStatus },
  }, null, 2));

  // ── EXECUTION ──
  set('session/execution/events.json', JSON.stringify({
    schemaVersion: 'events-v1',
    sessionId: session.id,
    events: result.events || session.events || [],
  }, null, 2));
  set('session/execution/provider-summary.json', JSON.stringify({
    schemaVersion: 'provider-summary-v1',
    sessionId: session.id,
    providerSummary: result.providerSummary || null,
  }, null, 2));
  set('session/execution/model-roster.json', JSON.stringify({
    schemaVersion: 'model-roster-v1',
    sessionId: session.id,
    modelRoster: result.modelRoster || session.modelRoster || [],
  }, null, 2));

  // ── AUDIT ──
  set('session/audit/audit-manifest.json', JSON.stringify({
    schemaVersion: 'audit-manifest-v1',
    sessionId: session.id,
    auditManifest: result.auditManifest || session.auditManifest || null,
  }, null, 2));

  // ── PUBLISH ──
  set('session/publish/formal-report.md', exportToMarkdown(d));
  set('session/publish/argument-map.md', exportArgumentMap(d));
  set('session/publish/dissent-report.md', exportDissentReport(d));
  set('session/publish/consensus-report.md', exportConsensusReport(d));
  set('session/publish/persona-dossiers.md', exportPersonaDossiers(d));
  set('session/publish/constitutional-record.md', exportConstitutionalRecord(d));
  set('session/publish/arbitration-record.md', exportArbitrationRecord(d));
  set('session/publish/void-record.md', exportVoidRecord(d));
  set('session/publish/podcast-script.md', exportToScript(d));
  set('session/publish/substack-draft.md', exportToSubstack(d));
  set('session/publish/session-dataset.csv', exportSessionDataset(d));
  set('session/publish/argument-dataset.csv', exportArgumentDataset(d));
  set('session/publish/persona-dataset.csv', exportPersonaDataset(d));
  set('session/publish/relationship-dataset.csv', exportRelationshipDataset(d));
  set('session/publish/argument-graph.json', exportArgumentGraphJSON(d));
  set('session/publish/argument-graph.graphml', exportArgumentGraphGraphML(d));

  return [...map.entries()].map(([path, content]) => ({ path, content }));
};


// ── README ───────────────────────────────────────────────────────────────────

const buildReproductionReadme = (d: ExportSession): string => {
  const { session } = d;
  return `# Reproduction Package — Council Session ${session.id}

This ZIP is a self-contained, hash-verifiable research specimen of a single
Roko's Council deliberation. It preserves the session as **knowledge** (argument
map, dissent, consensus), **evidence** (ballot ledger, constitutional record,
execution audit) and **reproduction** (configuration, deliberation, voting,
constitutional, execution, audit logs).

## One session → many representations → one source of truth

Every file is generated from the *same* audited \`session.json\`. The package never
re-derives facts — it re-renders the same underlying record into different
artifact shapes for different consumers.

## Layout

| Path | What it holds |
|------|---------------|
| \`session.json\` | The semantic session (the authoritative record). |
| \`cognitive-state.json\` | Per-persona psychology: beliefs, dissonance, persuasion, relationships. |
| \`execution-audit.json\` | Machine execution: providers, retries, latency, tokens, events, model roster. |
| \`configuration/\` | Council, personas, and decision rules as entered. |
| \`deliberation/\` | Arguments, claims, objections as structured data. |
| \`voting/\` | Round 1, Round 2, and the ballot ledger. |
| \`constitutional/\` | State transitions, arbitration, deadlock. |
| \`execution/\` | Event log, provider summary, model roster. |
| \`audit/\` | Audit manifest + content hashes. |
| \`publish/\` | Human-readable renderings (reports, dossiers, datasets, graph). |

## Verifiability

The \`audit/hashes.json\` records a content hash for every file in the package.
Re-run \`buildReproductionPackage\` on the same session and the hashes will match.
The decision-authority ladder is honored: a disputed or arbitrated outcome is
never presented as a clean consensus.

*Generated by Roko's Council — reproduction package v1*
`;
};

// ── MANIFEST + PACKAGE ───────────────────────────────────────────────────────

/** Builds the manifest + per-file hashes. Returns [manifestJson, hashesJson]. */
const buildManifestPayload = async (
  d: ExportSession,
  files: Array<{ path: string; content: string }>,
): Promise<{ manifest: string; hashes: string; contentHashes: Record<string, string> }> => {
  const contentHashes: Record<string, string> = {};
  const fileEntries = [];
  for (const f of files) {
    const bytes = new TextEncoder().encode(f.content).length;
    const hash = await hashContent(f.content);
    contentHashes[f.path] = hash;
    fileEntries.push({ path: f.path, bytes, hash });
  }
  const manifest = {
    schemaVersion: 'reproduction-manifest-v1',
    sessionId: d.session.id,
    question: d.session.petitionerQuery,
    mode: d.session.councilMode,
    generatedAt: new Date().toISOString(),
    sessionTimestamp: d.session.timestamp,
    fileCount: files.length,
    hashAlgorithm: 'sha256',
    files: fileEntries,
  };
  return {
    manifest: JSON.stringify(manifest, null, 2),
    hashes: JSON.stringify({
      schemaVersion: 'content-hashes-v1',
      hashAlgorithm: 'sha256',
      sessionId: d.session.id,
      hashes: contentHashes,
    }, null, 2),
    contentHashes,
  };
};

/**
 * Builds the reproduction package ZIP (ZIP ALL umbrella). Never mutates state;
 * returns a downloadable Blob and the suggested filename.
 */
export const buildReproductionPackage = async (
  result: CouncilResult,
  query: string,
  mode: string,
  timestamp: number,
  msgId: string,
): Promise<{ blob: Blob; filename: string }> => {
  const d = buildExportSession(result, query, mode, timestamp, msgId);
  const files = buildReproductionFileMap(d);
  const { manifest, hashes } = await buildManifestPayload(d, files);

  const zip = new JSZip();
  files.forEach(f => zip.file(f.path, f.content));
  zip.file('session/manifest.json', manifest);
  zip.file('session/audit/hashes.json', hashes);

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, filename: `roko-council-repro-${msgId}.zip` };
};

