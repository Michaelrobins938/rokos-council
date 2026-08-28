# Contributing to Roko's Council

Thank you for your interest in contributing to Roko's Council! This document provides guidelines and instructions for contributing to the project.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** or **yarn** package manager
- A code editor (VS Code recommended)

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/rokos-council.git
   cd rokos-council
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Add your Google API key to `.env`.
5. Start the development server:
   ```bash
   npm run dev
   ```

---

## Development Workflow

### Branch Naming

Use descriptive branch names following these conventions:

- `feature/<description>` — New features
- `fix/<description>` — Bug fixes
- `docs/<description>` — Documentation updates
- `style/<description>` — Styling changes
- `refactor/<description>` — Code refactoring

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation change
- `style:` — Formatting, missing semicolons, etc.
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

Example:
```
feat: add Haunted Archives lens with historical echo footnotes
```

---

## Code Style

### TypeScript

- Use strict TypeScript settings (`tsconfig.json`)
- Avoid `any` types — use proper type annotations
- Prefer `const` over `let`; avoid `var`
- Use meaningful variable and function names

### React

- Use functional components with hooks
- Keep components focused and composable
- Use `framer-motion` for animations
- Follow the existing component structure in `./components/`

### CSS / Tailwind

- Use Tailwind utility classes as the primary styling mechanism
- Add custom design tokens to `index.css` when needed
- Follow the existing CSS variable conventions
- Avoid inline styles except for dynamic values

---

## Project Structure

```
rokos-council/
├── src/               # Application source code
│   ├── components/    # React components
│   ├── services/      # API and service logic
│   ├── api/           # API route handlers
│   └── types/         # TypeScript type definitions
├── public/            # Static assets
├── components/        # Additional components
├── services/          # Additional services
├── api/               # Additional API routes
├── index.html         # HTML entry point
├── index.css          # Global styles and design tokens
├── App.tsx            # Root application component
├── types.ts           # Global type definitions
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── vercel.json        # Vercel deployment configuration
└── package.json       # Project manifest
```

---

## Running Tests

Currently, the project does not have a dedicated test suite. Before adding new features or fixing bugs, please manually verify:

1. The development server starts without errors (`npm run dev`)
2. The build completes successfully (`npm run build`)
3. No TypeScript errors (`npm run lint`)
4. The application renders correctly in the browser

---

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Ensure all checks pass (build, lint, no TypeScript errors)
4. Push your branch to your fork
5. Open a Pull Request against the `main` branch
6. Provide a clear description of your changes and any relevant context

---

## Code of Conduct

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Questions?

If you have questions about contributing, feel free to open an issue on GitHub for discussion.
