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

## Before creating a PR

`.github/workflows/publish.yml` only publishes to npm on push to `main` if `package.json`'s
`version` differs from the version currently on npm (`npm view tmux-tui version`). If a PR
contains a `feat`/`fix` meant to ship, bump `version` in `package.json` (and run
`npm install --package-lock-only` to sync `package-lock.json`) before merging — otherwise the
publish job silently skips and the change never reaches npm users. Use semver: `fix` → patch,
`feat` → minor.

`.github/workflows/ci.yml` also runs `npm audit --audit-level=high` on every PR — check it
passes locally (`npm audit --audit-level=high`) before pushing; `npm audit fix` resolves most
transitive-dependency findings without a manual `package.json` edit.

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
- **Config sub-modes**: `'list' | 'new' | 'rename' | 'confirm-delete' | 'init-panes' | 'move'` (window management within a session — unrelated to `configService`'s global config despite the shared name)
- Keyboard input is gated on `process.stdin.isTTY` (passed as `interactive` prop)
- All rendering is done inline in the component — no separate sub-components
- **List pagination**: the session list is a scrolling viewport, not a full render. `pageSize` is derived from `useStdout().stdout.rows` (falls back to 24 rows when not a TTY); a `viewStart` state + `useEffect` keeps the cursor in view (sticky-edge scrolling) and renders `▲/▼ N more` hints when the list overflows the terminal.

### Services

- **`src/services/tmuxService.ts`** — `execSync` wrappers for tmux commands (session, window, pane CRUD). All names/paths are single-quote-escaped before shell interpolation. Contains `PANE_LAYOUTS` (9 preset layouts with preview ASCII art and split instructions) and `initPanes()` which executes sequential `split-window` commands. Also exports `formatTime()` for epoch-to-readable conversion.
  - `warmUpTmuxServer(pluginsDir)` — called once at CLI startup (`index.tsx`) when the tmux server isn't running. `tmux start-server` alone exits immediately (`exit-empty`) without sourcing `.tmux.conf`, so it instead starts a throwaway placeholder session (which does source the config), runs tmux-resurrect's `restore.sh` via `tmux run-shell`, then kills the placeholder — leaving only the restored sessions.
  - `saveTmuxSessions(pluginsDir)` — runs tmux-resurrect's `save.sh`; called after `createSession` so new sessions survive a restart.
  - `getPluginStatus(pluginsDir)` — `existsSync` check for `tmux-resurrect` / `tmux-continuum` / `tpm` subdirectories, surfaced in the `h` help screen's Plugins block.
  - All three take `pluginsDir` from `ResolvedConfig.pluginsDir` (see configService below) rather than a hardcoded path.
- **`src/services/favoritesService.ts`** — persists a `Set<string>` of favorited session names to `~/.config/tmuxtui/favorites.json`.
- **`src/services/configService.ts`** — loads/validates/merges `~/.config/tmuxtui/config.json` into a `ResolvedConfig` (sort mode, keybindings, ui options, `pluginsDir`). `matchesKey()` maps configurable keybinding strings to Ink's `Key` object. Only the top-level `list` mode's keyboard dispatch in `App.tsx` reads from `cfg.keybindings`; sub-modes (search, detail, config/window-management, etc.) use hardcoded keys.

### Types

`src/types.ts` defines `TmuxSession`, `TmuxWindow`, and `TmuxPane` interfaces matching tmux's `list-sessions`, `list-windows`, and `list-panes` output formats.

### Key behaviors

- Sessions sorted by `lastAttached` (most recent first), with attached sessions pinned to top
- `~` in path input expanded via `String.replace(/^~/, HOME)` at creation time
- Fuzzy search (`/` key) uses a simple subsequence matcher, not regex
- Batch operations: `Tab` to mark sessions, `X` batch-detach, `D` batch-kill
- ESM (`"type": "module"`); imports use `.js` extensions even for `.tsx` source files (TypeScript bundler resolution)
