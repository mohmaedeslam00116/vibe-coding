# Vibe Coding

> Transform your ideas into code with AI. A lightweight, browser-first Vibe Coding platform that generates complete project codebases from natural language descriptions.

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Deploy](https://img.shields.io/badge/deploy-Netlify-00C7B7)
![License](https://img.shields.io/badge/license-MIT-blue)
![Size](https://img.shields.io/badge/gzip-46kB-lightgrey)

---

## ✨ Features

- **Natural Language → Code** — Describe your idea and get a complete, runnable project
- **Real-time Progress** — Live build stages with streaming logs
- **File Explorer** — Browse and inspect every generated file with a tree view
- **Code Viewer** — Read source code with syntax-highlighted display
- **Live Preview** — Preview HTML-based projects directly in the browser
- **ZIP Download** — Export the complete project as a single archive
- **Privacy First** — Your API key is stored locally in your browser, never on a server
- **No Accounts** — No signup, no authentication, no database
- **Lightweight** — Zero server infrastructure, runs entirely in your browser
- **Netlify-Ready** — Deploy in one click with the included `netlify.toml`

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │  Landing  │  │          │  │  OpenCode Zen API  │ │
│  │  + Idea   │→ │ Workspace│  │                    │ │
│  │  Input    │  │          │  │  (Direct Fetch)    │ │
│  └──────────┘  │ ┌──────┐ │  └─────────┬─────────┘ │
│                │ │Files │ │            │            │
│                │ │Tree  │ │  ◄──── Streaming ────   │
│                │ ├──────┤ │            │            │
│                │ │Code  │ │  ┌──────────────────┐  │
│                │ │Editor│ │  │  localStorage     │  │
│                │ ├──────┤ │  │  (API Key + Idea) │  │
│                │ │Build │ │  └──────────────────┘  │
│                │ │Logs  │ │                        │
│                │ └──────┘ │                        │
│                └──────────┘                        │
└─────────────────────────────────────────────────────┘
```

- **Zero server-side processing** — Everything runs in the browser
- **Direct API integration** — No backend proxy needed
- **Static deployment** — Single HTML + JS + CSS, hosted on any static platform

## 🚀 Quick Start

### Local Development

```bash
# Clone
cd vibe-coding

# Install dependencies
npm install

# Start dev server (standalone — API calls go direct, may have CORS issues)
npm run dev

# OR start with Netlify dev (includes CORS proxy function)
npm install -g netlify-cli
netlify dev
```

### Deploy to Netlify

**One-click deploy:**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

**Manual deploy:**

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to Netlify:
   - Drag and drop `dist/` into Netlify Deploy
   - Or connect your Git repository
   - The included `netlify.toml` handles all configuration

### Get an API Key

1. Visit [OpenCode AI](https://opencode.ai) and create an account
2. Generate an API key from your dashboard
3. Enter the key in the app's settings (click "Set API Key" in the header)

## 🎯 How to Use

1. **Enter your idea** — Describe what you want to build in natural language
2. **Generate** — Click "Generate Project" and watch the AI build your codebase
3. **Browse** — Explore the generated file tree and view source code
4. **Preview** — See HTML-based projects live in the built-in preview
5. **Download** — Export the complete project as a ZIP file

### Example Prompts

- "Build a personal finance dashboard with charts, transaction history, and budget tracking"
- "Create a Pokemon card viewer that fetches from an API and displays cards in a grid"
- "Build a markdown note-taking app with local storage persistence"
- "Create a real-time chat interface with WebSocket support"

## 🧰 Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| Vanilla JS (ES Modules) | Application logic |
| CSS Custom Properties | Design system and theming |
| [OpenCode Zen API](https://opencode.ai) | AI code generation |
| [JSZip](https://stuk.github.io/jszip/) | ZIP file creation in the browser |
| [Geist](https://vercel.com/font) + [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Typography |

## 📁 Project Structure

```
vibe-coding/
├── index.html               # Entry point
├── vite.config.mjs          # Vite configuration
├── netlify.toml             # Netlify deployment config
├── package.json             # Dependencies and scripts
├── public/
│   └── favicon.svg          # App icon
└── src/
    ├── main.js              # Entry point
    ├── app.js               # Main application controller
    ├── styles/
    │   ├── variables.css    # Design tokens
    │   ├── base.css         # Base/reset styles
    │   ├── components.css   # Component styles
    │   └── layout.css       # Layout styles
    └── services/
        ├── opencode.js      # OpenCode Zen API client
        ├── storage.js        # LocalStorage wrapper
        ├── zip.js           # ZIP and preview utilities
        └── icons.js         # SVG icon system
```

## 🔒 Privacy

- **Your API key never leaves your browser** — stored only in `localStorage`
- **No telemetry** — zero tracking scripts
- **No backend** — all processing is client-side
- **No database** — no accounts, no user data collection
- **Open source** — fully auditable codebase

## 🌐 Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
