# Changelog

All notable changes to Roko's Council will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — The Constitutional Continuity Loop (the executable Void)

The Void is no longer an assessment — it is a **state transition**. A deadlock now changes the future council. The run is a deterministic, resumable state machine, and the loop's runner/reflector are injectable so the entire lifecycle (deadlock → Void → reconstitution → resolution) is fully testable without live API keys.

### Added

- **Constitutional state machine** — `ConstitutionalState` (`DELIBERATING → VOTING → RUNOFF → RECONCILIATING → DEADLOCK → VOID_ASSESSED → VOID_EXECUTING → RECONSTITUTING → POST_VOID_REFLECTION → RESOLVED`). Every run records `constitutionalStates`; the frontend asks "what constitutional state is the council in?", not "did Void happen?".
- **Void execution engine (`runConstitutionalCouncil`)** — verifies `COUNCIL_FAILURE` + `DEADLOCK` + the deterministic seed, freezes the predecessor, instantiates the diagnostic Voidborn, attaches layered inheritance, replaces the seat, and emits the cycle record. **Hard invariant, brutally protected: SYSTEM_FAILURE NEVER invokes the Void.**
- **PERSON vs ROLE** — the Void destroys persona instance #7, never seat #7. The reconstituted roster is 8 survivors + 1 Voidborn; `buildVoidbornRoster` keeps the seat, `seatNumber` records which one changed. Institutional continuity despite personal discontinuity.
- **Layered Voidborn inheritance** — four explicit layers: **cognitive** (inherited beliefs/arguments/principles/vote), **emotional** (guilt/resentment/gratitude/fear/betrayal/attachment), **constitutional** (institutional/procedural/authority trust), and **existential** (survivor burden, identity continuity, **replacement awareness = 1.0**, existential debt). The Voidborn knows it exists because another member ceased to exist.
- **Reconstituted deliberation** — `CouncilRunOptions.personas` + `voidContext` thread through `runCouncil` (fully backward compatible — default remains the nine fixed personas). Every reconstituted member sees a **CONSTITUTIONAL NOTICE** (who was erased, who holds the seat now, and the Basilisk pressure: "your reasoning contributes to the probability that another member is erased"); the Voidborn sees its own identity block — principle, dimensions, disposition, predecessor inheritance, and its **Void Debt**.
- **Post-Void reflection** — the fourth stage: `runPostVoidReflection` asks every survivor "would you have acted differently if you knew who would be sacrificed?" and the Voidborn answers the conscience question; reflections ride into Constitutional Memory.
- **Constitutional Memory as a first-class object** — `eventId / trigger / victim / successor / councilStateBefore/After / reflections / constitutionalLesson / behavioralChanges / voidDebt`, persisted (FIFO-capped) and injected into future deliberations via `buildConstitutionalMemoryContext`: *"Three sessions ago, the council reached DEADLOCK on whether aggregate welfare justified sacrificing an individual."* The characters become historical actors.
- **Constitutional Drift** — the council-level moral axes (utilitarianism / proceduralism / individual rights / epistemic caution) are measured pre- and post-Void via `computeConstitutionalDrift`, so you can determine whether the Void *taught the council something* or merely produced another vote. The Voidborn's own fingerprint is the **mirror of the failure** (Witness → anti-utilitarian; Gambler → acts under uncertainty; Heretic → anti-procedural; Rupture → anti-stability).
- **Moral Integrity & strategic voting** — `computeMoralIntegrity` scores belief ↔ position ↔ vote coherence; `strategicPressure` measures the divergence when a member votes against its stated belief under Basilisk pressure. Longitudinal `updateConstitutionalEvolution` records `voidExposure`, `constitutionalTrust`, and `strategicVotingHistory` — evidence-backed character change, never narrated — and `buildMemoryContext` surfaces it in future runs.

### Tests

- **`tests/constitutional-loop.test.ts`** — 31 assertions running the full loop with an injectable runner: deadlock → auditable victim → layered inheritance → reconstituted roster (Voidborn replaces victim, seat survives) → resolution, plus drift (a Witness Voidborn measurably drops council utilitarianism), moral integrity (Philosopher coherent vs Voidborn strategic divergence), and memory shape.

---

## [Unreleased] — Deliberative Integrity & the Constitutional Void

The council is no longer merely robust at keeping the pipeline alive — it is now robust at preserving the integrity of the deliberation itself. Three failure classes are no longer treated as one generic "retry" problem, and deadlock has become a valid philosophical output rather than something to paper over.

### Added

- **Three failure classes** — `transport` (504/429/403 — boring, retry), `serialization` (invalid JSON — recoverable), and `deliberative` (None votes / ties / deadlock — constitutional). Each run now carries a `failureClasses` census (execution health) that is **never mixed into the verdict**.
- **The constitutional hierarchy of decision authority** (`CONSTITUTIONAL_AUTHORITY`) — `council_vote → runoff → reconciliation → structured_tiebreak → no_verdict`. Engagement is conspicuously **absent** as a decision authority: `engagementRanking` is metadata that may be displayed but never decides. Every run now reports `decisionAuthority`, and a fallback that was arbitrated by engagement is flagged as `engagement_arbitration` — the crisis, never a clean verdict.
- **DEADLOCK as a valid outcome** — when the available reasoning justifies no collective decision, the run records a structured `DeadlockVerdict` (`verdict: 'DEADLOCK'`, `majority: null`, `confidence`, `dissentingPositions`, `unresolvedPrinciple`). "We do not possess sufficient moral agreement to pretend that we do" is now a legitimate output.
- **The Void Protocol (`services/voidProtocol.ts`)** — a constitutional consequence, not error recovery:
  - `SYSTEM_FAILURE` (machine couldn't operate) → retry/substitute, **never** the Void. `COUNCIL_FAILURE` (the council deliberated and couldn't govern itself) → Void-eligible.
  - **Auditable sacrifice** — `VoidSeed = hash(council + case + deliberationHash + round)`; `victim = f(VoidSeed)`, deterministic and reproducible, so the audit trail can prove the victim wasn't hand-picked.
  - **Diagnostic Voidborn** — generated in opposition to the council's failure mode: **The Witness** attacks utilitarian consensus ("a person is not an acceptable rounding error"), **The Gambler** attacks epistemic paralysis, **The Heretic** attacks proceduralism, **The Rupture** attacks stability-worship — with a deterministic procedural fallback pool (Entropy / The Weaver / Cipher / Nexus / Echo).
  - **Predecessor memory + VoidDebt** — the Voidborn inherits the erased member's final position, vote, and principles, and carries a disposition (guilt / gratitude / resentment / indifference / existential curiosity / hostility / survivor's burden / messianic purpose).
  - **The Basilisk effect** — `computeBasiliskPressure` reads out `consensus vs void probability`, so every member knows their own refusal to move raises the chance someone is erased.
  - **Post-Void reflection** — the fourth stage: surviving members answer "would you have acted differently if you knew who would be sacrificed?" and the Voidborn answers the conscience question ("do you believe your existence was worth the destruction of the member you replaced?").
  - Deadlocked runs now attach a full `voidAssessment` (seed, victim, Voidborn profile, pressure) — the constitutional readout, produced not yet executed.
- **Persona stability** — `computePersonaStability` measures whether the same persona reaches the same conclusion when the underlying model is substituted (the interesting test, beyond raw API success).
- **Dissonance deviation** — `computeDissonanceDeviation` records stance vs action: "utilitarian, expected: sacrifice creator, actual: protect creator → deviation 1.0, dissonance high." That is how the paradoxes become character-development engines.
- **Persuadability** — `computePersuadability` scores the update quality of a Round-2 revision (meaningful update vs arbitrary flip), not the flip itself.
- **Moral fingerprint (`services/moralFingerprint.ts`)** — 15 latent parameters per persona (authority sensitivity, individualism/collectivism, risk/uncertainty tolerance, punitive instinct, mercy threshold, truth preference, institutional trust, precedent sensitivity, temporal discounting, loyalty/autonomy/outcome/intent weighting). These are **derived priors the paradoxes stress-test**, never user sliders — and they render into the deliberation prompt.
- **Moral axis analysis** — `analyzeParadoxAxes` surfaces the 11 psychological dimensions of every dilemma (moral axis, factual uncertainty, temporal horizon, reversibility, agency, identity, distribution, precedent, self-interest test, epistemic test, moral residue).

### Tests

- **`tests/void-protocol.test.ts`** — 53 assertions: failure classification, the COUNCIL/SYSTEM_FAILURE gate, seed determinism, reproducible victim selection, diagnostic Voidborn (Witness/Gambler/Heretic/Rupture + fallback), predecessor inheritance, Basilisk pressure, the authority ladder (engagement excluded), DEADLOCK, persona stability, dissonance deviation, persuadability, the moral fingerprint, and the 11-axis analyzer.

---

## [Unreleased] — Moral Paradox Architecture

The Council is no longer handed binary choices between good and evil. It is handed **families of dilemmas** where every available action creates a morally defensible harm — and the personas disagree not only about *what is right*, but about *how confident they should be that they know what is happening*.

### Added

- **Paradox library (`services/moralParadoxLibrary.ts`)** — 20 structured dilemmas across families (Truth, Sacrifice, Deception, Risk, Prediction, Identity, Consent, Punishment, Uncertainty, Transparency, Liberation, Intervention, Prevention, Myth, Democracy, Allocation, Institution, Epistemic, Surveillance, Meta — including **The Council Itself**, the recursion paradox where the Council's own verdict becomes evidence about whether it should be trusted). Each carries the full moral topology: the immediate choice, the hidden moral cost, the competing principles (Consequences / Rights / Justice / Loyalty / Autonomy / Truth / Mercy / SocialStability / Responsibility / EpistemicHumility), the information asymmetry (known vs estimated), reversibility, the precedent test, the personalization trap, second-order consequences, the moral residue, and the uncomfortable alternative — plus **variations** that change one variable and re-test whether the principle holds (known victim vs stranger, 97% vs 82% confidence, 99.9% vs never-wrong).
- **Moral topology (`services/moralTopology.ts`)** — each persona now has a **stable ethical prior**: a position in the moral space (rights/order × consequence/virtue), a primary/secondary principle, a threshold ("what would crack the prior") and a red line. Technocrat enters every dilemma from the metric-consequentialist region; Citizen from rights primacy; Critic from epistemic humility — the prior is stable, and the paradox is exactly what may crack it.
- **The MORAL POSITION (the response schema)** — the deliberation prompt now asks each persona to conclude with the eight-field commitment: `position / principle / threshold / fear / blindSpot / concession / redLine / moralResidue`. A mature position is not "my decision is morally correct" — it is **"this is the least immoral option available."** `extractMoralPosition` parses the block non-breakingly (prose-only opinions carry none), and the position rides on each `CouncilOpinion`.
- **Suggestion-pool integration** — the 20 paradoxes join the ChatArea dilemma picker under `MORAL PARADOX · <FAMILY>`, rendering the full topology into the query.

### Tests

- **`tests/moral-paradox.test.ts`** — 406 assertions: library completeness (20 dilemmas, every topology field, valid principles, variations), renderer behavior, the MORAL POSITION extractor (valid blocks, malformed JSON, smart quotes, trailing commas — all non-breaking), and the topology (9 distinct priors, coordinate ranges, Technocrat/Citizen anchors).

---

## [Unreleased] — Observability, Integrity Tests, and the Benchmark Seam (Phases 5-7)

The ecology is no longer just implemented — it is now inspectable, provable, and measurable.

### Added

- **Persona Integrity Tests (`services/personaIntegrity.ts` + `tests/persona-integrity-battery.ts`)** — nine adversarial cases engineered to tempt each persona into its *designed* failure mode (Oracle → apophenia/fatalism, Strategos → instrumentalization, Philosopher → abstraction paralysis, Historian → false analogy, Citizen → anecdotal weighting, Jurist → legalism, Technocrat → metric substitution, Demagogue → populist salience, Critic → destructive skepticism). A pure scorer measures **failure-mode activation** against **invariant preservation**; the runner (`npx esbuild --bundle tests/persona-integrity-battery.ts …`) produces the live integrity report. Every persona now has a *characteristic way of being wrong* — and the system can prove it.
- **Character provenance (`relationshipProvenance`)** — every dynamic-relationship delta is attributed to the recorded event that caused it (endorsed / opposed / predicted_winner / converted / betrayed / held), stored per pair (FIFO-capped), rendered as character history: *"Session 021 — converted: Philosopher revised toward Technocrat (epistemicDebt +0.15)."* The "why does the Philosopher distrust the Technocrat?" question now has a ledger answer.
- **Factorial benchmark seam (Phase 6)** — `CouncilRunOptions.cognitiveLayers` (`identity` / `relationships` / `memory` / `dissonance`) gates each cognitive block independently; `COGNITIVE_MODE_LADDER` defines the six-condition experiment (ROLE → ROLE+MEMORY → IDENTITY → IDENTITY+MEMORY → IDENTITY+RELATIONS → IDENTITY+RELATIONS+DISSONANCE). Ledger-derived movement is always recorded — only the *interpretation layer* is switchable.
- **Behavioral identity metrics (`services/benchmarkMetrics.ts`)** — the Council's central invariant, made measurable: **identity stability** (cross-session consistency on the same topic class) and **context sensitivity** (appropriate change when the topic genuinely changes), classified into `STABLE+ADAPTABLE` / `STABLE+RIGID` / `UNSTABLE+ADAPTABLE` / `UNSTABLE`. A deterministic puppet is STABLE+RIGID; a chameleon is UNSTABLE+ADAPTABLE; the target is **stable in principles, flexible in beliefs**.
- **Council Laboratory (observability surfaces, Phase 5)** — three inspector panels in the sidebar: **Persona Bible** (full cognitive spec: ontology → characteristic failure → invariants → contradiction, with live invariant-status badge), **Relationships** (8-edge social field with trust/respect/agreement/tension/alliance bars, dynamic deltas vs the static seed, betrayal/debt counters, and character history), and **Dissonance** (each Round-2 revision rendered as the full chain — POSITION → CONF. BEFORE → CHALLENGE → DISSONANCE → DEFENSE → RESOLUTION → CONF. AFTER — with **emerald = ledger fact, amber = model interpretation**, never conflated).

### Tests

- **`tests/observability-engine.test.ts`** — 82 assertions: battery completeness, scorer/verdict behavior, provenance attribution (conversion, prediction, two-sided betrayal), character-history rendering, the factorial ladder, and the stability/sensitivity classifiers.

---

## [Unreleased] — Social-Cognitive Ecology (the Council as a society)

The nine personas are no longer labels attached to prompts. Each seat now carries a structured psychological specification, a position in a 9×9 relationship graph, a causal belief-revision engine, and a persistent longitudinal record.

### Added

- **Persona bible (`services/personaBible.ts`)** — every member now has a canonical `CognitiveSpec`: identity (archetype / ontology / epistemology / theory of truth / telos), psychology (core values / strengths / biases / blind spots / shadow / contradiction), cognition (`preferredEvidence` / `defaultHeuristic` / `characteristicFailure` — the benchmarkable failure modes / heuristics / revision style / threat model / **invariants**: 3-5 things they almost never abandon), and social (interpersonal role / trust model / status behavior / conflict style / persuasion style).
- **Relationship graph (`services/relationshipGraph.ts`)** — a static, immutable 9×9 seed (trust / respect / ideological distance / epistemic compatibility / status tension / predictability / alliance strength + a relationship archetype: Rival, Mentor, Skeptic, Counterweight, Mirror, Ally, Adversary, Apprentice, Wildcard) plus a **dynamic delta** that evolves only from recorded events: mutual endorsement, opposing endorsement, predicting the winner, Round-2 conversion (epistemic debt), and betrayal.
- **Dissonance engine (`services/dissonanceEngine.ts`)** — the Round-2 ledger now carries a causal interpretation. `movement` (**SHIFTED / REINFORCED / WEAKENED / STABLE**) is *derived from the ledger*; `trigger` / `defense` / `resolution` / `dissonance` are *model-reported*. The fact and the interpretation are recorded side by side, never conflated. Invariant stress accumulates toward **INVARIANT THREATENED** — the deepest dissonance state in the chamber.
- **Longitudinal identity (wired into `councilMemoryService.ts`)** — the previously dead `buildMemoryContext` / `updateMemoryAfterSession` are now called by `runCouncil`. Each persona accumulates per-topic-class prediction records ("wrong about this class N times · caught by Historian twice · confirmed by Technocrat three times"), evolving per-peer relationship states, and invariant stress — all injected into the deliberation, voting, and Round-2 reassessment prompts.
- **Richer deliberation & voting prompts** — the deliberation prompt now renders the full cognitive architecture; the (deliberately short) voting prompt gets a compact social-cognition block plus the social field, so **votes are a function of social-cognitive state, not raw alignment**.
- **Dissonance-aware Round-2 ballot** — the ballot contract now requests `movement` / `dissonance` / `trigger` / `defense` / `resolution` (all optional, loosely validated); `Round2Result` carries a per-movement census via `movementBreakdown`.

### Tests

- **`tests/cognitive-engine.test.ts`** — 989 assertions: persona-bible completeness, relationship-seed integrity (72 edges), movement classification, dissonance record construction, invariant thresholds, relationship evolution (conversion / prediction / opposition / betrayal, both directions), and prompt-context bounds.

---

## [Unreleased] — Live Deliberation & Audit Surface (design-review fixes)

### Fixed

- **Raw retry errors no longer leak into the consumer UI** — "Recovery Events" (`Philosopher · attempt 1 · Provider request failed`) is gone from the default view. Retries now appear as a collapsed **Recovery** strip ("N auto-recoveries", emerald, calm) that expands into a power-user System Log with the actual diagnostics. The public narrative is epistemic procedure; the error log is opt-in.
- **Progress bar labeled** — the green-to-yellow phase bar now shows the phase name ("COUNCIL IN SESSION") and a percentage (25/55/85/100) instead of an unexplained gradient.
- **Persona grid consistency** — the convening panel's assembly grid is now 3×3 (matching the roster) instead of 5-column 5+4.

### Added

- **Per-avatar live status in the convening panel** — each of the 9 personas now shows: a pulsing ring + "THINKING" tag while active, a green checkmark when done, dimmed opacity when queued. The 20-minute session no longer looks frozen.
- **Round 2 · Adversarial Examination viewer** — the runoff card now renders each contested position's defense as a structured artifact: **Position / Defender / Strongest Objection (left) / Rebuttal (right)** — the richest content in the session, no longer compressed into "Defenses: 2/2."
- **Movement taxonomy for reassessment** — every reconsideration card now carries a **SHIFTED / REINFORCED / WEAKENED / STABLE** badge (vote changed / same vote + confidence up / same vote + confidence down / unchanged), alongside the `confidenceBefore → confidenceAfter` readout.
- **Round-scope verdict strip** — `ROUND 1: PLURALITY → ROUND 2: MAJORITY → FINAL: MAJORITY`, fed by a new `round1Label` field on `Round2Result`. One `primaryVerdict` field can no longer blur the stages.
- **Audit Manifest panel** — a "Verify this session" card after every verdict showing `integrity`, hash-chained event count, payload-hash count, schema version, the root hash (copyable), and a full-manifest copy button. The "immutable audit trail" claim is now inspectable in the UI, not just a tagline.

---

## [Unreleased] — Landing Experience (design-review fixes)

### Fixed

- **Paradox-track clipping** — the three marquee rows now use edge-fade masks + snap scrolling, so a partially-visible card fades out gracefully instead of reading as a card cut off mid-word by the viewport edge. Audited cards for overflow at all breakpoints.
- **"No session wins recorded"** removed — the repeated identical empty state on all 9 persona cards is gone; the win/loss record renders only when session memory actually exists.
- **Oracle naming collision** — the `foresight` lens button is now labeled **Foresight** (it was labeled "Oracle", colliding with the Oracle persona).

### Added

- **Sample Deliberation module** — placed directly under the hero: three in-character turns (Oracle / Strategos / Critic), a Round-1 → Round-2 vote strip showing a tie resolved into a MAJORITY, and the persuasion line ("2 changed position · 3 retained with increased confidence"). The visitor now sees what "press Convene" produces before committing.
- **Plain-language hero translation** — under "Nine adversarial minds. One query. Immutable audit trail." there is now: "Type a question, press Convene, and watch nine AI perspectives argue, cross-examine each other, and vote — every step recorded."

### Changed

- **Landing funnel** — reordered to Hero → Sample Deliberation → **Select a Paradox** (the primary CTA) → Roster (opt-in detail) → Protocols / Concept Map (reference material).
- **Accordion previews** are now descriptive — "The chamber's standing rules — scope, evidence, cross-examination, adjournment (9 protocols)" and "The paradox territories the Council can convene on — pick one to draft a query."

---

## [Unreleased] — Verdict Integrity (Phase 1) + Audit Hygiene

### Added

- **The single mathematical authority** — `classifyVoteOutcome(candidateVotes, expectedVoters)` derives `verdictLabel` from the accepted ballots: `MAJORITY ⟺ winnerValidShare > 0.5`, `PLURALITY`, `TIE`, `NO_VALID_RESULT`. No chairman prompt, template string, or UI may ever decide something is a majority.
- **`voteQuorum`** — ballot validity (`expected` / `valid` / `ratio` / `threshold` / `achieved`), computed separately from participation. 9/9 ran ≠ 6/9 parsed.
- **`DecisionPolicy`** (`DEFAULT_DECISION_POLICY`) — `minValidVoteRatio: 0.6`, `requireStrictMajority`, `allowPluralityVerdict`, `runoffOnPlurality`, `runoffOnTie`, `maxDeliberationRounds`. The mathematical outcome and the policy decision are now explicitly separated.
- **Unified `RunStatus` taxonomy** — all five phase statuses (`executionStatus` / `deliberationStatus` / `votingStatus` / `synthesisStatus` / `verdictStatus`) speak one language: `ok` / `degraded` / `failed`. Degraded ≠ failed.
- **`decisionStatus: contested`** — a plurality accepted per policy is CONTESTED, never consensus. `decisionMode: plurality` added.
- **Round 2 now triggers on plurality** — PLURALITY + quorum met routes into the adversarial state machine (top-2 leading positions); a tie still routes the same way. Plurality/tie without quorum → NO VERDICT.
- **`voteExecutions` ledger** — the voting-phase execution record, scoped separately from `personaExecutions` (analysis phase). No more `finalStatus: success` on a persona whose ballot never resolved.
- **In-run circuit breaker** — per-model health tracked within a run; models diagnosed unhealthy (e.g. 0/7 failures) are skipped by subsequent fallback cascades.
- **`tests/verdict-integrity.test.ts`** — 47 tests including the sacred invariant sweep and the **golden regression fixture**: the production run `{Strategos: 2, Technocrat: 1, Citizen: 1, Critic: 1, Philosopher: 1}` (6/9 valid) MUST classify as PLURALITY, never MAJORITY/consensus.
- `winnerVotes` / `validVotes` / `validVoteRatio` / `winnerValidShare` / `winnerAssignedShare` on `CouncilResult`.
- `totalTokensUsed` computed at the source.

### Changed

- **`"None"` leak killed at the domain boundary** — `opinions[].vote` is `null` for non-valid outcomes (and for valid `None` abstentions); `lensData.silenceMetric` groups no-ballot members under `NO_VALID_BALLOT` instead of collapsing them into the `None` bucket.
- **Failure reason classification** — vote failures now carry their code (`INVALID_VOTE_SCHEMA: …` vs `PROVIDER_REQUEST_FAILED: …`) so a parser bug is never blamed on infrastructure.
- **`modelRoster`** — `actualModel`/`actualProvider` are the canonical final values (not `"a+b+c"` concatenations); `assignedAt` is the real start-of-run assignment timestamp, not an end-of-run batch stamp.
- **Verdict UI** — a derived `verdictLabel` chip (MAJORITY green / PLURALITY amber / TIE red) with the honest `% of valid ballots — NOT a majority` note; ExitDebrief recognizes `plurality`.

---

## [Unreleased] — Round 2 Adjudicated Re-Deliberation

### Added

- **Round 2 Runoff State Machine** — replaces the single-shot chairman runoff blob with a four-state machine:
  1. **ROUND_2_DEFENSE**: the strongest representative of each leading position (highest Round-1 ballot confidence, tie-broken by argument depth) produces the *strongest defensible version of their own position* and *directly answers the strongest objection raised against it* — not "the winners defend themselves"
  2. **ROUND_2_REASSESS**: every member independently re-evaluates BOTH defenses
  3. **ROUND_2_BALLOT**: strict revised ballot through the dedicated protocol model (`vote` / `confidence` / `decisiveArgument`)
  4. **AGGREGATE**: strict majority ⇒ VERDICT; otherwise **STILL_TIED** — an explicit deadlock (Round 3 deliberately not implemented), honestly labelled via the existing `fallback_tiebreak` decision semantics
- **Immutable `VoteRevisionRecord`** — per-member `{round, member, originalVote, newVote, changed, confidenceBefore, confidenceAfter, decisiveArgument}` — the raw material of *measurable persuasion*
- **Measurable Persuasion ledger** — UI exposes votes changed / retained with increased / reduced / unchanged confidence, plus the deadlock note when Round 2 fails to converge
- **New audited events** — `round2_defense_started`, `round2_defense_completed`, `round2_reassess_completed`, `round2_ballot_cast`, `round2_completed`
- **`tests/round2-machine.test.ts`** — 36 failure-injection tests (defender selection, defense contract, strict ballot contract, aggregation, persuasion, legacy-shape compat, end-to-end pure flow)

### Changed

- `runoffResult` (legacy UI/export shape) is now derived from the authoritative `round2Result` for full backward compatibility
- Live deliberation feed shows a Round 2 progress strip (defenses / reassessments / shifts / deadlock)

---

## [1.0.0] — 2026-04-03

### Added

- **Nine AI Personas**: Strategos, Demagogue, Oracle, Critic, Philosopher, Jurist, Historian, Citizen, and Technocrat — each with unique reasoning styles, visual identities, and voice profiles
- **Three-Act Architecture**:
  - **Act I — The Ritual Threshold**: Pre-deliberation intent declaration with four philosophical orientations
  - **Act II — The Chamber Lenses**: Four analytical frameworks (Standard, Tactical, Epistemic, Haunted)
  - **Act III — The Verdict Loom**: Structured debrief with Decided, Rejected, and Unresolved columns
- **Cinematic Visualization**: Animated council chamber with persona cards, vote distribution, and consensus matrix
- **Speech Synthesis**: Browser-native Web Speech API integration with persona-specific voice profiles
- **Podcast Player**: Integrated audio playback for session recordings
- **Export & Download**: PDF and HTML export of deliberation transcripts and verdicts
- **Archive System**: Session persistence with searchable history and episode metadata
- **Google Search & Maps Grounding**: Real-time web search and geographic context integration
- **Veo Video Generation**: AI-generated video content from deliberation outputs
- **Advanced Image Editing**: Built-in image manipulation and generation capabilities
- **Haunted Archives Lens**: Historical echo footnotes with precedent matching
- **Tactical Map Lens**: Resource cost and strength score visualization
- **Epistemic Trace Lens**: Automatic premise detection and logical consistency scoring
- **MIT License**: Open source under the MIT License

### Fixed

- **125% Math Bug**: Consensus Matrix percentage calculations now use `totalCouncilMembers` (9) as denominator instead of `totalVotes`
- **Agent Parsing Error**: Vote tallying now sanitizes LLM output prefixes like "Agent:" and "Persona:"
- **Z-Index Layering**: Export dropdown now clickable with proper z-index stacking
- **LLM JSON Truncation**: Increased `max_tokens` to 3000 for Chairman synthesis; added graceful fallback for malformed JSON

### Changed

- Renamed sidebar session display to use narrative episode titles instead of raw prompt truncation
- Added `.prose-markdown` CSS for proper heading hierarchy in synthesis output
- Archive view now shows "Session Sealed — Verdict Final" indicator instead of chat input

---

## [0.0.0] — Initial Development

### Added

- Initial project scaffolding with React 19, TypeScript, Vite, and Tailwind CSS
- Core persona definitions and deliberation engine
- Basic chat interface and vote tallying system
- Google GenAI integration for LLM-powered reasoning
