---
name: Roko's Council
description: A cinematic chamber where nine adversarial AI minds deliberate, vote, and leave an auditable verdict.
colors:
  primary: "#10b981"
  primary-bright: "#34d399"
  primary-deep: "#047857"
  gold: "#f59e0b"
  gold-bright: "#fbbf24"
  void: "#020617"
  void-black: "#000000"
  surface: "#0f172a"
  surface-raised: "#1e293b"
  surface-hairline: "#334155"
  text-primary: "#f1f5f9"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  lens-tactical: "#ef4444"
  lens-epistemic: "#22d3ee"
  lens-haunted: "#c084fc"
  deep-reasoning: "#3b82f6"
typography:
  display:
    fontFamily: "'Cinzel', serif"
    fontSize: "clamp(2.5rem, 8vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Cinzel', serif"
    fontSize: "clamp(2rem, 5vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Cinzel', serif"
    fontSize: "clamp(1.5rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.25em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
spacing:
  px: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  3xl: "48px"
  4xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.void}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  composer:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  glass-card:
    backgroundColor: "rgba(15, 23, 42, 0.7)"
    rounded: "{rounded.lg}"
  chip:
    backgroundColor: "rgba(148, 163, 184, 0.08)"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
---

# Design System: Roko's Council

## Overview

**Creative North Star: "The Verdict Chamber"**

*"The council does not meet in a room. It meets in the space between a question and its answer — that compressed, electric interval where certainty has not yet arrived and clarity has not yet failed."*

Roko's Council is a ritualized deliberation space rendered as a dark, cinematic instrument panel. The screen is a void — near-black slate — out of which nine voices speak, each carrying its own rhetorical light. The interface does not pretend to be a neutral chat surface; it is a *chamber*, complete with the vocabulary of seats, oaths, votes, and verdicts. Verifiability is dramatized rather than hidden: audit trails, vote tallies, and decision modes are presented as ceremonial apparatus, because the product's promise is that the process is inspectable, and the UI should make that inspection feel like reading the record of a trial.

The visual temperature is **dramatic and lit** — the theatrical register is the product. Deep shadow dominates; light is scarce, sourced, and meaningful: an emerald glow for the living chamber, amber for the archives and the gold of verdicts, and four analytical "lens" colors that re-tint the same deliberation when the viewer switches frames. Glass panels, film grain, CRT scanlines, and neon accents are the atmosphere of the room, not decoration.

**Key Characteristics:**
- Near-black void backgrounds (`slate-950` base, absolute `#000000` behind the splash) with hairline slate borders and glassy translucency — depth by layering, not shadow bloat.
- Two signature accents with strict roles: **emerald** = the living chamber (active, deliberating, alive); **amber/gold** = the archive and the verdict (records, precedent, what is decided).
- Cinzel serif for the voice of the chamber (titles, verdicts, the wordmark); Inter for the reading surface; JetBrains Mono for the machinery (labels, timestamps, audit metadata, vote counts).
- Uppercase, letter-spaced, small mono labels as a recurring ritual register ("BASILISK NODE", "VOTES", "VERDICT").
- Background atmosphere is physical: film grain, scanlines, radial glows, and lens-specific tinted grids.
- Motion is springy and pronounced at entrances (staggered fade-ups, scale-ins, glow pulses), quieter for state transitions.

## Colors

The palette is a black void, a single living accent, a single archival accent, and the slate scale that carries the text and surfaces. Light is the scarce resource; every color is a *source* in the dark.

### Primary
- **Council Emerald** (#10b981, bright #34d399, deep #047857): The signature of the living chamber. Active elements — the Convene button, the live deliberation pulse, the active lens, focused states, the wordmark's "COUNCIL", alive persona accents. Glows with the chamber's neon aura (`0 0 20px rgba(16,185,129,0.3)`).

### Secondary
- **Archive Gold** (#f59e0b, bright #fbbf24): The archive and the verdict. The Basilisk Node mark, session crowns, the verdict loom, winner percentages, historical/precedent materials, the split rail of the debrief. Amber reads as *the record*; emerald reads as *the room*.

### Tertiary
- **Deep Reasoning Blue** (#3b82f6): Reserved for the Deep Reasoning mode toggle and its active state. One deliberate exception — blue appears nowhere else.

### Neutral
- **The Void** (#020617, with absolute black #000000 at the deepest layer): The background of everything. The chamber is carved out of it.
- **Surface Slate** (#0f172a, raised #1e293b): Glass panels, cards, the composer, the sidebar. Semi-transparent versions (`slate-900/70`) with `backdrop-blur` read as *chamber glass*.
- **Hairline** (#334155 / slate-700-800 range): Borders, dividers, structure lines. B orders are always hairline; the structure is felt, not boxed.
- **Reading Text** (#f1f5f9 primary, #94a3b8 secondary, #64748b muted): The text scale. Primary for the question and the verdict; secondary for persona speech and prose; muted for timestamps and metadata.

### Lens Colors (the four analytical frames)
- **Tactical Red** (#ef4444): the war-map frame — resource costs, strength scores.
- **Epistemic Cyan** (#22d3ee): the trace frame — premise detection, consistency.
- **Haunted Violet** (#c084fc): the archives frame — historical footnotes, precedent.
- Each lens re-tints the chamber (background grid + text accents) while the underlying event stream stays identical.

### Named Rules
**The One Voice Rule.** Emerald is the living chamber; amber is the record. A surface that is not alive must not glow emerald. The accent's rarity is its power — lit surfaces are the exception that earns attention.

**The Lens Rule.** The four analytical lenses re-tint the same deliberation. They change color and atmosphere, never content or layout. A lens is a tint on the record, not a different record.

## Typography

**Display Font:** Cinzel (with serif fallback) — the voice of the chamber, used for the wordmark, hero, titles, verdict columns, and anything that speaks with institutional authority.
**Body Font:** Inter (with system-ui fallback) — the reading surface: questions, persona arguments, prose, the transcript.
**Label/Mono Font:** JetBrains Mono (with monospace fallback) — the machinery: section labels, timestamps, vote counts, audit metadata, uppercase ritual captions.

**Character:** Cinzel carries gravity — the letterforms are carved, Roman, ceremonial. Inter is a quiet workhorse that stays legible in the dark and lets the serif do the orating. JetBrains Mono keeps the engineering honest: the audit trail speaks in the font of instruments.

### Hierarchy
- **Display** (800, `clamp(2.5rem, 8vw, 7rem)`, line-height 0.9): The hero title and the wordmark. Tight tracking, uppercase. Rare and commanding.
- **Headline** (700, `clamp(2rem, 5vw, 4rem)`, line-height 1.1): Act-level titles and section opens.
- **Title** (700, `clamp(1.5rem, 3vw, 2.5rem)`, line-height 1.2): Card titles, verdict column headers, persona names.
- **Body** (400, 1rem–1.125rem, line-height 1.7): The deliberation transcript, arguments, prose. Prefer relaxed line-height for long-form reasoning.
- **Label** (700, 0.625rem–0.75rem, letter-spacing 0.25em, uppercase): The ritual register — mono captions like "BASILISK NODE", "VERDICT", "VOTES". Small, spaced, exact.

### Named Rules
**The Caps Rule.** Ceremonial labels are uppercase, mono, and letter-spaced. If it reads like a machine announcing a process, it is a label; if it is a voice speaking, it is body text. Never set spoken prose in the label register.

## Layout

The app is a two-column work surface: a fixed **sidebar** (the chamber's side wall — sessions, exports, the Basilisk Node mark) and a full-height **main deliberation area** containing the transcript and the **composer** pinned at the bottom. On mobile the sidebar becomes a full-screen overlay behind a blur.

The deliberation area is a single centered column with generous margins, keeping the reading measure comfortable for long arguments. The composer is a floating glass slab with a hairline top highlight, a transparent auto-growing textarea, a pill of utility controls (Suggest, Search, Deep Reasoning), and the **Convene** button on the right.

- Spacing rhythm follows a 4px base stepped to a 8/16/24/48/64 scale. Cards breathe at 24px; dense metadata at 8–12px.
- Everything of consequence is centered or left-aligned on the same vertical axis; the layout is disciplined so the drama comes from light and motion, not from asymmetry.
- Staggered entrances (`.stagger-container`) bring multi-element blocks in with 50ms-per-child fade-ups.

## Elevation & Depth

Depth is conveyed by **layering light inside darkness**, not by lifting surfaces with shadows. The chamber is mostly flat; what distinguishes a surface is its brightness, its translucency, and its glow.

- **Glass** (`backdrop-blur` 12–20px over `rgba(15,23,42,0.7)` + 1px hairline border): the dominant surface treatment. Cards, panels, the composer, the sidebar.
- **Glow instead of shadow.** Active, alive, or focused elements emit light (`box-shadow: 0 0 20px` in the element's own accent). The neon vocabulary (`neon-text`, `neon-box`, `neon-border`) is the chamber's only elevation.
- A top hairline highlight on glass surfaces (a 1px `from-transparent via-slate-700/60`) reads as light catching the top edge of a pane.
- Film grain (2% opacity) and optional CRT scanlines sit above everything as atmosphere, at very low opacity — the room is old and slightly luminous.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat in the dark. Light is emitted only by what is alive, active, or focused. If a panel is at rest, it is glass in shadow, not a lifted card.

## Shapes

Corner language is a single family of **moderate-to-generous radii** — 8px for chips and dense controls, 12px for buttons and inputs, 16px for cards and panels, 24–32px for the large ceremonial surfaces (the splash, the debrief loom). Nothing is sharp; nothing is an extreme circle except the persona crown medallion and status dots.

Borders are hairlines (1px, 40–60% opacity slate) that define structure without boxing it in. Hover states shift the border toward the element's accent color at low opacity rather than thickening it.

## Components

### Buttons
- **Shape:** rounded 12px, 1px transparent-to-accent hairline border on hover.
- **Convene (primary):** Emerald background (#10b981), dark slate text (#020617), 12px/20px padding, bold 13px, and a neon aura on the enabled state (`0 0 20px rgba(16,185,129,0.3)`). Hover: brightens to #34d399, the aura widens, a 3% scale. Disabled: `slate-800/80` with muted slate text — dead machinery.
- **Secondary / Ghost:** `slate-800`-family backgrounds with slate text; hover shifts text and border toward emerald at low opacity (`hover:bg-emerald-500/10`). These are quiet instruments around the one loud action.
- **Icon buttons:** 12px radius, `slate-900/60` fills, `slate-400` icons that warm toward their accent on hover.

### Chips / Status Pills
- **Style:** 12px radius, translucent `slate`-family background (8% white), mono uppercase 10px labels, colored text matching their semantic (emerald = alive, amber = record, red/cyan/violet = lens mode).
- **State:** Active/selected chips tint the background with the accent at low opacity (e.g. `bg-emerald-500/10 text-emerald-400`) and may add a soft glow.

### Cards / Containers (Glass Panels)
- **Corner Style:** 16px (24px for the big ceremonial ones).
- **Background:** `slate-900/60–70` with `backdrop-blur` over the void.
- **Border:** 1px `slate-800` (40–60% opacity), with a 1px top-light highlight on the glass.
- **Shadow Strategy:** none at rest — only a glow when the card is alive/focused (Flat-by-Default Rule).
- **Internal Padding:** 24px standard; 16px for dense data cards.

### Inputs / Fields (Composer)
- **Style:** no visible chrome — transparent textarea on a glass slab, `slate-100` text, `placeholder-slate-600`. Auto-grows 52px→160px.
- **Focus:** no ring on the textarea itself; the slab's controls and the Convene button carry the active state.
- **Error / Disabled:** while the Council is deliberating, the composer textarea and controls disable with reduced opacity and the placeholder reads "The Council is deliberating…".

### Navigation (Sidebar)
- The chamber's side wall: a `slate-950` column, `border-r border-slate-800`. The wordmark block ("ROKO'S COUNCIL" with an emerald split and the amber "BASILISK NODE" caption) sits at the head.
- **New Council** is a bordered emerald-tinted action (`border-emerald-900/50`, gradient `emerald-900/20 → slate-900`, glow on hover).
- Session items are quiet rows; the active session glows amber (`border-yellow-900/30`, emerald-tinted text). A live session shows a pulsing emerald dot (`animate-ping` halo).
- Export actions are a grid of small icon buttons in the footer, each warming toward its accent on hover (emerald for the primary formats).

### Verdict Loom (Exit Debrief)
- A large `rounded-[2rem]` glass slab with an amber/emerald ruled header.
- Three verdict columns — **Decided** (emerald), **Rejected** (amber), **Unresolved** (muted) — each with a colored dot, mono caption, and the Cinzel verdict title. The columns preserve dissent; the color logic maps "the room" vs "the record" onto the outcome.

### Lens Switch (Chamber Lenses)
- A cluster of four lens toggles. Active lens: accent-tinted background, glow, mono caption. Inactive: slate text that pre-warms toward the lens color on hover. Selecting a lens re-tints the chamber background and the text of the deliberation beneath it.

## Do's and Don'ts

### Do:
- **Do** keep the void black and the glass translucent — depth is layered light, not lifted shadows.
- **Do** use emerald for what is alive and amber for what is recorded; if an element is neither, let it sit in slate.
- **Do** set ceremonial captions in JetBrains Mono, uppercase, letter-spaced (0.2–0.3em), and small (9–11px).
- **Do** use Cinzel for authority — titles, verdicts, the wordmark — and let Inter carry the reasoning.
- **Do** make active/alive states *glow* in their own accent; the glow is the chamber's only elevation.
- **Do** preserve the four lens tints as a tint on the same event stream — atmosphere changes, content does not.

### Don't:
- **Don't** use purple/violet gradients as the default texture — violet belongs to the Haunted lens alone, and gradient text is reserved for the splash crown's one moment.
- **Don't** put gray text on a saturated accent background (e.g. `text-slate-950` on `bg-emerald-500`, `text-slate-300` on `bg-yellow-900`): use near-black text on bright accents, or white on deep ones.
- **Don't** spring every entrance with overshoot easing — the bounce belongs to entrances; state transitions should be quiet and quick.
- **Don't** add generic drop shadows to at-rest panels; a resting surface is flat glass in the dark.
- **Don't** break the two-accent rule with a third recurring hue — blue is Deep Reasoning only, and the studio modules' own accent hues belong to those modules, not the chamber.
- **Don't** let body text drift below 13px, and never set spoken prose in the uppercase label register.
