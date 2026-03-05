<div align="center">
  <img width="1200" height="475" alt="Roko's Council Banner" src="/public/background-dark.jpg" />
  <h1 align="center">ROKO'S COUNCIL</h1>
  <p align="center">High-dimensional AI deliberation interface</p>
  
  [![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-blue?style=for-the-badge&logo=vercel)](https://roko-s-council.vercel.app)
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/Michaelrobins938/rokos-council)
</div>

## 🚀 Live Demo

**[https://roko-s-council.vercel.app](https://roko-s-council.vercel.app)**

## 📖 About Roko's Council

Roko's Council is an advanced AI deliberation interface that employs multiple AI personas to debate and analyze complex ethical, philosophical, and strategic problems from various perspectives. Each council member represents a unique viewpoint and analytical framework, providing comprehensive multi-faceted analysis.

### Features

- **Multi-Persona Deliberation**: Council members including Oracle, Strategos, Philosopher, Demagogue, Jurist, Citizen, Historian, Critic, and Technocrat
- **Cinematic Council Visualization**: Animated council assembly, deliberation, and voting phases with visual feedback
- **Real-Time Speech Generation**: TTS (Text-to-Speech) support for council member voices
- **Deep Reasoning Mode**: Enhanced deliberation protocol for complex problems
- **Live Link Support**: Real-time conversation mode
- **Web Search Integration**: Context-aware web search for enhanced analysis
- **Persistent Sessions**: Chat history saved locally
- **Cinematic Splash Screen**: Immersive video intro experience
- **Beautiful UI**: Dark theme with emerald and gold accents, particle effects, and smooth animations

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Build Tool**: Vite
- **AI Services**: Google Gemini API, OpenRouter
- **Icons**: Lucide React
- **Markdown**: react-markdown

## 📦 Installation

**Prerequisites**: Node.js 18+

### Clone the repository

```bash
git clone https://github.com/Michaelrobins938/rokos-council.git
cd rokos-council
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Add your API keys to the `.env` file:

```
GEMINI_API_KEY=your_gemini_api_key_here
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_API_KEY_2=your_nvidia_api_key_2_here
NVIDIA_API_KEY_3=your_nvidia_api_key_3_here
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🏗️ Build for production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🎯 Usage

1. **Start a New Session**: Click "New Session" in the sidebar
2. **Select a Directive**: Choose from pre-configured ethical dilemmas or enter your own query
3. **Council Assembly**: Watch as the council assembles and deliberates
4. **Review Consensus**: Examine the final synthesis and individual council member opinions
5. **Explore Opinions**: Click on any council member to see their detailed analysis and voting rationale

## 🧠 Council Members

- **Oracle**: The All-Seeing - Uses foresight and prediction
- **Strategos**: The Commander - Focuses on tactical advantage
- **Philosopher**: The Thinker - Applies ethical and logical frameworks
- **Demagogue**: The Voice - Represents popular sentiment and rhetoric
- **Jurist**: The Law - Considers legal and procedural aspects
- **Citizen**: The People - Represents common interests
- **Historian**: The Keeper - Draws from historical precedents
- **Critic**: The Skeptic - Identifies flaws and risks
- **Technocrat**: The Architect - Focuses on technical feasibility

## 🌐 Deployment

### Vercel (Recommended)

The easiest way to deploy is using Vercel:

```bash
npm install -g vercel
vercel
```

Follow the prompts to deploy. The application will be live at `https://your-project.vercel.app`.

### Other Platforms

This is a standard Vite/React application and can be deployed to any platform that supports static sites (Netlify, GitHub Pages, Cloudflare Pages, etc.).

## 📜 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

**View your app in AI Studio**: https://ai.studio/apps/0c7d39ab-ed92-4a7c-8063-fd47a1874a69
