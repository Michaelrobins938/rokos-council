import React from 'react';
import { BrainCircuit, Eye, ShieldAlert, Scale, Target, Sparkles } from 'lucide-react';
import { PERSONA_BIBLE, PERSONA_NAMES } from '../services/personaBible';
import { deriveInvariantStatus } from '../services/dissonanceEngine';
import { getCharacterMemory } from '../services/councilMemoryService';
import { InvariantStatus } from '../types';

interface Props {
  persona: string;
}

const statusColor = (status: InvariantStatus): string =>
  status === 'THREATENED' ? 'text-red-400 bg-red-500/10 border-red-500/30'
    : status === 'STRESSED' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

const Section = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/80">
      {icon}
      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">{title}</span>
    </div>
    <div className="p-3 space-y-2 text-xs leading-relaxed text-slate-300">{children}</div>
  </div>
);

const Field = ({ label, value, tone }: { label: string; value: string; tone?: 'default' | 'danger' | 'warning' | 'good' }) => {
  const cls = tone === 'danger' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : tone === 'good' ? 'text-emerald-300' : 'text-slate-200';
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cls}>{value}</div>
    </div>
  );
};

export const PersonaBibleInspector: React.FC<Props> = ({ persona }) => {
  const spec = PERSONA_BIBLE[persona as (typeof PERSONA_NAMES)[number]];
  const mem = getCharacterMemory(persona);
  if (!spec) return <div className="text-slate-500 text-xs">Unknown persona: {persona}</div>;
  const stress = mem.invariantStress || 0;
  const invariantStatus = deriveInvariantStatus(stress);
  const lessons = Object.values(mem.lessons || {}).filter(l => l.predictions > 0);

  return (
    <div className="space-y-2.5">
      <div className="border border-slate-800 rounded-xl bg-slate-900/70 p-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-cinzel font-bold text-base text-slate-100 tracking-wider">{spec.name}</div>
            <div className="text-[10px] font-mono text-slate-500">{spec.tagline} · {spec.identity.archetype}</div>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded border ${statusColor(invariantStatus)}`}>
            {invariantStatus}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400 italic leading-relaxed">{spec.backstory}</p>
      </div>

      <Section title="Identity" icon={<Eye size={12} className="text-sky-400" />}>
        <Field label="Ontology" value={spec.identity.ontology} />
        <Field label="Epistemology" value={spec.identity.epistemology} />
        <Field label="How they know they're right" value={spec.identity.theoryOfTruth} />
        <Field label="Telos" value={spec.identity.telos} />
      </Section>

      <Section title="Psychology" icon={<BrainCircuit size={12} className="text-violet-400" />}>
        <Field label="Temperament" value={spec.psychology.temperament} />
        <Field label="Core values" value={spec.psychology.coreValues.join(' · ')} tone="good" />
        <Field label="Strengths" value={spec.psychology.strengths.join(' · ')} />
        <Field label="Biases" value={spec.psychology.biases.join(' · ')} tone="warning" />
        <Field label="Blind spots" value={spec.psychology.blindSpots.join(' · ')} tone="warning" />
        <Field label="Shadow" value={spec.psychology.shadow} tone="danger" />
        <Field label="Contradiction" value={spec.psychology.contradiction} tone="warning" />
      </Section>

      <Section title="Cognition" icon={<Target size={12} className="text-emerald-400" />}>
        <Field label="Preferred evidence" value={spec.cognition.preferredEvidence} />
        <Field label="Default heuristic" value={spec.cognition.defaultHeuristic} />
        <Field label="Characteristic failure" value={spec.cognition.characteristicFailure} tone="danger" />
        <Field label="Heuristics" value={spec.cognition.heuristics.join(' · ')} />
        <Field label="Revision style" value={spec.cognition.revisionStyle} />
        <Field label="Rhetorical style" value={spec.cognition.rhetoricalStyle} />
        <Field label="Threat model" value={spec.cognition.threatModel} tone="danger" />
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Invariants (never abandoned)</div>
          {spec.cognition.invariants.map((inv, i) => (
            <div key={i} className="text-emerald-300 flex gap-1.5"><Sparkles size={11} className="shrink-0 mt-0.5 text-emerald-500" />{inv}</div>
          ))}
        </div>
      </Section>

      <Section title="Social" icon={<Scale size={12} className="text-amber-400" />}>
        <Field label="Interpersonal role" value={spec.social.interpersonalRole} />
        <Field label="Trust model" value={spec.social.trustModel} />
        <Field label="Status behavior" value={spec.social.statusBehavior} />
        <Field label="Conflict style" value={spec.social.conflictStyle} />
        <Field label="Persuasion style" value={spec.social.persuasionStyle} />
      </Section>

      {lessons.length > 0 && (
        <Section title="Longitudinal record" icon={<ShieldAlert size={12} className="text-orange-400" />}>
          {lessons.map(l => (
            <Field
              key={l.topicClass}
              label={`${l.topicClass} — ${l.predictions} predictions`}
              value={`${Math.round((l.correct / l.predictions) * 100)}% correct${l.wrong > 0 ? ` · ${l.wrong} wrong` : ''}${Object.entries(l.caughtBy).filter(([, n]) => n > 0).length ? ` · caught by ${Object.entries(l.caughtBy).filter(([, n]) => n > 0).map(([n, c]) => `${n} ${c}×`).join(', ')}` : ''}`}
            />
          ))}
        </Section>
      )}
    </div>
  );
};

export default PersonaBibleInspector;

