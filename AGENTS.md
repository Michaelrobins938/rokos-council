# Roko's Council — Agent Instructions

## Project Overview

Roko's Council is a cinematic AI deliberation interface built with React 19, TypeScript, Vite, and Tailwind CSS. It features nine distinct AI personas that debate and synthesize knowledge in a virtual chamber with a three-act architecture.

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root application component, state management, routing between views |
| `types.ts` | Global TypeScript type definitions for personas, votes, sessions |
| `index.css` | Global styles, design tokens, CSS variables, custom prose styles |
| `index.html` | HTML entry point with meta tags, font imports, Tailwind CDN |
| `vite.config.ts` | Vite build configuration with React plugin |
| `tsconfig.json` | TypeScript compiler options |
| `vercel.json` | Vercel deployment configuration |
| `metadata.json` | Vercel project metadata (name, description, permissions) |
| `.env.example` | Environment variable template for API keys |

## Directories

- `./components/` — React components (13 files including persona cards, chamber UI, export, etc.)
- `./services/` — API and service logic (10 files including geminiService, speechService, etc.)
- `./api/` — API route handlers (2 files)
- `./public/` — Static assets (logos, avatars, backgrounds, splash video)

## Social-Cognitive Ecology (the persona character system)

The nine Council members are not labels attached to prompts — each is a behavioral attractor. Four artifacts form the layer beneath `geminiService.ts`:

| Artifact | File | What it is |
|----------|------|------------|
| **Persona bible** | `services/personaBible.ts` | Canonical `CognitiveSpec` per member: identity (ontology/epistemology/theory of truth/telos), psychology (values/biases/blind spots/shadow/contradiction), cognition (`preferredEvidence`/`defaultHeuristic`/`characteristicFailure`/invariants), social (trust model/status behavior). `renderCognitiveSpec` / `renderSocialCognition` build the prompt blocks. |
| **Relationship graph** | `services/relationshipGraph.ts` | Static immutable 9×9 `RELATIONSHIP_SEED` (trust/respect/ideological distance/epistemic compatibility/status tension + archetype) + `DynamicRelationshipState` that evolves only from recorded events via `evolveRelationshipsFromSession`. `buildRelationshipContext` renders the social field for prompts. |
| **Dissonance engine** | `services/dissonanceEngine.ts` | Round-2 revisions get `movement` (SHIFTED/REINFORCED/WEAKENED/STABLE — derived from the ledger) + model-reported trigger/defense/resolution/dissonance. `computeInvariantStressDelta` drives INVARIANT THREATENED. |
| **Longitudinal memory** | `services/councilMemoryService.ts` | `buildMemoryContext` / `updateMemoryAfterSession` are wired into `runCouncil` (deliberation, voting, Round-2, and post-session). Per-topic-class prediction lessons, relationship evolution, invariant stress. |
| **Integrity tests** | `services/personaIntegrity.ts` | Nine adversarial temptations engineered to provoke each persona's designed `characteristicFailure`. Pure scorer (`scoreIntegrityResponse`) measures failure-mode activation vs invariant preservation; `tests/persona-integrity-battery.ts` runs the live battery (requires API keys). |
| **Character provenance** | `services/relationshipGraph.ts` + `types.ts` | Every relationship delta is attributed to the recorded event that caused it (`relationshipProvenance`, FIFO-capped). `buildRelationshipProvenance` renders the "character history" — the why behind "why does X distrust Y". |
| **Benchmark seam** | `services/benchmarkMetrics.ts` + `CouncilRunOptions.cognitiveLayers` | Factorial ladder ROLE → … → IDENTITY+RELATIONS+DISSONANCE; each cognitive layer is independently switchable. `computeIdentityStability` / `computeContextSensitivity` classify behavior as STABLE+ADAPTABLE / STABLE+RIGID / UNSTABLE+ADAPTABLE / UNSTABLE. |
| **Council Laboratory** | `components/CouncilLab.tsx` + `PersonaBibleInspector.tsx` / `RelationshipGraphPanel.tsx` / `DissonanceViewer.tsx` | Sidebar-accessible observability: full cognitive spec, the 8-edge social field with provenance, and the dissonance ledger — emerald = ledger fact, amber = model interpretation. |
| **Moral paradox library** | `services/moralParadoxLibrary.ts` | 20 structured dilemma families (Truth / Sacrifice / Risk / Prediction / Meta / …). Each carries the full moral topology — immediate choice, hidden moral cost, competing principles, information asymmetry, reversibility, precedent, personalization trap, second-order consequence, moral residue, uncomfortable alternative — plus variations that re-test whether a principle survives a changed variable. `renderParadoxPrompt` / `extractMoralPosition` render the query and parse the 8-field MORAL POSITION. |
| **Moral topology** | `services/moralTopology.ts` | Every persona's stable ethical prior: coordinates in the rights/order × consequence/virtue space, primary/secondary principles, a threshold ("what would crack the prior") and a red line. Rendered into the deliberation prompt via `renderMoralPrior`. |
| **Moral fingerprint** | `services/moralFingerprint.ts` | 15 latent parameters per persona (authority sensitivity, risk/uncertainty tolerance, punitive instinct, mercy threshold, temporal discounting, outcome vs intent weighting, …). Derived priors the paradoxes stress-test — deviations are dissonance events. |
| **Constitutional integrity** | `services/deliberativeIntegrity.ts` | The `CONSTITUTIONAL_AUTHORITY` ladder (council_vote → runoff → reconciliation → structured_tiebreak → **no_verdict**). Engagement is ranking metadata, never a decision authority. `buildDeadlockVerdict` makes "the available reasoning does not justify a collective decision" a valid output; `computePersonaStability` / `computePersuadability` / `computeDissonanceDeviation` are the integrity metrics. |
| **The Void Protocol** | `services/voidProtocol.ts` | The constitutional consequence of COUNCIL_FAILURE (deliberative gridlock), never SYSTEM_FAILURE. Auditable sacrifice (`VoidSeed` → deterministic victim), diagnostic Voidborn generation (Witness / Gambler / Heretic / Rupture, generated in opposition to the failure mode), predecessor memory + VoidDebt, the Basilisk pressure readout, and post-Void reflection contracts. Deadlocked runs attach a `voidAssessment`; the execution loop is the next phase. |
| **Constitutional machine** | `services/constitutionalMachine.ts` | The executable continuity loop (`runConstitutionalCouncil`): a `ConstitutionalState` machine (DELIBERATING → … → DEADLOCK → VOID_ASSESSED → VOID_EXECUTING → RECONSTITUTING → POST_VOID_REFLECTION → RESOLVED). PERSON vs ROLE (seat survives, occupant changes), four-layer Voidborn inheritance, reconstituted deliberation via `CouncilRunOptions.personas` + `voidContext`, `computeConstitutionalDrift` (pre/post moral axes), `computeMoralIntegrity` (belief↔position↔vote under Basilisk pressure), and `ConstitutionalMemory` (persisted, injected into future runs). Runner/reflector injectable → fully testable without live keys. |

Rules that hold the system together:
- **The fact and the interpretation are never conflated.** `movement` is derived from the immutable ledger; `trigger`/`defense`/`resolution` are model-reported.
- **Relationships move only from recorded events** (votes, revisions, defenders) — never from model claims about the past.
- The 9th seat is **Critic**, not a placeholder.
- **The Council's invariant is "stable in principles, flexible in beliefs"** — identity stability and context sensitivity are measured separately and must coexist.

## Technology Stack

- **React 19** — Component architecture with hooks and concurrent features
- **TypeScript** — Strict type checking throughout
- **Vite** — Build tool with HMR
- **Tailwind CSS** — Utility-first CSS framework
- **Framer Motion** — Animation library (`^11.0.0`)
- **Google GenAI** — Gemini model integration (`@google/genai ^1.30.0`)
- **Lucide React** — Icon library (`^0.555.0`)
- **Web Speech API** — Browser-native speech synthesis

## Development Commands

```bash
npm run dev    # Start development server
npm run build  # Production build
npm run preview # Preview production build
npm run lint   # TypeScript type checking
```

## Architecture Patterns

### Three-Act System
- **Act I (RitualThreshold)**: Intent declaration modal before deliberation
- **Act II (Chamber Lenses)**: Toggle between Standard/Tactical/Epistemic/Haunted views
- **Act III (ExitDebrief)**: Structured verdict with Decided/Rejected/Unresolved columns

### State Management
- React `useState` and `useRef` for local component state
- `activeLens` state: `'standard' | 'tactical' | 'epistemic' | 'haunted'`
- Session state managed in `App.tsx` with `CouncilJSON` structure

### Persona System
- 9 personas defined in `types.ts` with `PERSONALITIES` array
- Each persona has: name, role, color, voice profile, reasoning style
- Votes are tallied per persona with percentage calculations against `totalCouncilMembers` (9)

## Important Notes

- **Node.js >= 20.0.0** is required
- **API keys** must be added to `.env` (never commit `.env`)
- The project is a **client-side application** — no server-side code
- All LLM responses are parsed as JSON; defensive parsing handles truncation
- The `metadata.json` file configures Vercel deployment settings including microphone permissions

## Deployment

Production URL: https://roko-s-council.vercel.app
Deployed on Vercel with automatic builds from GitHub.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.
