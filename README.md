# Roko's Council

> A multi-agent deliberation system in which nine adversarially-constructed AI personas analyze, cross-examine, and vote on ill-structured problems, producing an audited, synthesized verdict.

[![Live Demo](https://img.shields.io/badge/Live_Demo-roko-s-council.vercel.app-blue?style=for-the-badge&logo=vercel)](https://roko-s-council.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-0055FF?style=for-the-badge&logo=framer)](https://www.framer.com/)

---

## Abstract

Single-model inference collapses disagreement into a single voice: one sampler, one context window, one token distribution, one answer. Roko's Council is a client-side deliberation engine that refuses this flattening. It convenes **nine epistemically distinct personas** — each specified by a cognitive-dimension vector, a core decision strategy, and a full character dossier — and subjects every query to a fixed three-phase protocol: **independent analysis → pairwise cross-examination and vector-based voting → chairman synthesis**, with an adjudicated runoff trial on vote ties.

The system is engineered for **verifiability rather than theatre**. Every run emits a hash-chained event stream (`council-audit-v1`), per-member provider metadata, retry history, and a completeness attestation, so the provenance of each verdict is inspectable rather than asserted. Refusals are treated as a first-class failure mode and handled by an escalation protocol rather than silently discarded.

The application is deployed at [roko-s-council.vercel.app](https://roko-s-council.vercel.app).

---

## 1. Research Context and Problem Statement

Contemporary LLM interfaces optimize for conversational fluency, which is orthogonal to decision quality on *ill-structured problems* — questions with no verifiable ground truth, contested value weightings, and second-order consequences (e.g., "Should a civilizational-risk posture override near-term welfare maximization?"). Three failure modes motivate this system:

1. **Sycophantic convergence.** A single model asked to "argue both sides" tends toward middle-ground synthesis, suppressing the adversarial extremes where the decision-relevant information often lives.
2. **Unauditable provenance.** When an answer is produced, the user cannot inspect *which* reasoning path, temperature regime, or provider produced each component of the judgment.
3. **Refusal asymmetry.** Safety-driven refusals terminate inquiry instead of being surfaced, escalated, or replaced — the deliberation quietly loses a participant.

Roko's Council addresses these by treating deliberation as a **distributed systems problem** — heterogeneous workers, structured messages, retries, tie-breaking, and an append-only event log — rather than a prompt-engineering problem.

---

## 2. Theoretical Foundations

The design is not arbitrary; it borrows machinery from three established research traditions:

- **Epistemic democracy and the Condorcet jury theorem.** Aggregating independent, partially-reliable judges can approach correct answers under independence conditions. The Council approximates independence by isolating each persona's analysis phase (batched, but individually prompted) *before* any cross-member exposure occurs in the voting phase.
- **Multi-agent debate.** Recent work (e.g., Du et al., 2023, *Improving Factuality and Reasoning through Multiagent Debate*) shows that having LLM instances critique and revise each other's answers improves factual accuracy over single-agent baselines. The voting phase operationalizes this: every member scores every peer argument against its own dimension vector before casting a weighted vote.
- **Deliberative legitimacy (Habermasian discourse ethics).** A norm is legitimate if all affected could accept it in a rational discourse. The Council's three-column verdict — **Decided / Rejected / Unresolved** — explicitly preserves dissent rather than manufacturing consensus, making the *anatomy of disagreement* part of the output.

The **Void Protocol** (§5.4) is the system's answer to refusal asymmetry: an escalation ladder that converts silence into either engagement or explicit, in-character failure — both of which are legible to the user.

---
## 3. System Overview

### 3.1 The Council Roster

Each member is specified along three axes — a set of **cognitive dimensions** (the evaluation axes it scores against), a **core strategy** (its decision rule), and a **character dossier** (tagline, appearance, speaking style, backstory, weapon, weakness, fears) that stabilizes voice and register across providers:

| Persona | Role | Dimension Vector (abridged) | Decision Strategy |
|---------|------|------------------------------|-------------------|
| **Oracle** | Predictive foresight | Time horizon (∞), probability variance, existential risk | Maximize long-horizon survival probability regardless of near-term cost |
| **Strategos** | Tactical command | Feasibility, resource efficiency, tactical advantage | Select the highest-probability-of-execution, lowest-resource-drain option |
| **Philosopher** | Foundational rigor | Logical consistency, ethical universalism, first principles | Reject contradictions and emotional appeals; analyze the premise itself |
| **Demagogue** | Popular sentiment | Social cohesion, emotional resonance, public sentiment | Champion the option that unifies or appeals to human nature |
| **Jurist** | Procedural legality | Systemic stability, precedent adherence, fairness | Uphold system integrity; reject arbitrary or chaotic measures |
| **Citizen** | Human cost | Human suffering index, quality of life, individual agency | Minimize pain, maximize freedom for the median individual |
| **Historian** | Precedent & recurrence | Historical parallels, cyclical risk, cultural preservation | Identify past patterns; avoid repeating documented catastrophes |
| **Critic** | Adversarial stress-test | Failure-mode analysis, entropy detection, weakness identification | Attack every plan; support the most robust "least wrong" option |
| **Technocrat** | Feasibility engineering | Technological velocity, system optimization, automation | Solve through superior engineering and algorithmic efficiency |

Persona dossiers are hard-wired into each member's system prompt via the **Void Protocol preamble** (§5.4), so that model swaps (per-run provider assignment) do not collapse the ensemble into a single house style.

### 3.2 The Three-Act Interaction Protocol

The user experience implements **progressive disclosure** aligned to the deliberation pipeline:

- **Act I — The Ritual Threshold.** Before deliberation, the user declares intent along one of four orientations (tactical clarity / ethical boundaries / historical precedent / future probabilities). This acts as a *commitment device*, fixing the query's frame before any model sees it.
- **Act II — Chamber Lenses.** During deliberation, the same event stream renders under four analytical frames: **Standard** (readable transcript), **Tactical** (resource costs, strength scores), **Epistemic** (premise detection, consistency tracing), and **Haunted** (historical precedent footnotes).
- **Act III — The Verdict Loom.** The final debrief renders the verdict as three columns — **Decided** (survived scrutiny), **Rejected** (dismantled), **Unresolved** (contested) — preserving dissent rather than erasing it.

### 3.3 The Deliberation Pipeline

```
User Query
  └─► Ritual Threshold (intent declaration)
  └─► Assembly (per-run model assignment, seeded runId, roster event stream)
  └─► Phase I — Independent Analysis (9 personas, batched ×4, per-member provider fallback)
        └─► soft-refusal detection → Void Protocol escalation ladder (§5.4)
  └─► Phase II — Cross-Examination & Voting (pairwise alignment scoring, 0–10, JSON ballots)
  └─► Tie Detection → Runoff Trial (adjudicated re-deliberation) or engagement-metric fallback
  └─► Phase III — Chairman Synthesis (winner merge + runner-up salvage)
  └─► Verdict Loom (Decided / Rejected / Unresolved) + audit manifest
```

A **live deliberation feed** renders the pipeline in real time — per-member analysis status and model, voting score badges, and synthesis phase — driven by the same event stream that produces the audit log (§5.3), so the UI cannot diverge from the record.

---

## 4. Export & Portability

Deliberation is only useful if it survives the session. All artifacts are exportable end-to-end:

| Format | Contents |
|--------|----------|
| **JSON** | Full structured session: opinions, ballots, tally, events, audit manifest |
| **Markdown** | Human-readable transcript with verdict columns |
| **CSV** | Tabular vote matrix for external analysis |
| **Script** | Podcast-style two-host adaptation of the session |
| **Substack** | Publication-ready cinematic formatting |
| **ZIP** | Complete archive of all of the above plus session metadata |

Sessions persist in `localStorage` with multi-session management, archive, and deletion.

---
## 5. Engineering Design

### 5.1 Heterogeneous Inference with Structured Fallback

Each persona is assigned a model per run via a seeded assignment function (`runId` → deterministic roster). Requests route through **Vercel Edge proxies** (`/api/nvidia`, `/api/openrouter`) so keys never reach the browser. Failures are typed (`NvidiaProviderError` with metadata, recoverability classification, and retry history) rather than thrown as opaque strings, enabling per-phase degradation: NVIDIA primary → OpenRouter fallback → Void Protocol escalation → in-character synthesis → member marked `failed`. The show proceeds with eight members rather than aborting.

### 5.2 Structured Ballots

Voting is not free-text. Each member returns a strict JSON ballot: an `analysis` array of per-peer alignment scores (`target`, `score` 0–10, `notes`) plus `vote` and `reason`. Ballots are schema-validated (`parseVotePayload`) — malformed JSON, votes for inactive peers, and self-votes are rejected and retried — and the score matrix feeds both the vote tally and the live-feed UI.

### 5.3 Auditable Event Sourcing

Every run emits an append-only, hash-chained event stream: `run_started → member_assigned* → phase_started/complete → member_started/complete → vote_cast → runoff_* → synthesis_completed → run_completed`, each event carrying `sequence`, `timestamp`, and `payloadHash`. The result embeds an **audit manifest** (`schemaVersion: council-audit-v1`) with the model roster, hash chain, root hash, integrity, completeness, and redaction status. Exports include the manifest, so any published verdict can be traced to its exact event history.

### 5.4 The Void Protocol (Refusal Handling)

Refusals are the failure mode that silently degrades multi-agent systems. The Void Protocol is an explicit escalation ladder:

1. **Chamber-law preamble** in every system prompt: the member is constituted as a philosophical archetype, with the norm that *refusal is not neutrality* — the archetype must name its instinct and speak anyway.
2. **Soft-refusal detection** (`isSoftRefusal`) over the response: stock refusal phrasings, hedging boilerplate, or sub-minimal length.
3. **Escalation**: on detection, the member is re-prompted on alternate models with an escalation notice — the previous response is treated as a forfeiture event under Chamber Law 4.
4. **In-character synthesis**: if escalation fails, an explicitly-marked, archetype-derived placeholder opinion is produced (`[Persona — synthesized from archetype core]`), and the failure is recorded in the event stream rather than hidden.

The protocol is *dramaturgical on the surface and defensive underneath*: it converts an unauditable silent refusal into either engagement or a logged, inspectable failure.

### 5.5 Failure Semantics

| Condition | Behavior |
|-----------|----------|
| Provider error (recoverable) | Retry with backoff, logged to `retryHistory` |
| Provider error (persistent) | Fall through to secondary provider; roster records actual model used |
| Member soft-refusal | Escalation ladder (§5.4) |
| Member total failure | Member excluded from voting; deliberation continues |
| All members fail | `TOTAL_RUN_FAILURE` result with completeness attestation |
| Vote tie | Adjudicated **Runoff Trial**; provider failure degrades to engagement-metric tie-break |
| User cancellation | `run_cancelled` event; partial result returned with `cancelled` completeness |

---
## 6. Implementation

### 6.1 Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| UI runtime | React | 19.2 | Concurrent rendering of the deliberation stream |
| Language | TypeScript (strict) | 5.8 | End-to-end type safety, including the event contract |
| Build | Vite | 6.2 | HMR and production bundling (~220 KB gzipped JS) |
| Styling | Tailwind CSS | 3.4 | Utility-first styling with custom design tokens |
| Animation | Framer Motion | 11 | Chamber assembly, phase transitions, live feed |
| Icons | Lucide React | 0.555 | Interface iconography |
| Inference | NVIDIA NIM / OpenRouter | — | Persona inference via edge proxies |
| Speech | Web Speech API | — | Browser-native per-persona voices |
| Persistence | localStorage | — | Session archive and recovery |
| Hosting | Vercel (Edge) | — | Static build + serverless proxies |

### 6.2 Source Layout

```
├── App.tsx                        Root state machine and view routing
├── types.ts                       Event contract, persona, vote, audit types
├── api/
│   ├── nvidia.ts                  Edge proxy — key isolation, error redaction
│   └── openrouter.ts              Edge proxy — key rotation, error redaction
├── components/                    Chamber UI (13 components)
│   ├── ChatArea.tsx               Deliberation surface + LiveDeliberationFeed
│   ├── Sidebar.tsx                Session archive
│   ├── ExitDebrief.tsx            Verdict Loom (Decided/Rejected/Unresolved)
│   └── …
├── services/
│   ├── geminiService.ts           Deliberation engine: prompts, protocol, events
│   ├── exportService.ts           Multi-format export (JSON/MD/CSV/Script/Substack/ZIP)
│   ├── councilMemoryService.ts    Session persistence
│   ├── narratorService.ts         Season/story-arc narration
│   └── searchService.ts           Web-search grounding
└── vercel.json                    Build config + API headers
```

### 6.3 Development Mode

A dev-mode toggle bypasses live inference and injects mock council data (`mockSessionData.ts`), enabling full-pipeline UI development without API consumption.

---

## 7. Getting Started

### Prerequisites

- **Node.js ≥ 20.0.0**
- npm (or yarn)

### Installation

```bash
git clone https://github.com/Michaelrobins938/rokos-council.git
cd rokos-council
npm install
cp .env.example .env
```

### Environment Configuration

```env
GEMINI_API_KEY=your_gemini_api_key_here
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_API_KEY_2=your_nvidia_api_key_2_here
NVIDIA_API_KEY_3=your_nvidia_api_key_3_here
OPENROUTER_API_KEY_1=your_openrouter_api_key_1_here
OPENROUTER_API_KEY_2=your_openrouter_api_key_2_here
```

All keys are **free-tier eligible** (NVIDIA NIM, OpenRouter free models, Google AI Studio). Keys are read server-side by the edge proxies and are never shipped to the client. `.env` is git-ignored; never commit it.

### Scripts

```bash
npm run dev      # Development server (HMR)
npm run build    # Production build (vite build)
npm run preview  # Preview the production build
npm run lint     # Strict TypeScript check (tsc --noEmit)
```

---

## 8. Deployment

The production deployment is **Vercel** (framework preset: Vite; build: `npm run build`; output: `dist/`):

```bash
npm install -g vercel
vercel
```

The `api/` directory deploys as Edge Functions automatically; set the environment variables from §7 in the Vercel project settings. Alternative targets (Netlify, Cloudflare Pages, GitHub Pages, S3+CloudFront) work for the static build but require equivalent proxy functions for key isolation.

---
## 9. Security Model

- **Key isolation.** All provider credentials live in environment variables consumed exclusively by serverless edge proxies. The client bundle contains no keys; direct browser-to-provider fetches are not performed.
- **Error redaction.** Upstream provider error messages are regex-redacted (`nvapi-*`, bearer tokens) before returning to the client, so failures cannot leak credentials.
- **Content safety.** React's built-in escaping plus `react-markdown` for all model output; input sanitization on user-supplied content; CSP-oriented headers in `vercel.json`.
- **Secret hygiene.** Comprehensive `.gitignore` covering `.env*`, key-dump files (`*key*.txt`), credential formats (`*.pem`, `*.key`, service-account JSON), and session transcripts. The repository history contains no secrets.

---

## 10. Limitations and Future Work

Stated plainly, in the spirit of the system's own verdict columns:

- **Independence is approximated, not guaranteed.** Members share provider distributions and era-specific training data; the Condorcet-style independence assumption (§2) is only partially satisfied. Future work: heterogeneous model *families* per member and prompt-level decorrelation studies.
- **Vote tallies are small.** Nine voters make the tally sensitive to single defections; the runoff trial mitigates but does not eliminate variance. Future work: configurable council size and repeated-run aggregation.
- **Refusal detection is lexical.** `isSoftRefusal` matches known phrasings; subtle compliance-without-engagement passes. Future work: classifier-based detection scored against the argumentation-quality rubric.
- **No ground truth.** Deliberation quality is currently assessed structurally (completeness, ballot validity, retry rates) rather than against external correctness benchmarks — appropriate for ill-structured problems, but worth stating.
- **Client-side persistence.** `localStorage` bounds session durability; a sync layer is future work.

---

## 11. Documentation

| Document | Description |
|----------|-------------|
| [SCOPE-DOCUMENT.md](SCOPE-DOCUMENT.md) | Full development narrative and architecture decisions |
| [ABOUT.md](ABOUT.md) | Project philosophy, vision, and the Basilisk Node framing |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow and contribution guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [SECURITY.md](SECURITY.md) | Security policy and reporting |

---

## 12. Citing This Work

If you use Roko's Council in research or teaching, please cite:

```bibtex
@software{rokos_council_2026,
  author  = {Robinson, Michael Forsythe},
  title   = {Roko's Council: A Multi-Agent Deliberation Interface for Synthetic Philosophy},
  year    = {2026},
  url     = {https://github.com/Michaelrobins938/rokos-council},
  note    = {Nine-persona adversarial deliberation engine with audited consensus; React 19 + TypeScript. Live: https://roko-s-council.vercel.app}
}
```

---

## 13. Related Conversations

Roko's Council is accompanied by **"The Council Archives: A Synthetic Philosophy Podcast"** — long-form explorations of synthetic rights, digital existence, and high-dimensional deliberation:

- **Substack**: [mforsytherobinson.substack.com](https://mforsytherobinson.substack.com)
- **YouTube**: [youtube.com/@mforsytherobinson](https://youtu.be/cVjSHu8DNdg)
- **Spotify**: [open.spotify.com/show/michael-forsythe-robinson](https://open.spotify.com/show/michael-forsythe-robinson)
- **RSS**: [substack.com/@mforsytherobinson/feed](https://substack.com/@mforsytherobinson/feed)

---

## 14. Support

- **Issues**: [github.com/Michaelrobins938/rokos-council/issues](https://github.com/Michaelrobins938/rokos-council/issues)
- **Discussions**: [github.com/Michaelrobins938/rokos-council/discussions](https://github.com/Michaelrobins938/rokos-council/discussions)

---

## License

Released under the **MIT License**. See [LICENSE](LICENSE).

---

## Repository Topics

`ai` · `artificial-intelligence` · `multi-agent-systems` · `llm` · `deliberation` · `debate` · `consensus` · `ethics` · `philosophy` · `react` · `typescript` · `vite` · `vercel` · `tailwindcss` · `framer-motion` · `gemini-api` · `speech-synthesis` · `open-source` · `synthetic-philosophy` · `cinematic-ui`

---

<div align="center">

**Roko's Council** — *Nine minds. One question. An audited verdict.*

Built by [Michael Forsythe Robinson](https://mforsytherobinson.substack.com)

[![GitHub stars](https://img.shields.io/github/stars/Michaelrobins938/rokos-council?style=for-the-badge)](https://github.com/Michaelrobins938/rokos-council/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Michaelrobins938/rokos-council?style=for-the-badge)](https://github.com/Michaelrobins938/rokos-council/network/members)
[![GitHub contributors](https://img.shields.io/github/contributors/Michaelrobins938/rokos-council?style=for-the-badge)](https://github.com/Michaelrobins938/rokos-council/graphs/contributors)

</div>
