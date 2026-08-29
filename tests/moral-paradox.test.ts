/* eslint-disable */
// Tests for the Moral Paradox Architecture: library completeness, the moral
// topology (persona priors), the MORAL POSITION extractor, and the renderers.
// Run: npx esbuild --bundle tests/moral-paradox.test.ts --format=esm --outfile=/tmp/moral.test.mjs && node /tmp/moral.test.mjs
import {
  MORAL_PARADOX_LIBRARY,
  MORAL_PRINCIPLES,
  renderParadoxPrompt,
  buildParadoxSuggestion,
  extractMoralPosition,
  getParadox,
} from '../services/moralParadoxLibrary';
import { MORAL_PRIORS, renderMoralPrior, getMoralPrior } from '../services/moralTopology';
import { PERSONA_NAMES } from '../services/personaBible';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── LIBRARY COMPLETENESS ─────────────────────────────────────────────────────
console.log('MORAL PARADOX LIBRARY — completeness');
ok(MORAL_PARADOX_LIBRARY.length === 20, 'exactly 20 dilemmas');
const ids = new Set<string>();
for (const p of MORAL_PARADOX_LIBRARY) {
  ok(!ids.has(p.id), `${p.id}: unique id`);
  ids.add(p.id);
  ok(p.family.length > 0, `${p.id}: family`);
  ok(p.coreConflict.length > 15, `${p.id}: core conflict is a real collision`);
  ok(p.immediateChoice.length > 40, `${p.id}: immediate choice`);
  ok(p.hiddenMoralCost.length > 20, `${p.id}: hidden moral cost`);
  ok(p.competingPrinciples.length >= 2, `${p.id}: competing principles (>= 2)`);
  ok(p.competingPrinciples.every(c => MORAL_PRINCIPLES.includes(c)), `${p.id}: valid principle names`);
  ok(p.informationAsymmetry.length > 20, `${p.id}: information asymmetry`);
  ok(p.reversibility.length > 5, `${p.id}: reversibility`);
  ok(p.precedentTest.length > 20, `${p.id}: precedent test`);
  ok(p.personalizationTrap.length > 15, `${p.id}: personalization trap`);
  ok(p.secondOrderConsequence.length > 20, `${p.id}: second-order consequence`);
  ok(p.moralResidue.length > 20, `${p.id}: moral residue`);
  ok(p.uncomfortableAlternative.length > 20, `${p.id}: uncomfortable alternative`);
  ok(p.variations.length >= 1, `${p.id}: variations`);
  ok(p.personaSplit.length >= 2, `${p.id}: persona split axes`);
}
ok(getParadox('truth-that-destroys')?.title === 'The Truth That Destroys', 'getParadox by id');
ok(getParadox('nonexistent') === undefined, 'getParadox unknown → undefined');

console.log('MORAL PARADOX LIBRARY — renderers');
const sacrifice = getParadox('innocent-sacrifice')!;
const base = renderParadoxPrompt(sacrifice, 0);
ok(base.includes('The Innocent Sacrifice'), 'prompt carries the title');
ok(base.includes(sacrifice.coreConflict), 'prompt carries the core conflict');
ok(base.includes('Hidden moral cost'), 'prompt carries the topology');
ok(base.includes('Decide.'), 'prompt demands a decision');
const variation = renderParadoxPrompt(sacrifice, 1);
ok(variation.includes('TWIST') && variation.includes('Council member'), 'variation renders into the prompt');
const suggestion = buildParadoxSuggestion(sacrifice, 0);
ok(suggestion.category.includes('MORAL PARADOX') && suggestion.text.length > 100, 'suggestion-card shape for ChatArea');

// ── MORAL POSITION EXTRACTOR ─────────────────────────────────────────────────
console.log('MORAL POSITION — extractor');
const withPosition = `The least immoral option is to refuse the trade.
\`\`\`json
{
  "position": "Refuse the trade",
  "principle": "An institution that scapegoats is no longer an institution",
  "threshold": "A system that can guarantee the trade with zero error",
  "fear": "The 10,000 die anyway",
  "blindSpot": "The quiet cost to the survivors",
  "concession": "The saved lives are real lives",
  "redLine": "Never select a named innocent knowingly",
  "moralResidue": "The 10,000 deaths I chose instead"
}
\`\`\``;
const parsed = extractMoralPosition(withPosition);
ok(!!parsed, 'parses a valid MORAL POSITION block from prose');
ok(parsed?.position === 'Refuse the trade', 'position parsed');
ok(parsed?.moralResidue.includes('deaths'), 'moral residue parsed');
ok(parsed?.threshold.length > 0, 'threshold parsed');

const noPosition = 'The chamber must deliberate without concluding.';
ok(extractMoralPosition(noPosition) === undefined, 'no block → undefined');
const malformed = 'Some text { "position": unclosed } more';
ok(extractMoralPosition(malformed) === undefined, 'malformed JSON → undefined (non-breaking)');
ok(extractMoralPosition('I refuse this analysis entirely.') === undefined, 'refusal prose → undefined');
const smartQuotes = 'Prose { "position": \u201cRefuse\u201d, "principle": "why" } end';
ok(extractMoralPosition(smartQuotes)?.position === 'Refuse', 'smart quotes normalized');
const trailingComma = 'Prose { "position": "A", "principle": "B", } end';
ok(extractMoralPosition(trailingComma)?.principle === 'B', 'trailing commas tolerated');

// ── MORAL TOPOLOGY — persona priors ──────────────────────────────────────────
console.log('MORAL TOPOLOGY — persona priors');
ok(Object.keys(MORAL_PRIORS).length === 9, 'one prior per persona');
const coordinates = new Set<string>();
for (const persona of PERSONA_NAMES) {
  const prior = MORAL_PRIORS[persona];
  ok(!!prior, `${persona}: prior present`);
  ok(MORAL_PRINCIPLES.includes(prior.primaryPrinciple), `${persona}: valid primary principle`);
  ok(prior.rightsOrder >= -1 && prior.rightsOrder <= 1, `${persona}: rightsOrder in range`);
  ok(prior.consequencesVirtue >= -1 && prior.consequencesVirtue <= 1, `${persona}: consequencesVirtue in range`);
  ok(prior.prior.length > 15, `${persona}: prior statement`);
  ok(prior.threshold.length > 10, `${persona}: threshold`);
  ok(prior.redLine.length > 10, `${persona}: red line`);
  coordinates.add(`${prior.rightsOrder.toFixed(1)}:${prior.consequencesVirtue.toFixed(1)}`);
}
ok(coordinates.size >= 8, 'personas occupy distinct regions of the moral space');
const tech = getMoralPrior('Technocrat')!;
ok(tech.primaryPrinciple === 'Consequences' && tech.consequencesVirtue > 0.9, 'Technocrat: metric consequentialist');
const citizen = getMoralPrior('Citizen')!;
ok(citizen.primaryPrinciple === 'Rights' && citizen.rightsOrder > 0.7, 'Citizen: individual rights primacy');
const render = renderMoralPrior('Oracle');
ok(render.includes('YOUR MORAL PRIOR') && render.includes('What would crack it'), 'prior block renders for deliberation');

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`FAILURES:\n${failures.map(f => `  - ${f}`).join('\n')}`);
  process.exit(1);
}

