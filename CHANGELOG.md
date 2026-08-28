# Changelog

All notable changes to Roko's Council will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
