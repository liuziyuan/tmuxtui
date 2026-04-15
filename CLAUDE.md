# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev                          # run TUI (no build needed)
npm run dev -- init                  # pass init subcommand through npm
npm run dev -- --help                # pass --help through npm

# Build
npm run build                        # esbuild -> dist/tmuxtui.js

# Test the built output
npm run dev:build                    # build + run the compiled CLI
npm run dev:pack                     # build + npm pack + extract (pre-publish check)
```

There are no tests or linter configured.

## Architecture

**tmuxtui** is an Ink (React-for-terminals) TUI that manages tmux sessions. It wraps tmux CLI commands and renders an interactive session picker.

### Entry and CLI dispatch

`src/index.tsx` handles all CLI subcommands before entering TUI mode:

- `init` / `-i` — create a detached tmux session named `basename(cwd)` and exit
- `last` / `-l` — attach to the most recently used session (no TUI)
- `update` — fetch latest version from npm and `npm install -g`
- `version` / `-v` — print `__APP_VERSION__` (injected by esbuild at build time, `'dev'` when running via tsx)
- `help` / `-h` — print usage text
- `--favorites` / `-F` — flag passed into TUI to filter to starred sessions only
- No args → render the interactive TUI, then `tmux attach-session` (outside tmux) or `tmux switch-client` (inside tmux)

`bin/tmuxtui.ts` is a shebang entry that re-exports `src/index.tsx`.

### Build

`build.mjs` uses esbuild to bundle everything into a single ESM file at `dist/tmuxtui.js`. It injects `__APP_VERSION__` from `package.json` and strips `react-devtools-core` via a plugin. The `declare const __APP_VERSION__` at the top of `src/index.tsx` provides the TypeScript type.

### Component structure

`src/components/App.tsx` is a single `SessionView` component holding all UI state:

- **Mode union**: `'list' | 'new' | 'rename' | 'confirm-kill' | 'config' | 'search' | 'detail' | 'confirm-batch-kill' | 'help'`
- **Config sub-modes**: `'list' | 'new' | 'rename' | 'confirm-delete' | 'init-panes' | 'move'` (window management within a session)
- Keyboard input is gated on `process.stdin.isTTY` (passed as `interactive` prop)
- All rendering is done inline in the component — no separate sub-components

### Services

- **`src/services/tmuxService.ts`** — `execSync` wrappers for tmux commands (session, window, pane CRUD). All names/paths are single-quote-escaped before shell interpolation. Contains `PANE_LAYOUTS` (9 preset layouts with preview ASCII art and split instructions) and `initPanes()` which executes sequential `split-window` commands. Also exports `formatTime()` for epoch-to-readable conversion.
- **`src/services/favoritesService.ts`** — persists a `Set<string>` of favorited session names to `~/.config/tmuxtui/favorites.json`.

### Types

`src/types.ts` defines `TmuxSession`, `TmuxWindow`, and `TmuxPane` interfaces matching tmux's `list-sessions`, `list-windows`, and `list-panes` output formats.

### Key behaviors

- Sessions sorted by `lastAttached` (most recent first), with attached sessions pinned to top
- `~` in path input expanded via `String.replace(/^~/, HOME)` at creation time
- Fuzzy search (`/` key) uses a simple subsequence matcher, not regex
- Batch operations: `Tab` to mark sessions, `X` batch-detach, `D` batch-kill
- ESM (`"type": "module"`); imports use `.js` extensions even for `.tsx` source files (TypeScript bundler resolution)
