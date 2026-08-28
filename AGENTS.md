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
- `./services/` — API and service logic (7 files including geminiService, speechService, etc.)
- `./api/` — API route handlers (2 files)
- `./public/` — Static assets (logos, avatars, backgrounds, splash video)

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
