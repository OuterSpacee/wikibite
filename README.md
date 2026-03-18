# Wiki Bite

An AI-powered infinite wiki where every word is a hyperlink. Click any word to dive deeper into an endless chain of knowledge.

## Features

- **Multi-Provider AI** — Support for Gemini, OpenAI, Claude, Ollama (local/free), and OpenRouter
- **Shareable URLs** — Every topic has a `/wiki/:topic` URL you can share
- **IndexedDB Caching** — Previously explored topics load instantly from cache
- **Bookmarks** — Save and organize your favorite topics
- **Export** — Download content as Markdown, JSON, or Plain Text
- **Knowledge Graph** — Interactive D3.js visualization of explored topics and their connections
- **Command Palette** — Quick access via `Ctrl+K` to search topics and actions
- **Keyboard Shortcuts** — `/` search, `b` bookmark, `h` history, `t` theme, `r` random topic
- **Config Wizard** — First-run setup to choose your AI provider and enter API keys
- **Encrypted Key Storage** — API keys encrypted with AES-256-GCM in the browser
- **Multi-Tab Sync** — Config changes sync across browser tabs via BroadcastChannel
- **Dark Mode** — Automatic theme detection with manual toggle
- **13 Languages** — English, Spanish, French, German, Chinese, Japanese, Arabic, Hindi, Portuguese, Russian, Korean, Italian, Bengali
- **Accessibility** — Semantic landmarks, ARIA live regions, prefers-reduced-motion support

## Quick Start

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# Install dependencies
pnpm install

# Set your API key (optional — you can also configure in-app)
cp .env.example .env.local
# Edit .env.local with your API key

# Start development server
pnpm dev
```

Open http://localhost:3000 and start exploring!

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `/` | Focus search bar |
| `b` | Toggle bookmark |
| `h` | Toggle history sidebar |
| `t` | Toggle theme |
| `r` | Random topic |
| `Esc` | Close modals |
| `Alt+Left` | Browser back |
| `Alt+Right` | Browser forward |

## Architecture

```
wiki-bite/
├── packages/
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── contexts/       # React contexts (Theme, History, Config, Bookmarks, Language)
│       │   ├── hooks/          # Custom hooks (keyboard shortcuts)
│       │   ├── routes/         # Page routes (home, wiki, bookmarks, graph, settings)
│       │   ├── services/       # AI providers, cache, retry logic
│       │   └── lib/            # Utilities (export, encryption)
│       └── tests/              # Vitest + Testing Library
├── LICENSE                     # MIT
├── CONTRIBUTING.md
└── SECURITY.md
```

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, React Router 7, Tailwind CSS 4, D3.js, IndexedDB (idb), Vitest

## AI Providers

| Provider | Requires API Key | Notes |
|----------|:---:|-------|
| Google Gemini | Yes | Default provider |
| OpenAI | Yes | GPT models |
| Anthropic Claude | Yes | Claude models |
| Ollama | No | Local/free, requires Ollama running |
| OpenRouter | Yes | Access to multiple models |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](LICENSE) — Wiki Bite Contributors
