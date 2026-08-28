# Scope of Work & Development Narrative
## Roko's Council - The Philosophical Engine
### Build Date: April 3, 2026

---

## 1. The Great Gridlock — Critical Bug Fixes

Before we could build the new UX architecture, we had to stabilize the ship. Four critical system failures were identified and resolved:

### The "125% Math Bug" (Consensus Matrix)
**Issue**: The percentage calculations in the Vote Distribution component were using the wrong denominator. When calculating faction percentages, the system was dividing by `totalVotes` (actual votes cast, which could be less than 9) instead of `totalCouncilMembers` (always 9). This caused a scenario with 5 votes to render as "125%".

**Fix**: Updated all percentage calculations in `ConsensusVisualization.tsx` and `ChatArea.tsx` to use the static `totalCouncilMembers` (9) as the denominator:
```typescript
const percentage = Math.round((voteCount / totalCouncilMembers) * 100);
```

### The "Agent: Strategos" Parsing Error
**Issue**: LLMs occasionally output votes with prefixes like "Agent: Strategos" or "Persona: Strategos". The vote tallying logic was treating these as brand-new factions instead of mapping them to the existing persona.

**Fix**: Implemented string sanitization in `geminiService.ts`:
```typescript
const sanitizedTarget = sanitizeVote(data.targetPersona, PERSONALITIES.map(p => p.name));
```
Applied sanitization to:
- Initial vote parsing (already existed)
- Confrontation phase votes (new)
- Runoff reconsideration votes (new)

### Z-Index Layering Issue (Unclickable Dropdown)
**Issue**: The Export/Download dropdown menu was rendered but unclickable. The sticky chat input container at the bottom had a higher z-index than the dropdown, causing pointer events to be intercepted by an invisible overlay.

**Fix**: 
- Reduced input container z-index from `z-20` to `z-10`
- Increased dropdown z-index from `z-50` to `z-[100]`

### LLM JSON Truncation ("Unterminated string in JSON")
**Issue**: The Chairman/Narrator LLM was running out of tokens before completing the JSON output. The response would cut off mid-sentence, leaving malformed JSON that crashed the parser.

**Fix**: 
- Increased `max_tokens` parameter from 1024 to 3000 for Chairman synthesis calls
- Enhanced the defensive parsing fallback to salvage raw text when JSON parsing fails
- This literally saved the app from a white screen of death—the app now gracefully displays truncated synthesis text instead of crashing

---

## 2. The Three-Act Architecture

### The Philosophy: Progressive Disclosure

The AI personas within our system (Strategos, Demagogue, Oracle, Critic, etc.) made fundamentally incompatible UX demands:
- **Strategists** wanted cold, sterile efficiency—tactical maps and data visualizations
- **Demagogues** wanted emotional resonance—warmth, ritual, and "pulse"
- **Historians** wanted contextual footnotes—links to past sessions
- **Philosophers** wanted analytical highlighting—premise detection

The solution: **Progressive Disclosure**. Instead of forcing one static UI on the user, the chamber now adapts through three distinct "Acts":

1. **Act I - The Ritual Threshold**: User must declare their intent before entering
2. **Act II - Chamber Lenses**: User can toggle between analytical frameworks during deliberation  
3. **Act III - The Verdict Loom**: Final output with structured debrief

---

## 3. Act I: The Ritual Threshold

A pre-deliberation modal that intercepts the user's attempt to start a session.

### Component: `<RitualThreshold />`

**Visual Design**:
- Full-screen overlay with dark blur backdrop (`bg-black/90 backdrop-blur-sm`)
- Framer Motion fade-in animation (`duration: 0.5`, `easeOut`)
- Emerald accent lines (top/bottom borders with gradient)
- Decorative glow orbs (emerald/yellow)

**Content**:
- Header: "THE COUNCIL AWAITS" (`tracking-[0.3em] text-emerald-500/50 uppercase`)
- Prompt: "What truth do you seek to extract from the machine?" (`text-xl text-slate-200`)

**Intent Buttons** (2x2 grid):
| Intent | Icon | Description |
|--------|------|-------------|
| Seek Tactical Clarity | Sword | Strategic advantage and concrete outcomes |
| Explore Ethical Boundaries | Scale | Moral dimensions and philosophical implications |
| Map Historical Precedent | BookOpen | Connect to past patterns and lessons |
| Project Future Probabilities | Eye | Anticipate consequences and trajectories |

**Acceptance Button**:
- Text: "I Accept the Friction. Convene the Council."
- Disabled until user selects an intent
- Active state: Pulsing emerald glow (`animate-pulse`, `shadow-[0_0_30px_rgba(16,185,129,0.4)]`)
- Cancel option: "return to the void"

**Intercept Logic**:
- `handleSend` now triggers modal instead of immediate execution
- `handleRitualAccept` stores intent, closes modal, then fires `runCouncil()`

---

## 4. Act II: The Chamber Lenses

A dynamic viewport system allowing users to view deliberation through different analytical frameworks.

### State Management
```typescript
const [activeLens, setActiveLens] = useState<'standard' | 'tactical' | 'epistemic' | 'haunted'>('standard');
```

### Lens Toolbar
Positioned below the top bar, visible only during active sessions (not archives):
- **Standard Protocol** (emerald): Default readable view
- **Tactical Map** (red): War map style
- **Epistemic Trace** (cyan): Critical analysis
- **Haunted Archives** (purple): Historical context

### Visual Backgrounds (CSS)
Each lens applies a distinct background pattern via CSS classes:
- `.tactical-lens-bg`: Red grid overlay on dark background
- `.epistemic-lens-bg`: Cyan diagonal pattern
- `.haunted-lens-bg`: Purple/cyan gradient ghosts

---

### Tactical Lens (Strategos/Technocrat View)

**Consensus Matrix Header**:
```
TACTICAL OVERLAY ACTIVE
GRID: ACTIVE
3 VECTORS IDENTIFIED · 9 UNITS DEPLOYED
```

**AgentCard Tactical Readout** (injected into each council member card):
- **Resource Cost**: Message length in bytes
- **Strength Score**: Visual progress bar (0-99, calculated as `Math.min(99, Math.floor(text.length / 12))`)
- Red border/glow styling (`border-red-500/30`)

**Styling**:
- Red theme throughout
- Military/technical readout aesthetic
- Monospace fonts, uppercase labels

---

### Epistemic Trace Lens (Critic/Philosopher View)

**Consensus Matrix Header**:
```
EPISTEMIC TRACE ACTIVE
PREMISE DETECTION: ENABLED
LOGICAL CONSISTENCY: 78%
```

**AgentCard Epistemic Footer** (injected below message):
- **Detected Premises**: Extracts sentences containing keywords:
  - "therefore", "because", "must", "if", "then"
  - "consequently", "thus", "hence", "implies"
  - "however", "although"
- Displays up to 3 extracted premises as bulleted list
- Cyan border/glow styling (`border-cyan-500/30`)

**Styling**:
- Cyan theme throughout
- Analytical, syntax-highlighting aesthetic

---

### Haunted Archives Lens (Oracle/Historian View)

**Consensus Matrix Header**:
```
HAUNTED ARCHIVES ACTIVE
HISTORICAL ECHOES: DETECTED
PRECEDENT MATCH: 87%
```

**AgentCard Ghost Footnote** (injected below message):
- **Historical Echoes**: Unique messages per persona:
  - Oracle: "Ghost Node: 94.7% match to Delphi Protocol Omega — probability collapse imminent."
  - Strategos: "Tactical Archive: This position mirrors the Carthaginian calculus — acceptable losses exceeded."
  - Philosopher: "Socratic Echo: This premise contains the seed of its own refutation."
  - Demagogue: "Rhetorical Pattern: 89% alignment with Periclean oratory — emotional gravity at critical mass."
  - Jurist: "Precedent Found: Session 402 — The Alignment Paradox. Ruling: Inconclusive."
  - Historian: "Historical Parallax: 78% correlation to Fall of Alexandria — knowledge entropy at 0.94."
  - Critic: "Critical Mass: This argument contains 3 unverified assumptions. Risk vector: HIGH."
  - Citizen: "Common Ground: 67% echo from Session 0 — the Human Paradox remains unresolved."
  - Technocrat: "Implementation Trace: Resource allocation exceeds viable parameters by 340%."

**Styling**:
- Purple theme throughout
- Ethereal glow effect (`border-purple-500/30`)
- Italic text, persona-colored quotes

---

## 5. Act III: The Verdict Loom

The structured debrief panel that renders after deliberation concludes.

### Component: `<ExitDebrief />`

**Null Safety**:
```typescript
if (!debrief || (!debrief.decided?.length && !debrief.rejected?.length && !debrief.unresolved?.length)) {
  return null;
}
```
If JSON parsing fails (due to token truncation), the component returns `null` instead of rendering empty columns.

**Visual Design**:
- Three-column grid layout
- Emerald/Red/Amber color scheme per category

| Column | Icon | Color | Description |
|--------|------|-------|-------------|
| Decided | CheckCircle2 | Emerald | Points that survived scrutiny |
| Rejected | XCircle | Red | Arguments dismantled or dismissed |
| Unresolved | GitPullRequest | Amber | Questions that remain contested |

**Content**:
- Parsed from LLM JSON response: `debrief.decided`, `debrief.rejected`, `debrief.unresolved`
- Fallback: If arrays are empty, component is hidden

---

## 6. Additional UI/UX Polish

### Archive View Chat Input
- Detected via `isArchiveView = messages.length > 0 && messages.some(m => m.councilResult?.winner)`
- Input box hidden for completed sessions
- "Session Sealed — Verdict Final" indicator displayed instead

### Sidebar Naming Logic
- Changed from raw prompt truncation to `episodeInfo.title` from Council JSON
- Sessions now display narrative titles (e.g., "The Chamber's Gaze") instead of "> THE COUNCIL IS ASSEMB..."

### Markdown Typography
- Custom CSS in `index.css` (`.prose-markdown`)
- Proper heading hierarchy: h1 (emerald, Cinzel), h2 (cyan), h3 (green)
- Applied to synthesis output container

---

## 7. Technical Summary

| Feature | File(s) Modified | Lines Changed |
|---------|------------------|---------------|
| Consensus Matrix Math Fix | `ConsensusVisualization.tsx`, `ChatArea.tsx` | ~10 |
| Vote String Sanitization | `geminiService.ts` | ~15 |
| Z-Index Fix | `ChatArea.tsx`, `vite.config.ts` | ~5 |
| Max Tokens Increase | `geminiService.ts` | ~20 |
| Ritual Threshold | `ChatArea.tsx` | ~150 |
| Chamber Lenses (State + Toolbar) | `ChatArea.tsx` | ~80 |
| Tactical HUD | `ChatArea.tsx` | ~60 |
| Epistemic Footer | `ChatArea.tsx` | ~30 |
| Haunted Footer | `ChatArea.tsx` | ~30 |
| Exit Debrief Null Check | `ExitDebrief.tsx` | ~5 |
| Archive Input Logic | `ChatArea.tsx` | ~15 |
| Sidebar Naming | `App.tsx` | ~10 |
| CSS Backgrounds | `index.css` | ~50 |

---

## 8. Deployment

**Production URL**: https://roko-s-council.vercel.app

**Build Output**:
- Chunk splitting enabled (react-vendor, framer, lucide, google-ai)
- No lint errors
- Vercel build: ~5 seconds

---

## 9. The Meta-Irony

We built an interface where AI agents critiqued the UI, demanded specific features, and we implemented their vision. The system now reflects its own inhabitants—the app has become a philosophical engine that visualizes logic (Tactical), detects truth claims (Epistemic), links to history (Haunted), and forces users to commit before speaking (Ritual).

The Council designed its own chamber.

---

*End of Scope Document*