# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, layered — the cinematic experience draws the explorer in; the auditability and rigor serve the serious decision-maker:

1. **Curious explorer / public audience** drawn by the Roko's Basilisk mythos, the theatrical framing, and the spectacle of nine minds debating in real time.
2. **AI/agent-curious builder or researcher** exploring multi-agent debate, auditing LLM deliberation, and inspecting provenance.
3. **Serious decision-maker** facing an ill-structured question (strategy, ethics, existential risk, precedent) who wants rigorous multi-perspective reasoning they can act on or export.

The product must hold all three without diluting either the drama or the rigor.

## Product Purpose

A client-side multi-agent deliberation engine. Nine epistemically distinct personas convene in a virtual chamber and subject every query to a fixed three-phase protocol — independent analysis, pairwise cross-examination with vector-based voting, and chairman synthesis, with adjudicated runoff on vote ties. Every run emits a hash-chained, inspectable audit stream so the provenance of a verdict is verifiable rather than asserted. Success is a deliberation that produces a structured, audited, three-column verdict (Decided / Rejected / Unresolved) the user can act on, export, and trust.

## Positioning

Deliberation is treated as a **distributed systems problem, not a prompt-engineering problem**: heterogeneous workers, structured ballots, typed failures, retries, tie-breakers, and an append-only event log. Where single-model chat collapses disagreement into one voice, the Council preserves the anatomy of disagreement — the verdict is a map of the debate, not an averaged answer. Its mechanism (auditable, dissent-preserving, refusal-escalating) is not something a neighboring chat product can truthfully copy.

## Operating Context

- User poses an ill-structured question through the **Act I Ritual Threshold** — an intent declaration along four orientations (tactical clarity / ethical boundaries / historical precedent / future probabilities).
- The **Act II** live deliberation feed renders the pipeline in real time: per-member analysis status and model, voting score badges, synthesis phase — driven by the same event stream that produces the audit log, so the UI cannot diverge from the record.
- The same event stream renders under four analytical lenses: **Standard** transcript, **Tactical** war-map, **Epistemic** trace, **Haunted** historical footnotes.
- **Act III Verdict Loom** renders Decided / Rejected / Unresolved columns, preserving dissent.
- All artifacts are exportable: JSON, Markdown, CSV, podcast-style script, Substack, ZIP.
- Sessions persist in `localStorage` with multi-session management, archive, and deletion.

## Capabilities and Constraints

- Nine fixed personas (Oracle, Strategos, Philosopher, Demagogue, Jurist, Citizen, Historian, Critic, Technocrat), each with a cognitive-dimension vector, decision strategy, and character dossier.
- Three-phase deliberation pipeline with structured, schema-validated JSON ballots (0–10 peer-alignment scores, vote, reason); malformed ballots rejected and retried.
- **Void Protocol**: soft refusals trigger an escalation ladder (re-prompt on alternate models under Chamber Law → in-character replacement → marked failure), so a member who cannot argue forfeits the seat in a logged, inspectable way.
- Heterogeneous inference with typed failures and fallback: NVIDIA primary → OpenRouter → Void escalation → member marked `failed`; the show proceeds with remaining members.
- Hash-chained `council-audit-v1` event sourcing: roster, hash chain, root hash, completeness, redaction status embedded in every result and export.
- Per-persona voices via Web Speech API.
- Client-side only — no server business logic; API keys live in Vercel Edge proxies (`/api/nvidia`, `/api/openrouter`), never in the browser.
- Stack is fixed by the existing codebase: React 19, TypeScript strict, Vite 6, Tailwind CSS, Framer Motion, Vercel deployment. Node >= 20.
- Live-mode dev server runs on port 8000.

## Brand Commitments

- Name and identity: **Roko's Council** (deployed at roko-s-council.vercel.app), MIT licensed, solo project by Michael Forsythe Robinson.
- Cinematic chamber identity with theatrical three-act structure; the tagline framing "The Council designed its own chamber."
- The nine named personas and their distinct visual identities are durable brand assets.
- Verifiability is a brand value: auditability is part of the product's public promise, not an internal detail.

## Evidence on Hand

- `ABOUT.md` — the philosophical engine, vision, personas, three-act architecture, Void Protocol, technical foundation, the Roko's Basilisk framing.
- `README.md` — full system spec: research context, theoretical foundations (Condorcet jury theorem, multi-agent debate, Habermasian legitimacy), roster, protocol, pipeline, engineering design, export formats.
- Live production deployment at roko-s-council.vercel.app; accompanying podcast (*The Council Archives*).
- No user testimonials, case studies, or external proof assets are on hand; future work must not fabricate them.

## Product Principles

1. **Decision quality over conversational fluency** — the chamber optimizes for reasoning under disagreement, not for how smooth the exchange sounds.
2. **Verifiability over theatre** — every verdict ships with inspectable provenance; the UI must never diverge from the audit record.
3. **Dissent is preserved, not averaged** — the three-column verdict keeps the anatomy of disagreement visible.
4. **The experience is the event** — the live deliberation must feel cinematic enough to hold the explorer while remaining legible to the analyst and useful to the decision-maker.
5. **Refusal is a chamber event, not a silent failure** — every degraded member is logged and inspectable.

## Accessibility & Inclusion

No formal accessibility standard is binding; the surface is not gated on WCAG AA. Obvious contrast and quality issues found by the detector are still fixed.
