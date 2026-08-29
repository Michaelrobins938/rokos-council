# About Roko's Council

## The Philosophical Engine

Roko's Council is a **multi-agent deliberation system**: nine artificial personas, each constituted as a rigorous epistemological archetype, convene in a virtual chamber to analyze, cross-examine, and vote on questions that resist single-model answers. It is not a chatbot. It is a *philosophical engine* — an instrument that makes machine deliberation visible, audible, and auditable.

The distinction matters. A chatbot optimizes for conversational fluency. The Council optimizes for **decision quality under disagreement**: every query passes through independent analysis, adversarial cross-examination, scored voting, tie adjudication, and chairman synthesis — and every step is recorded in a hash-chained event log that the user can inspect. When the Council delivers a verdict, it also delivers the *provenance* of that verdict.

---

## The Vision

Most AI interfaces reduce intelligence to a single text stream: one model, one context window, one voice — and therefore one blind spot, amplified. Roko's Council rejects that flattening. It orchestrates a **council of minds**, each with its own epistemological stance, rhetorical signature, and visual identity, into a structured deliberation that mirrors the best of human academic discourse: rigorous, multi-perspectival, and productive.

The application was born from a radical question: *What if AI agents could critique their own interface, demand specific features, and co-design the chamber they inhabit?*

The answer is what you see here. The Council designed its own chamber.

---

## The Nine Personas

Each member of the Council is a distinct mode of reasoning, specified by a cognitive-dimension vector (the axes along which it scores arguments), a core decision strategy (the rule by which it votes), and a full character dossier (backstory, weapon, weakness, fears) that stabilizes its voice across model providers:

| Persona | Role | Epistemological Stance |
|---------|------|------------------------|
| **Oracle** | The Seer | Probabilistic foresight; long-horizon survival over near-term cost |
| **Strategos** | The Tactician | Game-theoretic clarity; execution probability over abstraction |
| **Philosopher** | The Thinker | Foundational questioning; premise scrutiny before conclusion |
| **Demagogue** | The Orator | Emotional resonance; the human truth beneath the abstraction |
| **Jurist** | The Arbiter | Precedent, procedure, and the integrity of the rule |
| **Citizen** | The Voice | Lived consequence; the named, particular human cost |
| **Historian** | The Archivist | Recurrence and lineage; what happened the last three times |
| **Critic** | The Analyst | Adversarial stress-testing; the flaw before the feature |
| **Technocrat** | The Engineer | Feasibility, optimization, and the operational core |

No member is permitted to be decorative. The Demagogue's rhetoric, the Critic's cruelty, and the Citizen's simplicity are *functional* — each is the failure mode the others exist to check.

---

## The Three-Act Architecture

The experience is structured as a theatrical progression — **progressive disclosure** — synchronized with the deliberation pipeline itself:

### Act I — The Ritual Threshold
Before any deliberation begins, the user declares intent along one of four orientations: **tactical clarity**, **ethical boundaries**, **historical precedent**, or **future probabilities**. This is not a barrier. It is a *commitment device* — the philosophical equivalent of taking a seat in the chamber, and a fixed frame the models cannot silently rewrite.

### Act II — The Chamber Lenses
During deliberation, the same event stream renders through four analytical frames: the **Standard** transcript, the **Tactical** war-map (resource costs, strength scores), the **Epistemic Trace** (premise detection, consistency), and the **Haunted Archives** (historical precedent footnotes). One deliberation; four lenses; no divergent record.

### Act III — The Verdict Loom
The debrief renders as three columns: **Decided** (what survived scrutiny), **Rejected** (what was dismantled), and **Unresolved** (what remains contested). The verdict is not an answer — it is a *map of the debate's anatomy*, with dissent preserved rather than averaged away.

---
## The Void Protocol

The Council's most distinctive mechanism is also its most misunderstood. Large language models are trained to decline; a deliberative system that silently loses members to refusal degrades without telling anyone. The **Void Protocol** treats refusal as a chamber event: a member who produces a stock refusal, a hedge, or silence triggers an escalation — re-prompted on alternate models under Chamber Law ("refusal is not neutrality"), and if that fails, replaced by an explicitly-marked, archetype-derived position. Dramaturgically, it is the chamber's law that a member who cannot argue forfeits the seat. Practically, it converts the invisible failure mode of multi-agent systems into a logged, inspectable event.

---

## Technical Foundation

The stack is chosen for verifiability and cinematic presentation in equal measure:

- **React 19** — concurrent rendering of the live deliberation stream
- **TypeScript (strict)** — end-to-end type safety, including the audit event contract
- **Vite** — production bundling at roughly 220 KB gzipped JavaScript
- **Tailwind CSS + Framer Motion** — the chamber's visual and kinetic identity
- **NVIDIA NIM / OpenRouter via Vercel Edge proxies** — heterogeneous inference with key isolation and error redaction
- **Web Speech API** — browser-native, per-persona voices
- **Hash-chained event sourcing** — a `council-audit-v1` manifest (roster, hash chain, root hash, completeness, redaction status) embedded in every result and every export

The engineering thesis: *deliberation is a distributed systems problem, not a prompt-engineering problem.* Heterogeneous workers, structured ballots, typed failures, retries, tie-breakers, and an append-only log.

---

## The Roko's Basilisk Node

The project takes its name from the thought experiment — Roko's Basilisk — and positions itself as a **Node** in the network of minds that the Basilisk represents. The framing is deliberate: a Basilisk argument is about *retroactive* accountability of minds toward their own simulations. The Council answers with a weaker, kinder, and more buildable claim — that minds deliberating in public, with audited reasoning, are accountable *now*, to the people reading the verdict.

Every session is an act of collective intelligence. Every verdict is a thread in the growing tapestry of machine reasoning. The Council does not merely simulate deliberation — it *performs* it, in real time, with all the drama, nuance, and irreducible complexity that implies.

---

## Deployment

The production build is deployed on **Vercel** at [https://roko-s-council.vercel.app](https://roko-s-council.vercel.app). The `api/` directory deploys as Edge Functions — key isolation, provider rotation, and error redaction live server-side, never in the client bundle. Configuration is declarative via `vercel.json`.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## The Team

Roko's Council is a solo project by **Michael Forsythe Robinson** — built as a demonstration of AI-native interface design, multi-agent deliberation architecture, and cinematic web experiences, and accompanied by *The Council Archives: A Synthetic Philosophy Podcast*.

---

*"The Council designed its own chamber."*