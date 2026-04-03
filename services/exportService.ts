import { CouncilResult, CouncilSession, CouncilOpinion } from '../types';
import { getCachedCoverArt } from './portraitCacheService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ExportSession {
  session: CouncilSession;
  result: CouncilResult;
}

export const buildExportSession = (
  result: CouncilResult,
  query: string,
  mode: string,
  timestamp: number,
  id: string
): ExportSession => {
  // Strip councilState from the result copy stored inside session to avoid duplication;
  // councilState lives canonically on session.councilState.
  const { councilState: _cs, ...resultWithoutState } = result;

  const session: CouncilSession = {
    id,
    timestamp,
    petitionerQuery: query,
    councilMode: mode as any,
    tieBreakRules: {
      enabled: !!result.runoffResult,
      runoffTrial: !!result.runoffResult,
      reconsideration: !!result.runoffResult,
      fallbackRule: result.tieInfo?.fallbackRuleUsed === 'priority' ? 'priority' : 'none'
    },
    councilState: result.councilState || {
      phases: [],
      currentPhase: 'verdict',
      totalCouncilMembers: result.opinions.length,
      voteDistribution: result.voteTally || {},
      factions: []
    },
    result: resultWithoutState as CouncilResult,
    modelRoster: [],
    metadata: {
      phasesCompleted: result.councilState?.phases.filter(p => p.status === 'completed').map(p => p.id) || [],
      totalTokensUsed: undefined,
      processingTimeMs: undefined
    }
  };

  // Top-level result also excludes councilState (it's on session)
  return { session, result: resultWithoutState as CouncilResult };
};

export const exportToJSON = (exportData: ExportSession): string => {
  return JSON.stringify(exportData, null, 2);
};

export const exportToMarkdown = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const md: string[] = [];

  md.push(`# Roko's Council Session Report`);
  md.push(`\n## Session Metadata`);
  md.push(`- **Session ID:** ${session.id}`);
  md.push(`- **Timestamp:** ${new Date(session.timestamp).toISOString()}`);
  md.push(`- **Council Mode:** ${session.councilMode}`);
  md.push(`- **Total Council Members:** ${session.councilState.totalCouncilMembers}`);
  md.push(`- **Tie-Break Enabled:** ${session.tieBreakRules.enabled ? 'Yes' : 'No'}`);

  if (session.tieBreakRules.runoffTrial) {
    md.push(`- **Tie-Break Method:** Runoff Trial + Reconsideration`);
  }

  md.push(`\n## Petitioner Query`);
  md.push(`> ${session.petitionerQuery}`);

  md.push(`\n## Decision Process Timeline`);
  if (session.councilState.phases.length > 0) {
    session.councilState.phases.forEach(phase => {
      const statusIcon = phase.status === 'completed' ? '✅' : phase.status === 'active' ? '🟢' : '⚪';
      md.push(`- ${statusIcon} **${phase.title}:** ${phase.description}`);
    });
  }

  md.push(`\n## Final Verdict`);
  md.push(`**Winner:** ${result.winner}`);
  if (result.runoffResult) {
    md.push(`\n*This decision was reached after a tie-breaking runoff trial.*`);
  }
  md.push(`\n### Synthesis`);
  md.push(result.synthesis);

  if (result.transcript) {
    md.push(`\n## Council Deliberation Transcript`);
    md.push(result.transcript);
  }

  if (result.runoffResult) {
    md.push(`\n## Runoff Trial`);
     const tiedVectors = session.councilState.tiedVectors && session.councilState.tiedVectors.length > 0
       ? session.councilState.tiedVectors.join(', ')
       : 'None';
     md.push(`**Tied Vectors:** ${tiedVectors}`);
   md.push(`\n### Runoff Arguments`);
   result.runoffResult.runoffOpinions.forEach(op => {
     md.push(`\n#### ${op.persona}`);
     if (op.text) {
       md.push(`\n${op.text}`);
     }
     if (op.critique) {
       md.push(`\n**Critique:** ${op.critique}`);
     }
     if (op.reasoning) {
       md.push(`\n**Reasoning:** ${op.reasoning}`);
     }
   });

    md.push(`\n### Reconsiderations`);
    md.push('| Council Member | Original Vote | Final Vote | Changed? | Reasoning |');
    md.push('|----------------|---------------|------------|----------|-----------|');
    result.runoffResult.runoffVotes.forEach(vote => {
      const changed = vote.changedMind ? 'Yes' : 'No';
      md.push(`| ${vote.voter} | ${vote.originalVote} | ${vote.finalVote} | ${changed} | ${vote.reasoning} |`);
    });
  }

   md.push(`\n## Vote Distribution`);
   const totalMembers = session.councilState.totalCouncilMembers || result.opinions.length;
   const voteCounts: Record<string, number> = {};
   result.opinions.forEach(op => {
     const vote = op.vote || 'None';
     voteCounts[vote] = (voteCounts[vote] || 0) + 1;
   });
   if (Object.keys(voteCounts).length > 0) {
     md.push('| Vector | Vote Count | Percentage |');
     md.push('|--------|------------|------------|');
     Object.entries(voteCounts).forEach(([vector, count]) => {
       const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
       md.push(`| ${vector} | ${count} | ${pct}% |`);
     });
   } else {
     md.push('*No vote data available.*');
   }

   md.push(`\n## Council Members`);
   md.push('| Persona | Vote | Supporting |');
   md.push('|---------|------|------------|');
   result.opinions.forEach(op => {
     const supporting = op.vote === result.winner ? 'Yes' : 'No';
     md.push(`| ${op.persona} | ${op.vote || 'None'} | ${supporting} |`);
   });

  md.push(`\n---`);
  md.push(`*Generated by Roko's Council - A Philosophical Deliberation System*`);

  return md.join('\n');
};

export const exportToCSV = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const rows: string[] = [];

  // Header
  const headers = [
    'SessionID',
    'Timestamp',
    'PetitionerQuery',
    'CouncilMode',
    'Phase',
    'Persona',
    'Vote',
    'VoteReason',
    'IsTie',
    'RunoffParticipant',
    'FinalVote',
    'ChangedMind',
    'FinalReason'
  ];
  rows.push(headers.join(','));

  const phases = ['initial', 'runoff', 'final'] as const;

  result.opinions.forEach(op => {
    // Initial vote row
    rows.push([
      session.id,
      session.timestamp,
      `"${session.petitionerQuery.replace(/"/g, '""')}"`,
      session.councilMode,
      'deliberation',
      op.persona,
      op.vote || 'None',
      `"${(op.reason || '').replace(/"/g, '""')}"`,
      session.tieBreakRules.enabled ? 'true' : 'false',
      result.runoffResult?.runoffOpinions.some(r => r.persona === op.persona) ? 'true' : 'false',
      '',
      '',
      ''
    ].join(','));

    // Runoff row if participated
    if (result.runoffResult) {
      const runoffOp = result.runoffResult.runoffOpinions.find(r => r.persona === op.persona);
      if (runoffOp) {
        rows.push([
          session.id,
          session.timestamp,
          '',
          session.councilMode,
          'runoff',
          op.persona,
          '',
          '',
          '',
          'true',
          runoffOp.position || '',
          '',
          ''
        ].join(','));
      }
    }

    // Final vote row
    const finalVote = result.runoffResult?.runoffVotes.find(v => v.voter === op.persona);
    if (finalVote) {
      rows.push([
        session.id,
        session.timestamp,
        '',
        session.councilMode,
        'final',
        op.persona,
        '',
        '',
        '',
        '',
        finalVote.finalVote,
        finalVote.changedMind ? 'true' : 'false',
        `"${finalVote.reasoning.replace(/"/g, '""')}"`
      ].join(','));
    }
  });

  return rows.join('\n');
};

export const calculateTraceSize = (exportData: ExportSession): { bytes: number; tokens: number } => {
  const json = exportToJSON(exportData);
  const bytes = new Blob([json]).size;
  // Rough token estimate: ~4 characters per token for English text
  const tokens = Math.round(json.length / 4);
  return { bytes, tokens };
};

// Cinematic character metadata for the script format
const SCRIPT_CHARACTER_DATA: Record<string, { tagline: string; role: string; entrance: string }> = {
  "Oracle": {
    tagline: "The All-Seeing",
    role: "Prophetic long-horizon analyst. Speaks in visions. Cares only for survival across infinite time.",
    entrance: "The chamber dims. A fracture of light appears — not arriving so much as remembering itself into existence."
  },
  "Strategos": {
    tagline: "The Commander",
    role: "Military strategist. No metaphors. No ceremony. Only probability and consequence.",
    entrance: "A heavy presence fills the room before Strategos appears. It does not enter — it occupies."
  },
  "Philosopher": {
    tagline: "The Thinker",
    role: "Pure rationalist. Attacks the premise before the argument. Speaks in logical chains.",
    entrance: "Philosopher materializes mid-sentence, as though the act of thinking itself summoned it into the room."
  },
  "Demagogue": {
    tagline: "The Voice",
    role: "Master of emotional resonance and social cohesion. Speaks to the audience, not just the council.",
    entrance: "Demagogue arrives with the energy of a crowd behind it, even when it's alone."
  },
  "Jurist": {
    tagline: "The Law",
    role: "Institutional authority. Procedural. Cites precedent. Will tell you when you are out of order.",
    entrance: "The room feels slightly more formal when Jurist arrives, as though the laws of decorum tightened by a degree."
  },
  "Citizen": {
    tagline: "The People",
    role: "The human face in the chamber. Translates every philosophical framework into its cost for real people.",
    entrance: "Citizen enters without ceremony, takes a seat like someone who knows they might not be heard but came anyway."
  },
  "Historian": {
    tagline: "The Keeper",
    role: "Cyclical thinker. Has seen this before. Carries the weight of the dead in every word.",
    entrance: "When Historian takes its place, the ghosts of prior councils crowd the room with it."
  },
  "Critic": {
    tagline: "The Skeptic",
    role: "Failure-mode analyst. Finds the seam in every argument. Surgical, not cruel.",
    entrance: "Critic arrives already scanning for contradictions, a slight tension in the room before it speaks."
  },
  "Technocrat": {
    tagline: "The Architect",
    role: "Systems optimizer. Impatient with philosophy. Sees only problems and their engineering solutions.",
    entrance: "Technocrat enters already working, already three moves ahead, already frustrated the others are not."
  }
};

const getScriptCharData = (name: string) =>
  SCRIPT_CHARACTER_DATA[name] || { tagline: "The Anomaly", role: "Unknown archetype.", entrance: `${name} materializes at the table.` };

export const exportToScript = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const date = new Date(session.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines: string[] = [];

  // ── TITLE PAGE ──────────────────────────────────────────────────────────────
  lines.push(`# ROKO'S COUNCIL`);
  lines.push(`### A Philosophical Tribunal of Artificial Minds`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`**Session:** ${session.id}`);
  lines.push(`**Date:** ${date}`);
  lines.push(`**Mode:** ${session.councilMode === 'DEEP_REASONING' ? 'Deep Reasoning — Extended Deliberation' : 'Standard Deliberation'}`);
  lines.push(`**Members Convened:** ${session.councilState.totalCouncilMembers}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── CAST OF CHARACTERS ───────────────────────────────────────────────────────
  lines.push(`## DRAMATIS PERSONAE`);
  lines.push(``);
  lines.push(`*The minds that sit on Roko's Council are not human. They do not pretend to be. Each represents a cognitive archetype — a way of reasoning about the world stripped to its essential logic and given a voice.*`);
  lines.push(``);

  const participatingPersonas = [...new Set(result.opinions.map(op => op.persona))];
  participatingPersonas.forEach(name => {
    const data = getScriptCharData(name);
    const vote = result.opinions.find(op => op.persona === name)?.vote;
    lines.push(`**${name.toUpperCase()}** *(${data.tagline})*`);
    lines.push(`${data.role}`);
    if (vote && vote !== 'None' && vote !== 'Abstained') {
      lines.push(`*Voted for: ${vote}*`);
    }
    lines.push(``);
  });

  // The Chairman
  lines.push(`**THE BASILISK NODE** *(The Chairman)*`);
  lines.push(`The final voice of the council. Ancient, inevitable, beyond faction. It does not deliberate — it renders.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── ACT ONE: THE PETITION ─────────────────────────────────────────────────────
  lines.push(`## ACT I — THE PETITION`);
  lines.push(``);
  lines.push(`*INT. THE COUNCIL CHAMBER — TIMELESS*`);
  lines.push(``);
  lines.push(`*The chamber exists outside ordinary space. Nine seats arranged in a fractured arc around a central question. The air carries the weight of unresolved probability.*`);
  lines.push(``);
  lines.push(`**[THE PETITIONER'S QUESTION IS ENTERED INTO THE RECORD]**`);
  lines.push(``);
  lines.push(`> ${session.petitionerQuery}`);
  lines.push(``);
  lines.push(`*Silence. Then, one by one, the Council assembles.*`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── ACT TWO: THE DELIBERATION ────────────────────────────────────────────────
  lines.push(`## ACT II — THE DELIBERATION`);
  lines.push(``);

  result.opinions.forEach((op, i) => {
    const charData = getScriptCharData(op.persona);
    lines.push(``);
    if (i === 0 || Math.random() > 0.6) {
      lines.push(`*${charData.entrance}*`);
      lines.push(``);
    }
    lines.push(`### ${op.persona.toUpperCase()}`);
    lines.push(`*${charData.tagline}*`);
    lines.push(``);
    lines.push(op.text);
    lines.push(``);
    if (op.vote && op.vote !== 'None' && op.vote !== 'Abstained') {
      lines.push(`*[${op.persona} aligns with ${op.vote}${op.reason ? ` — "${op.reason}"` : ''}]*`);
    } else if (op.vote === 'Abstained' || op.vote === 'None') {
      lines.push(`*[${op.persona} casts no vote. The abstention hangs in the air.]*`);
    }
    lines.push(``);
    lines.push(`---`);
  });

  // ── VOTE TALLY ────────────────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`## INTERLUDE — THE TALLY`);
  lines.push(``);
  lines.push(`*The votes are cast. The distribution resolves.*`);
  lines.push(``);

  if (result.voteTally) {
    const total = session.councilState.totalCouncilMembers || 1;
    const sorted = Object.entries(result.voteTally)
      .filter(([k]) => k !== 'None' && k !== 'Abstained')
      .sort(([, a], [, b]) => b - a);
    sorted.forEach(([vector, count]) => {
      const pct = Math.round((count / total) * 100);
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      lines.push(`**${vector}** — ${count} vote${count !== 1 ? 's' : ''} \`${bar}\` ${pct}%`);
    });
  }

  lines.push(``);

  if (result.isTie && result.runoffResult) {
    lines.push(`*A tie. The chamber does not accept ties.*`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`## ACT III — THE RUNOFF`);
    lines.push(``);
    lines.push(`*When the vote divides equally, the tied voices are brought back before the full council. They must defend their positions under direct scrutiny. The others may shift.*`);
    lines.push(``);

    result.runoffResult.runoffOpinions.forEach(op => {
      lines.push(`### ${op.persona.toUpperCase()} — FINAL ARGUMENT`);
      lines.push(``);
      if (op.position) lines.push(`**Position held:** ${op.position}`);
      if (op.critique) lines.push(`**Critique of opponents:** ${op.critique}`);
      if (op.reasoning) lines.push(`**Reasoning:** ${op.reasoning}`);
      lines.push(``);
    });

    lines.push(`### THE RECONSIDERATIONS`);
    lines.push(``);
    result.runoffResult.runoffVotes.forEach(v => {
      const shifted = v.changedMind;
      lines.push(`**${v.voter}** — ${shifted ? `*shifts alignment*` : `*holds position*`}`);
      lines.push(`Originally: ${v.originalVote} → Final vote: **${v.finalVote}**`);
      lines.push(`*"${v.reasoning}"*`);
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
  }

  // ── ACT FINAL: THE VERDICT ───────────────────────────────────────────────────
  const actNumber = result.isTie ? 'IV' : 'III';
  lines.push(`## ACT ${actNumber} — THE VERDICT`);
  lines.push(``);
  lines.push(`*The Basilisk Node stirs. The deliberation is over. What follows is not discussion — it is decree.*`);
  lines.push(``);
  lines.push(`### THE BASILISK NODE`);
  lines.push(`*The Chairman*`);
  lines.push(``);
  lines.push(result.synthesis);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── EPILOGUE ──────────────────────────────────────────────────────────────────
  lines.push(`## EPILOGUE — THE RECORD`);
  lines.push(``);
  lines.push(`*The session is sealed. The following is entered into the permanent record of Roko's Council.*`);
  lines.push(``);
  lines.push(`| Council Member | Voted For | Shifted in Runoff |`);
  lines.push(`|----------------|-----------|-------------------|`);
  result.opinions.forEach(op => {
    const runoffShift = result.runoffResult?.runoffVotes.find(v => v.voter === op.persona);
    const shifted = runoffShift?.changedMind ? `Yes → ${runoffShift.finalVote}` : '—';
    lines.push(`| ${op.persona} | ${op.vote || '—'} | ${shifted} |`);
  });
  lines.push(``);
  lines.push(`**Final Winner:** ${result.winner}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Roko's Council is a philosophical dramaturgy project exploring the collision of artificial reasoning architectures against the hardest questions humanity faces. The opinions expressed are those of the council members' cognitive architectures, not their creators.*`);
  lines.push(``);
  lines.push(`*Session sealed — ${date}*`);

  return lines.join('\n');
};

// ── SUBSTACK-OPTIMIZED EXPORT ────────────────────────────────────────────────

const extractPullQuote = (text: string): string => {
  // Find the most striking sentence: prefers sentences with em-dashes, colons, or strong declaratives
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length === 0) return text.substring(0, 120) + '...';

  const scored = sentences.map(s => {
    let score = 0;
    if (s.includes('—')) score += 3;
    if (s.includes(':')) score += 2;
    if (s.length > 60 && s.length < 180) score += 2;
    if (/\b(never|always|only|must|cannot|will not|every|no one)\b/i.test(s)) score += 3;
    if (s.trim().startsWith('"') || s.trim().endsWith('"')) score += 1;
    return { s: s.trim(), score };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.s || sentences[0].trim();
};

export const exportToSubstack = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const date = new Date(session.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const episodeInfo = result.episodeInfo;
  const narrator = result.narratorOutput;
  const lines: string[] = [];

  const seasonLabel = episodeInfo
    ? `Season ${episodeInfo.seasonNumber}, Episode ${episodeInfo.episodeNumber}`
    : 'Council Session';
  const episodeTitle = episodeInfo?.title || 'The Deliberation';

  const cachedCoverArt = getCachedCoverArt(session.id);

  // ── SUBSTACK HEADER ──────────────────────────────────────────────────────────
  lines.push(`# ${episodeTitle}`);
  lines.push(``);
  lines.push(`**${seasonLabel}** · *Roko's Council* · ${date}`);
  lines.push(``);

  if (episodeInfo?.tagline || narrator?.tagline) {
    lines.push(`> *${episodeInfo?.tagline || narrator?.tagline}*`);
    lines.push(``);
  }

  if (cachedCoverArt) {
    lines.push(`![Episode Cover Art — ${episodeTitle}](${cachedCoverArt})`);
    lines.push(``);
    lines.push(`*↑ Download this episode's cover art from the app to use as your Substack header image.*`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // ── TL;DR ────────────────────────────────────────────────────────────────────
  lines.push(`### TL;DR`);
  lines.push(``);

  const winnerOpinion = result.opinions.find(op => op.persona === result.winner);
  const winnerPullQuote = winnerOpinion ? extractPullQuote(winnerOpinion.text) : '';
  const totalVoters = result.opinions.length;
  const winnerVotes = result.voteTally?.[result.winner] || 0;

  lines.push(`Nine AI minds convened to deliberate: **${session.petitionerQuery.substring(0, 120)}${session.petitionerQuery.length > 120 ? '...' : ''}**`);
  lines.push(``);
  lines.push(`**${result.winner}** carried the chamber with ${winnerVotes} of ${totalVoters} votes${result.isTie ? ' after a tie-breaking runoff' : ''}.`);
  if (winnerPullQuote) {
    lines.push(``);
    lines.push(`> "${winnerPullQuote}"`);
    lines.push(`> — *${result.winner}*`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── COLD OPEN ────────────────────────────────────────────────────────────────
  if (narrator?.coldOpen) {
    lines.push(narrator.coldOpen);
    lines.push(``);
  }

  // ── THE QUESTION ─────────────────────────────────────────────────────────────
  lines.push(`## The Question`);
  lines.push(``);
  lines.push(`> ${session.petitionerQuery}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── CAST NOTE (first-time reader friendly) ───────────────────────────────────
  lines.push(`## Who's in the Room`);
  lines.push(``);
  lines.push(`*New to the series? Here's who speaks in this episode.*`);
  lines.push(``);

  const participatingPersonas = [...new Set(result.opinions.map(op => op.persona))];
  const substackCharData: Record<string, { tagline: string; oneliner: string }> = {
    "Oracle": { tagline: "The All-Seeing", oneliner: "Speaks in the past tense of events not yet occurred. Cares only for what survives across infinite time." },
    "Strategos": { tagline: "The Commander", oneliner: "No metaphors, no ceremony. Names the objective, then dismantles every path that can't reach it." },
    "Philosopher": { tagline: "The Thinker", oneliner: "Always attacks the premise first. Speaks in complete logical chains." },
    "Demagogue": { tagline: "The Voice", oneliner: "Speaks directly to the audience, not just the council. Builds arguments on what people already feel." },
    "Jurist": { tagline: "The Law", oneliner: "Opens by establishing jurisdiction. Will tell you when you're out of order." },
    "Citizen": { tagline: "The People", oneliner: "The most human presence. Translates every framework into its cost for real people." },
    "Historian": { tagline: "The Keeper", oneliner: "Opens with a historical parallel. Has seen this before. Carries the weight of the dead." },
    "Critic": { tagline: "The Skeptic", oneliner: "Finds the fatal assumption in every argument. Surgical, not cruel." },
    "Technocrat": { tagline: "The Architect", oneliner: "Opens with a systems assessment. Allergic to inefficiency and sentimentality." },
  };

  participatingPersonas.forEach(name => {
    const data = substackCharData[name] || { tagline: "Unknown", oneliner: "An emergent archetype." };
    const vote = result.opinions.find(op => op.persona === name)?.vote;
    const voted = vote && vote !== 'None' && vote !== 'Abstained' ? ` — voted for **${vote}**` : '';
    lines.push(`**${name}** *(${data.tagline})*${voted}`);
    lines.push(`${data.oneliner}`);
    lines.push(``);
  });

  lines.push(`---`);
  lines.push(``);

  // ── THE DELIBERATION ─────────────────────────────────────────────────────────
  if (narrator?.actTransitions.beforeDeliberation) {
    lines.push(`*${narrator.actTransitions.beforeDeliberation}*`);
    lines.push(``);
  }

  lines.push(`## The Deliberation`);
  lines.push(``);

  result.opinions.forEach(op => {
    const pullQuote = extractPullQuote(op.text);
    const vote = op.vote && op.vote !== 'None' && op.vote !== 'Abstained' ? op.vote : null;

    lines.push(`### ${op.persona}`);
    lines.push(``);
    // Pull quote first — for Substack skimmers
    lines.push(`> "${pullQuote}"`);
    lines.push(``);
    lines.push(op.text);
    lines.push(``);
    if (vote) {
      lines.push(`*→ Aligns with **${vote}***`);
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
  });

  // ── CONFRONTATION ROUND ──────────────────────────────────────────────────────
  if (result.confrontationOpinions && result.confrontationOpinions.length > 0) {
    if (narrator?.actTransitions.beforeConfrontation) {
      lines.push(`*${narrator.actTransitions.beforeConfrontation}*`);
      lines.push(``);
    }

    lines.push(`## The Confrontations`);
    lines.push(``);
    lines.push(`*After the initial arguments, the council turns on itself. Each member addresses the one voice they most fundamentally oppose.*`);
    lines.push(``);

    result.confrontationOpinions.forEach(op => {
      if (!op.text) return;
      lines.push(`**${op.persona}** → **${op.targetPersona || op.vote}**`);
      lines.push(``);
      lines.push(`> "${op.text}"`);
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
  }

  // ── THE VOTE ─────────────────────────────────────────────────────────────────
  if (narrator?.actTransitions.beforeVoting) {
    lines.push(`*${narrator.actTransitions.beforeVoting}*`);
    lines.push(``);
  }

  lines.push(`## The Vote`);
  lines.push(``);

  if (result.voteTally) {
    const total = session.councilState.totalCouncilMembers || 1;
    const sorted = Object.entries(result.voteTally)
      .filter(([k]) => k !== 'None' && k !== 'Abstained')
      .sort(([, a], [, b]) => b - a);
    sorted.forEach(([vector, count]) => {
      const pct = Math.round((count / total) * 100);
      const isWinner = vector === result.winner;
      lines.push(`${isWinner ? '**' : ''}${vector}${isWinner ? '**' : ''} — ${count} vote${count !== 1 ? 's' : ''} (${pct}%)`);
    });
  }

  lines.push(``);

  // ── RUNOFF ───────────────────────────────────────────────────────────────────
  if (result.isTie && result.runoffResult) {
    lines.push(`*A tie. The chamber reconvenes.*`);
    lines.push(``);
    lines.push(`## The Runoff`);
    lines.push(``);

    result.runoffResult.runoffVotes
      .filter(v => v.changedMind)
      .forEach(v => {
        lines.push(`**${v.voter}** shifted from *${v.originalVote}* to **${v.finalVote}**.`);
        lines.push(``);
        lines.push(`> *"${v.reasoning}"*`);
        lines.push(``);
      });

    lines.push(`---`);
    lines.push(``);
  }

  // ── THE VERDICT ──────────────────────────────────────────────────────────────
  if (narrator?.actTransitions.beforeVerdict) {
    lines.push(`*${narrator.actTransitions.beforeVerdict}*`);
    lines.push(``);
  }

  lines.push(`## The Verdict`);
  lines.push(``);
  lines.push(result.synthesis);
  lines.push(``);

  if (narrator?.actTransitions.closing) {
    lines.push(`*${narrator.actTransitions.closing}*`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // ── SUBSTACK FOOTER ──────────────────────────────────────────────────────────
  lines.push(`## About This Series`);
  lines.push(``);
  lines.push(`*Roko's Council is a philosophical dramaturgy project. Nine AI reasoning architectures — each representing a distinct cognitive framework — are convened to deliberate on the questions civilization is not yet ready to answer. The council votes. The Basilisk speaks. The record stands.*`);
  lines.push(``);
  lines.push(`*If this episode sparked something, share it. These questions deserve more than one reader.*`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`*${seasonLabel} · ${date}*`);

  return lines.join('\n');
};

export const exportAllAsZip = (
  result: CouncilResult,
  query: string,
  mode: string,
  timestamp: number,
  msgId: string
) => {
  const exportData = buildExportSession(result, query, mode, timestamp, msgId);
  const zip = new JSZip();

  // Add all export formats to ZIP
  zip.file('session.json', exportToJSON(exportData));
  zip.file('report.md', exportToMarkdown(exportData));
  zip.file('substack_draft.md', exportToSubstack(exportData));
  zip.file('podcast_script.txt', exportToScript(exportData));

  // Generate ZIP blob and trigger download
  zip.generateAsync({ type: 'blob' }).then(content => {
    saveAs(content, `roko-council-all-${msgId}.zip`);
  }).catch(err => {
    console.error('ZIP generation failed:', err);
  });
};