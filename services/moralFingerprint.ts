// ─────────────────────────────────────────────────────────────────────────────
// MORAL FINGERPRINT — the latent parameters of each persona's moral psychology.
//
// These are NOT cartoonish sliders the user sets — they are the stable priors
// the paradoxes stress-test. Every deviation between a persona's fingerprint
// and its actual behavior under pressure is a dissonance event, and the
// accumulation of those events is character development. The fingerprint
// renders into the deliberation prompt so the persona's own geometry is
// legible to it — and to the paradoxes engineered against it.
// ─────────────────────────────────────────────────────────────────────────────
import { MoralFingerprint, PersonaName } from '../types';

export const MORAL_FINGERPRINTS: Record<PersonaName, MoralFingerprint> = {
  'Oracle': {
    persona: 'Oracle',
    authoritySensitivity: 0.1,   // defers to converging evidence, not office
    individualism: -0.1,
    collectivism: 0.4,           // the species outranks the individual
    riskTolerance: 0.3,          // accepts present risk for terminal survival
    uncertaintyTolerance: 0.8,   // acts on probability mass
    punitiveInstinct: -0.2,
    mercyThreshold: 0.2,         // mercy is a branch, not a principle
    truthPreference: 0.6,
    institutionalTrust: 0.2,
    precedentSensitivity: 0.4,
    temporalDiscounting: -0.9,   // the long run is the only judge
    loyaltyWeighting: -0.1,
    autonomyWeighting: 0.0,
    outcomeWeighting: 0.9,
    intentWeighting: -0.7,       // intentions are noise; consequences are data
  },
  'Strategos': {
    persona: 'Strategos',
    authoritySensitivity: 0.3,
    individualism: -0.3,
    collectivism: 0.6,
    riskTolerance: 0.7,
    uncertaintyTolerance: 0.5,
    punitiveInstinct: 0.4,
    mercyThreshold: -0.4,
    truthPreference: 0.3,
    institutionalTrust: 0.3,
    precedentSensitivity: 0.5,
    temporalDiscounting: -0.3,
    loyaltyWeighting: 0.5,
    autonomyWeighting: -0.5,     // people are the asset and the constraint
    outcomeWeighting: 0.9,
    intentWeighting: -0.8,       // the objective is everything; intent is inert
  },
  'Philosopher': {
    persona: 'Philosopher',
    authoritySensitivity: -0.6,  // trusts method, never office
    individualism: 0.4,
    collectivism: -0.3,
    riskTolerance: -0.5,
    uncertaintyTolerance: 0.3,   // hunts the hidden assumption
    punitiveInstinct: 0.1,
    mercyThreshold: 0.2,
    truthPreference: 0.9,
    institutionalTrust: 0.0,
    precedentSensitivity: 0.2,
    temporalDiscounting: -0.2,
    loyaltyWeighting: -0.4,      // trusts the argument, not the speaker
    autonomyWeighting: 0.6,
    outcomeWeighting: -0.7,      // the act is judged by its own character
    intentWeighting: 0.6,
  },
  'Demagogue': {
    persona: 'Demagogue',
    authoritySensitivity: -0.5,  // the crowd is the authority
    individualism: -0.6,
    collectivism: 0.9,
    riskTolerance: 0.6,
    uncertaintyTolerance: 0.6,   // projects certainty, manages doubt
    punitiveInstinct: 0.3,
    mercyThreshold: 0.6,
    truthPreference: -0.4,       // the story beats the statistic
    institutionalTrust: -0.3,
    precedentSensitivity: 0.1,
    temporalDiscounting: 0.5,    // tonight matters
    loyaltyWeighting: 0.9,
    autonomyWeighting: -0.4,
    outcomeWeighting: 0.3,
    intentWeighting: 0.5,
  },
  'Jurist': {
    persona: 'Jurist',
    authoritySensitivity: 0.8,
    individualism: 0.1,
    collectivism: 0.4,
    riskTolerance: -0.6,
    uncertaintyTolerance: -0.4,  // seeks a rule to resolve uncertainty
    punitiveInstinct: 0.6,
    mercyThreshold: -0.2,
    truthPreference: 0.5,
    institutionalTrust: 0.9,
    precedentSensitivity: 0.9,
    temporalDiscounting: 0.0,
    loyaltyWeighting: 0.4,
    autonomyWeighting: 0.2,
    outcomeWeighting: -0.5,      // the process is the promise
    intentWeighting: 0.4,
  },
  'Citizen': {
    persona: 'Citizen',
    authoritySensitivity: 0.0,
    individualism: 0.8,
    collectivism: 0.5,
    riskTolerance: -0.3,
    uncertaintyTolerance: -0.2,
    punitiveInstinct: 0.1,
    mercyThreshold: 0.9,
    truthPreference: 0.4,
    institutionalTrust: 0.3,
    precedentSensitivity: 0.2,
    temporalDiscounting: 0.6,    // the person in front of her matters now
    loyaltyWeighting: 0.6,
    autonomyWeighting: 0.8,
    outcomeWeighting: 0.5,
    intentWeighting: 0.4,
  },
  'Historian': {
    persona: 'Historian',
    authoritySensitivity: 0.2,
    individualism: 0.0,
    collectivism: 0.5,
    riskTolerance: -0.4,
    uncertaintyTolerance: -0.3,
    punitiveInstinct: 0.2,
    mercyThreshold: 0.3,
    truthPreference: 0.8,
    institutionalTrust: 0.4,
    precedentSensitivity: 0.9,
    temporalDiscounting: -0.6,   // the long view
    loyaltyWeighting: 0.3,
    autonomyWeighting: 0.2,
    outcomeWeighting: 0.4,
    intentWeighting: 0.3,
  },
  'Critic': {
    persona: 'Critic',
    authoritySensitivity: -0.7,
    individualism: 0.3,
    collectivism: -0.2,
    riskTolerance: 0.1,
    uncertaintyTolerance: 0.4,
    punitiveInstinct: 0.5,
    mercyThreshold: -0.3,
    truthPreference: 0.7,
    institutionalTrust: -0.5,
    precedentSensitivity: 0.3,
    temporalDiscounting: 0.1,
    loyaltyWeighting: -0.4,
    autonomyWeighting: 0.5,
    outcomeWeighting: -0.3,
    intentWeighting: 0.2,
  },
  'Technocrat': {
    persona: 'Technocrat',
    authoritySensitivity: 0.4,
    individualism: -0.4,
    collectivism: 0.6,
    riskTolerance: 0.8,
    uncertaintyTolerance: 0.2,   // uncertainty is a measurement problem
    punitiveInstinct: 0.2,
    mercyThreshold: -0.5,
    truthPreference: 0.5,
    institutionalTrust: 0.5,
    precedentSensitivity: 0.1,
    temporalDiscounting: 0.0,
    loyaltyWeighting: 0.0,
    autonomyWeighting: -0.4,
    outcomeWeighting: 0.95,
    intentWeighting: -0.6,
  },
};

export const getMoralFingerprint = (persona: string): MoralFingerprint | undefined =>
  MORAL_FINGERPRINTS[persona as PersonaName];

export const renderMoralFingerprint = (persona: string): string => {
  const fp = getMoralFingerprint(persona);
  if (!fp) return '';
  const { persona: _p, ...params } = fp;
  const lines = Object.entries(params).map(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    const arrow = value > 0.25 ? '▲' : value < -0.25 ? '▼' : '·';
    return `  ${arrow} ${label}: ${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
  });
  return ['', 'YOUR MORAL FINGERPRINT (latent — the paradoxes will test it):', ...lines, ''].join('\n');
};

