# Contributing to Gittymon

Thanks for your interest in contributing! Gittymon is a retro-styled web app that summons roasting monsters from GitHub profiles — all inside a faithful GBA SP clamshell console simulation.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Conventions](#code-conventions)
- [CI Pipeline](#ci-pipeline)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js 22+** (the CI runs on 22; older versions may work but aren't tested)
- **npm** (bundled with Node.js)
- A free **[Groq API key](https://console.groq.com)** (Llama 3.3 70B for monster generation, Llama 3.1 8B for boss roasts)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/kevinjobin1/Gittymon.git
cd Gittymon

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Groq API key:
# GROQ_API_KEY="gsk_your_key_here"

# 4. Start the dev server
npm run dev
```

The app starts at **http://localhost:3000**. Changes to `server.ts`, `src/`, and `shared/` hot-reload automatically.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for AI monster generation |
| `APP_URL` | No | Public deployment URL for self-referential embed links |

The app falls back to locally-generated mock monsters if `GROQ_API_KEY` is missing — you can develop and test all UI flows without an API key.

---

## Project Architecture

Gittymon runs on **two runtimes** from a single codebase:

### Runtimes

| Environment | Entry Point | Server Framework | Storage |
|-------------|------------|------------------|---------|
| **Local dev** | `server.ts` | Express.js + `tsx` hot-reload | Local files (`leaderboard.json`, `summon-cache.json`) |
| **Production** | `src/worker.ts` | Cloudflare Workers | KV namespaces (`LEADERBOARD`, `SUMMON_CACHE`) + Durable Objects (WebSocket multiplayer) |

### Directory Map

```
Gittymon/
├── server.ts                  # Express dev server (AI endpoints, Vite middleware, API routes)
├── server/
│   ├── leaderboard.ts         # Leaderboard CRUD — reads/writes leaderboard.json
│   ├── multiplayer.ts         # WebSocket PvP matchmaking + bot fallback + combat engine
│   └── embed.ts               # Server-side SVG & animated GIF card generators
├── src/
│   ├── worker.ts              # Cloudflare Worker entry (fetch handler, API routing)
│   ├── embed.ts               # Worker-side SVG & GIF card generators
│   ├── App.tsx                # Screen routing, WebSocket client, global state
│   ├── main.tsx               # React entry point (mounts App)
│   ├── components/            # React screen components (see below)
│   ├── utils/
│   │   ├── procGen.ts         # Procedural pixel-art sprite generator + 7 palettes
│   │   ├── audio.ts           # Web Audio API chiptune engine
│   │   ├── cardRenderer.ts    # Canvas card renderer (MonDetailsView-style) + PNG/SVG export
│   │   └── logger.ts          # Structured logging utility
│   ├── types.ts               # Frontend TypeScript types
│   └── index.css              # Tailwind v4 + custom CSS keyframes + shell styles
├── shared/
│   ├── sprites.ts             # Server-sprite grid builder, SVG rects, 7 color palettes
│   ├── pixelFont.ts           # 5×7 bitmap pixel font for GIF text rendering
│   └── types.ts               # Types shared between server.ts and worker.ts
├── e2e/                       # Playwright visual regression tests
├── scripts/                   # Build tooling (wrangler patching, shell HTML inlining)
├── .github/workflows/ci.yml   # CI: typecheck, unit tests with coverage, build verification
├── vitest.config.ts           # Standalone Vitest config (jsdom, React, coverage)
├── playwright.config.ts       # Playwright E2E config (chromium, local dev server)
└── wrangler.toml              # Cloudflare Workers configuration
```

### Screen Components

| File | Screen | Description |
|------|--------|-------------|
| `ConsoleShell.tsx` | Shell | GBA SP clamshell chassis — D-pad, A/B buttons, boot animation, zoom |
| `BackgroundMap.tsx` | Background | Full-screen canvas with roaming monsters, particles, click interactions |
| `SplashView.tsx` | Splash | Landing screen with animated demo card + username input |
| `SummoningView.tsx` | Summoning | Loading screen with terminal logs + progress bar |
| `HubView.tsx` | Hub | Main menu (8 options) with cursor navigation |
| `MonDetailsView.tsx` | Stats | Sprite viewer with palette cycling, 3-tab info panel |
| `BattleArenaView.tsx` | Battle | Single-player turn-based combat vs bug monsters |
| `AiBossBattleView.tsx` | Boss | AI boss "CYBER-DRAKE-Y2K" with live Groq commentary |
| `PvpLobbyView.tsx` | PvP Lobby | Matchmaking lobby with player list |
| `PvpBattleView.tsx` | PvP Battle | WebSocket real-time player-vs-player combat |
| `LeaderboardView.tsx` | Leaderboard | Scrollable top-50 rankings |
| `HistoryView.tsx` | History | Previously summoned monsters registry |
| `ExportEmbedView.tsx` | Export | 14 export formats + live card preview with palette cycling |

---

## Development Workflow

### Running Locally

```bash
npm run dev          # Start Express + Vite dev server on port 3000
```

The dev server uses `tsx` for live TypeScript reloading. Frontend changes hot-reload via Vite's HMR.

### Type-checking

```bash
npm run lint         # Full TypeScript type-check (tsc --noEmit)
```

Run this before pushing — the CI will fail on type errors.

### Building

```bash
npm run build        # Vite frontend build + Cloudflare Worker bundle
npm start            # Run the production build locally
```

The build process:
1. `vite build` — bundles the React frontend into `dist/`
2. `inline-shell.cjs` — inlines the built `index.html` into `src/shellHtml.ts` as a string (for the Worker's SPA fallback)
3. `patch-wrangler-config.cjs` — patches `wrangler.toml` for deployment

### Preview Production Build

```bash
npm run preview      # Build and preview with wrangler
```

To develop the Cloudflare Worker locally (without the Express dev server):

```bash
npm run worker:dev   # Run worker in local wrangler dev mode
```

### Branching & Commits

- Branch from `main` for all changes
- Use descriptive commit messages (no strict convention enforced)
- Keep PRs focused — one feature or fix per PR
- The CI runs on every push and PR

---

## Testing

Gittymon uses **Vitest** for unit tests and **Playwright** for visual regression E2E tests.

### Unit Tests (Vitest)

Tests live alongside source files as `*.test.ts` / `*.test.tsx`:

```
src/
├── App.test.tsx
├── utils/
│   ├── audio.test.ts
│   └── cardRenderer.test.ts
└── components/
    ├── StartSelectButtons.test.tsx
    ├── ABButtons.test.tsx
    └── ScreenFrame.test.tsx
```

**Running tests:**

```bash
npm test                    # Run all unit tests once
npm run test:watch          # Watch mode — re-runs on file changes
npm run test:coverage       # Run with coverage report (text + lcov)
```

**Configuration:**
- **Environment:** `jsdom` (browser-like DOM for React components)
- **Globals:** `true` (no need to import `describe`/`it`/`expect`)
- **Setup file:** `src/test-setup.ts` (loading library matchers, polyfills)
- **Coverage:** v8 provider, `lcov` for Codecov upload, `text` for terminal output

**Writing tests:**
- Test React components with `@testing-library/react` — prefer user-centric queries (`getByText`, `getByRole`) over implementation details
- Mock external modules at the top of test files with `vi.mock()`
- Canvas tests: check rendered pixels via `ctx.getImageData()` to verify sprite output
- Audio tests: mock `AudioContext` / `OscillatorNode` since jsdom has no Web Audio API

### E2E Tests (Playwright)

Located in `e2e/`:

```bash
npx playwright install chromium   # First time: install browser
npm run test:e2e                   # Run all E2E tests
npm run test:e2e:update            # Update visual baseline screenshots
```

**Configuration:**
- **Browser:** Chromium (Desktop Chrome)
- **Base URL:** `http://localhost:3000`
- **Web server:** Auto-starts `npm run dev` before tests, reuses if already running locally

**Visual regression:**
- Screenshots are compared against baselines in `e2e/*-snapshots/`
- Diff threshold: 0.2 max pixel ratio, 100 max differing pixels
- Run `npm run test:e2e:update` to regenerate baselines after intentional UI changes

### Coverage Reports

Coverage is collected during CI and uploaded to [Codecov](https://codecov.io/gh/kevinjobin1/Gittymon). Locally:

```bash
npm run test:coverage
open coverage/lcov-report/index.html   # View HTML report
```

---

## Code Conventions

### TypeScript

- **Strict mode is off** — but type-checking is enforced in CI via `tsc --noEmit`
- Use explicit return types on exported functions
- Avoid `any` casts — prefer `unknown` or proper types
- Prefer `interface` for object shapes, `type` for unions/aliases
- `shared/types.ts` defines types used by both Express and Worker runtimes

### React Components

- All screens are **lazy-loaded** via `React.lazy()`
- Components use **functional style** with hooks — no class components
- State management uses React `useState` / `useRef` (no external state library)
- Screen transitions animate via CSS `@keyframes` + Tailwind utility classes
- Canvas rendering uses `useEffect` with cleanup (cancel animation frames, remove event listeners)

### Canvas & Sprites

- **Client-side sprites** use `drawProceduralMon()` from `utils/procGen.ts` — renders to an HTML canvas with the full 7-palette set
- **Server-side sprites** use `buildServerSpriteGrid()` from `shared/sprites.ts` — returns a 24×24 grid for SVG rect generation
- **Card rendering** uses `drawCardFrame()` from `utils/cardRenderer.ts` — renders the full MonDetailsView-style card at 460×220
- Always set `imageRendering: 'pixelated'` on canvas CSS for crisp pixel art

### Styling

- **Tailwind CSS v4** for all styling — avoid inline styles unless dynamically computed
- CSS animations use `@keyframes` defined in `index.css`
- Console shell uses extensive CSS `box-shadow` chains for the GBA SP hardware illusion
- Use semantic color naming: `#7f001c` (crimson accent), `#1a1a1a` (dark), `#e2dfde` (warm gray)

### Palette System

- 7 palettes: `dmg`, `pocket`, `ember`, `frost`, `toxic`, `royal`, `neon`
- **Client:** defined in `procGen.ts` as `PALETTES` record; `PALETTE_NAMES` array for cycling
- **Server:** defined in `shared/sprites.ts` as `SERVER_PALETTES`; must match client names exactly
- When adding a palette: add to both `PALETTES` and `SERVER_PALETTES` with identical names and colors

---

## CI Pipeline

Configured in `.github/workflows/ci.yml`, runs on every push and PR:

| Job | Steps |
|-----|-------|
| **check** (typecheck & lint) | `npm ci` → `tsc --noEmit` → `vite build` |
| **test** (unit tests) | `npm ci` → `vitest run --coverage` → upload `lcov.info` to Codecov |

Both jobs run on **Ubuntu latest** with **Node.js 22**, timeout at 10 minutes.

### CI Requirements

- All type errors **must** be fixed — the `check` job fails on any `tsc` error
- Unit tests **must** pass — the `test` job fails on any failing test
- The build **must** succeed — caught by the `check` job running `vite build`
- Coverage is reported but **does not block** merges (thresholds are at 0%)

---

## Deployment

### Production (Cloudflare Workers)

```bash
npm run deploy
```

This builds and deploys to the production Cloudflare Worker at `gittymon.kevin-jobin-1.workers.dev`.

**Secrets** — set via `wrangler`:
```bash
npx wrangler secret put GROQ_API_KEY
```

### Staging

```bash
npm run deploy:staging
```

Deploys to `gittymon-staging.*.workers.dev` with staging KV namespaces and Durable Objects.

### Manual (Express on a VPS)

```bash
npm run build
GROQ_API_KEY="gsk_..." node dist/server.cjs
```

Note: the `server.cjs` bundle produced by `npm run build` contains the bundled Express server — it does **not** include Cloudflare Worker code.

---

## Troubleshooting

### `npm run dev` fails with "Cannot find module tsx"

```bash
npm install        # Ensure all dev dependencies are installed
```

### Groq API returns errors or timeouts

- Verify `GROQ_API_KEY` is set in `.env`
- Check your quota at [console.groq.com](https://console.groq.com)
- The app falls back to mock monsters — all UI still works

### Tests fail with "ReferenceError: canvas is not defined"

jsdom doesn't include `<canvas>`. If you're testing canvas code, you may need `canvas` package or mock the canvas API:
```ts
vi.mock('canvas', () => ({
  createCanvas: () => ({ getContext: () => ({}) }),
}));
```

### E2E visual diffs are large

Regenerate baselines after intentional UI changes:
```bash
npm run test:e2e:update
```

### TypeScript errors in shared/ when running server.ts

Verify `shared/` is included in your `tsconfig.json`:
```json
{ "include": ["src/**/*.ts", "src/**/*.tsx", "shared/**/*.ts"] }
```

The `server.ts` file itself resolves `shared/` imports via `tsx`'s native ESM resolution — no path aliases needed for the dev server.

### wrangler dev fails with KV/Durable Object errors

`wrangler dev` requires Cloudflare authentication. Run:
```bash
npx wrangler login
```

For local development without Cloudflare, use `npm run dev` instead.
