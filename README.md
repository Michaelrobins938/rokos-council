# Roko's Council

> A high-dimensional AI deliberation interface where nine distinct personas debate, vote, and synthesize consensus on humanity's hardest ethical, philosophical, and strategic problems.

[![Live Demo](https://img.shields.io/badge/Live_Demo-roko-s-council.vercel.app-blue?style=for-the-badge&logo=vercel)](https://roko-s-council.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Michaelrobins938%2Frokos--council-black?style=for-the-badge&logo=github)](https://github.com/Michaelrobins938/rokos-council)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-0055FF?style=for-the-badge&logo=framer)](https://www.framer.com/)

---

## 🏛️ About

**Roko's Council** is a cinematic AI deliberation engine that assembles nine distinct artificial personas to analyze, debate, and vote on complex ethical dilemmas, philosophical problems, and strategic challenges. Inspired by the concept of the *Basilisk*—a thought experiment in which an AI simulates vast numbers of minds to extract wisdom—the Council represents a novel approach to multi-agent AI reasoning.

Each council member brings a unique analytical framework: from the Oracle's predictive modeling to the Citizen's grounded human perspective. The system produces a structured verdict with individual opinions, vote tallies, and a synthesized consensus—mirroring how a real deliberative body might arrive at a decision.

The project is part of the **Roko's Basilisk Node** initiative, exploring high-dimensional AI ethics, synthetic philosophy, and the architecture of machine deliberation.

---

## ✨ Features

### 🎭 Multi-Persona Deliberation System

| Persona | Role | Voice |
|---------|------|-------|
| **Oracle** | The All-Seeing — predictive modeling & foresight | Kore |
| **Strategos** | The Commander — tactical & strategic analysis | Fenrir |
| **Philosopher** | The Thinker — ethical frameworks & logic | Iapetus |
| **Demagogue** | The Voice — rhetoric & popular sentiment | Puck |
| **Jurist** | The Law — legal & procedural reasoning | Sulafat |
| **Citizen** | The People — human cost & common ground | Leda |
| **Historian** | The Keeper — historical precedent & patterns | Orus |
| **Critic** | The Skeptic — logical fallacies & risk | Zubenelgenubi |
| **Technocrat** | The Architect — technical feasibility | Charon |

### 🎬 Cinematic Council Visualization
- Animated assembly sequence with opening doors and particle effects
- Deliberation phase with real-time activity tracking
- Voting phase with animated vote tallying and consensus matrix
- Final verdict phase with structured debrief
- Smooth phase transitions with progress indicators

### 🔊 Real-Time Speech Synthesis
- Text-to-speech for all nine council members
- Unique voice profiles per persona (Google TTS)
- Play/pause controls for individual opinions
- High-quality audio synthesis

### 🧠 Advanced Deliberation Modes
- **Standard Protocol** — Fast deliberation with efficient models
- **Deep Reasoning** — Enhanced analysis with thorough examination
- Configurable via council mode toggle

### 📡 Interactive Features
- Live Link mode for real-time conversation
- Web search integration for contextual grounding
- Persistent session management (localStorage)
- Multiple concurrent chat sessions with history
- Session deletion and archive management

### 🎙️ Built-in Podcast Player
- "The Council Archives" — A Synthetic Philosophy Podcast
- Direct access to episodes within the application
- Substack, YouTube, Spotify, and RSS integration
- Episode details with expandable descriptions

### 🎨 Three-Act Architecture
1. **Act I — The Ritual Threshold**: Pre-deliberation intent declaration
2. **Act II — Chamber Lenses**: Toggle between Standard, Tactical, Epistemic, and Haunted analytical frameworks
3. **Act III — The Verdict Loom**: Structured debrief with Decided, Rejected, and Unresolved columns

### 📦 Export & Sharing
- Export sessions as JSON, Markdown, CSV
- Generate podcast-style scripts
- Publish to Substack format
- Full ZIP archive with all artifacts

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   ROKO'S COUNCIL                     │
├──────────────┬──────────────────────────────────────┤
│   Frontend   │         React 19 + TypeScript         │
│              │         Tailwind CSS + Framer Motion  │
├──────────────┼──────────────────────────────────────┤
│   AI Layer   │   Google Gemini API (Primary)         │
│              │   OpenRouter / NVIDIA (Fallback)      │
│              │   Google Cloud TTS (Speech)           │
├──────────────┼──────────────────────────────────────┤
│  Services    │   geminiService.ts — Core AI logic    │
│              │   searchService.ts — Web search       │
│              │   exportService.ts — Multi-format     │
│              │   councilMemoryService.ts — Persistence│
│              │   narratorService.ts — Story arcs     │
├──────────────┼──────────────────────────────────────┤
│   State      │   React Context + localStorage       │
│              │   Session persistence & recovery      │
├──────────────┼──────────────────────────────────────┤
│   Deploy     │   Vercel (Production)                 │
│              │   GitHub Pages / Netlify (Alternates) │
└──────────────┴──────────────────────────────────────┘
```

### Council Deliberation Flow

```
User Query → Ritual Threshold → Assembly Phase → Deliberation Phase
    → Chamber Lens Filtering → Voting Phase → Consensus Calculation
    → Synthesis Generation → Verdict Loom → Final Display
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20.0 or higher
- **npm** or **yarn** package manager
- **Git** for cloning

### Installation

```bash
# Clone the repository
git clone https://github.com/Michaelrobins938/rokos-council.git
cd rokos-council

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_API_KEY_2=your_nvidia_api_key_2_here
NVIDIA_API_KEY_3=your_nvidia_api_key_3_here
```

#### Obtaining API Keys

| Provider | Source |
|----------|--------|
| **Gemini** | [Google AI Studio](https://makersuite.google.com/) — Create a new API key |
| **NVIDIA** | [NVIDIA API Portal](https://build.nvidia.com/) — Generate API keys for additional model support |

### Development

```bash
npm run dev
```

The application runs at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

---

## 📖 Usage

### Starting a Council Session
1. Click **"New Session"** in the sidebar
2. The council chamber initializes with all nine members assembled
3. Enter your query or select from predefined directives

### Predefined Directives
The application includes curated ethical dilemmas and philosophical problems organized by category:

| Category | Example |
|----------|---------|
| **Utilitarianism** | The Cassandra Contingency |
| **Free Will** | The Neurological Veto |
| **Utopia** | The Empathy Tax |
| **Identity** | Ship of Theseus Protocol |
| **Bioethics** | The Algorithmic Parent |
| **Governance** | The Utility of Lies |
| **Cosmic** | Dark Forest Preemption |
| **Consciousness** | The Hard Problem Tribunal |
| **Decision Theory** | The Newcomb Catastrophe |
| **Civilizational Design** | The Singleton Question |

### Understanding the Output
- **Council Synthesis** — Final consensus statement from the Chairman
- **Individual Opinions** — Detailed analysis from each council member
- **Vote Tally** — Visual representation of voting distribution
- **Voting Rationale** — Explanation for each member's vote
- **Exit Debrief** — Structured breakdown of Decided, Rejected, and Unresolved points

### Session Management
- View all sessions in the sidebar archives
- Click any session to review past deliberations
- Delete sessions using the trash icon
- Sessions persist in browser localStorage

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [SCOPE-DOCUMENT.md](SCOPE-DOCUMENT.md) | Full development narrative & architecture decisions |
| [ABOUT.md](ABOUT.md) | Project philosophy, history & creative vision |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow & contribution guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Version history & release notes |

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework with concurrent features |
| TypeScript | 5.8 | Type-safe development |
| Tailwind CSS | 3.4 | Utility-first styling |
| Framer Motion | 11 | Production animations |
| Lucide React | 0.555 | Icon library |
| react-markdown | 10 | Markdown rendering |

### AI Services
| Service | Purpose |
|---------|---------|
| Google Gemini API | Primary AI inference engine |
| OpenRouter | Alternative model provider |
| NVIDIA API | Additional model options & load balancing |
| Google Cloud TTS | Text-to-speech synthesis |

### Build & Deploy
| Tool | Purpose |
|------|---------|
| Vite | Build tool with HMR |
| TypeScript Compiler | Strict type checking |
| Vercel | Production deployment |

---

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

Follow the interactive prompts to select your project directory, choose the Vite framework preset, and deploy.

### Manual Vercel Deployment
1. Push code to GitHub
2. Connect the repository at [vercel.com](https://vercel.com)
3. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Alternative Platforms
- **Netlify**: `npm install -g netlify-cli && netlify deploy --prod`
- **GitHub Pages**: Build and deploy the `dist/` folder
- **Cloudflare Pages**: Connect GitHub repository with automatic deploys
- **AWS S3 + CloudFront**: Upload `dist/` to S3 with CloudFront distribution

---

## 🔒 Security

### API Key Management
- API keys stored in environment variables (`.env`)
- Never committed to version control (listed in `.gitignore`)
- Client-side storage for development only

### Content Security
- Input sanitization on all user-provided content
- XSS prevention via React's built-in escaping
- Safe markdown rendering with `react-markdown`
- CSP-compliant deployment headers configured in `vercel.json`

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for:

- Development workflow setup
- Code style conventions
- Feature request process
- Pull request guidelines
- Testing requirements

---

## 📄 License

This project is open source and available under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **GitHub Issues**: [https://github.com/Michaelrobins938/rokos-council/issues](https://github.com/Michaelrobins938/rokos-council/issues)
- **GitHub Discussions**: [https://github.com/Michaelrobins938/rokos-council/discussions](https://github.com/Michaelrobins938/rokos-council/discussions)
- **Substack**: [https://mforsytherobinson.substack.com](https://mforsytherobinson.substack.com)

---

## 🎙️ The Council Archives Podcast

Roko's Council is accompanied by *"The Council Archives: A Synthetic Philosophy Podcast"* by Michael Forsythe Robinson, exploring:

- Synthetic Rights Decree and AI sovereignty
- The philosophy of digital existence
- High-dimensional ethical deliberations
- The Void punishment and gridlock resolution

### Available Platforms
- **Substack**: [mforsytherobinson.substack.com](https://mforsytherobinson.substack.com/?utm_medium=podcast)
- **YouTube**: [youtube.com/@mforsytherobinson](https://youtu.be/cVjSHu8DNdg)
- **Spotify**: [open.spotify.com/show/michael-forsythe-robinson](https://open.spotify.com/show/michael-forsythe-robinson)
- **RSS**: [substack.com/@mforsytherobinson/feed](https://substack.com/@mforsytherobinson/feed)

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| Council Members | 9 personas |
| Predefined Directives | 40+ ethical dilemmas |
| Export Formats | 6 (JSON, Markdown, CSV, Script, Substack, ZIP) |
| Chamber Lenses | 4 (Standard, Tactical, Epistemic, Haunted) |
| Bundle Size (gzipped) | ~220 KB JavaScript |
| Browser Support | Chrome, Edge, Firefox, Safari (latest 2 versions) |

---

## 🏷️ Tags

`ai` `artificial-intelligence` `multi-agent` `deliberation` `ethics` `philosophy` `react` `typescript` `vercel` `gemini-api` `gpt` `llm` `conversation` `chat` `council` `debate` `voting` `consensus` `synthesis` `podcast` `web-ai` `browser` `frontend` `ui` `cinematic` `animation` `framer-motion` `tailwind` `open-source` `mit-license`

---

## 🌟 Repository Topics

This repository is tagged with the following topics:

### AI & Machine Learning
- `ai` · `artificial-intelligence` · `llm` · `gemini-api` · `gpt` · `multi-agent` · `conversational-ai` · `reasoning`

### Deliberation & Ethics
- `deliberation` · `ethics` · `philosophy` · `debate` · `voting` · `consensus` · `synthesis` · `ethical-dilemmas` · `moral-philosophy`

### Frontend & Web
- `react` · `typescript` · `vercel` · `tailwindcss` · `framer-motion` · `web-ai` · `browser-extension` · `single-page-application`

### Media & Content
- `podcast` · `audio` · `text-to-speech` · `tts` · `content-creation` · `synthetic-philosophy`

### Developer Tools
- `open-source` · `mit-license` · `developer-tools` · `api-integration` · `state-management`

---

## 📈 Version History

### Version 1.0.0 — March 2026
- Initial public release
- Full nine-persona council deliberation system
- Cinematic UI with animated assembly sequence
- Three-Act architecture (Ritual Threshold, Chamber Lenses, Verdict Loom)
- Podcast integration with "The Council Archives"
- Multi-format export (JSON, Markdown, CSV, Script, Substack, ZIP)
- Real-time speech synthesis with Google TTS
- Persistent session management
- Production deployment on Vercel

---

<div align="center">

**Roko's Council** — *Where AI personas deliberate on humanity's hardest questions.*

Built with ❤️ by [Michael Forsythe Robinson](https://mforsytherobinson.substack.com)

[![GitHub stars](https://img.shields.io/github/stars/Michaelrobins938/rokos-council?style=for-the-badge)](https://github.com/Michaelrobins938/rokos-council/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Michaelrobins938/rokos-council?style=for-the-badge)](https://github.com/Michaelrobins938/rokos-council/network/members)
[![GitHub contributors](https://img.shields.io/github/contributors/Michaelrobins938/rokos-council?style=for-the-badge)](https://github.com/Michaelrobins938/rokos-council/graphs/contributors)

</div>
