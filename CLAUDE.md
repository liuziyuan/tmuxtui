# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run in development (no build step needed)
npm run dev

# Build to dist/
npm run build

# Run the CLI directly
npx tsx bin/tmuxtui.ts
npx tsx bin/tmuxtui.ts init   # register current dir as a new tmux session
```

There are no tests or linter configured.

## Architecture

**tmuxtui** is an Ink (React-for-terminals) TUI that manages tmux sessions. It wraps tmux CLI commands and renders an interactive session picker.

### Data flow

1. `bin/tmuxtui.ts` — shebang entry; re-exports `src/index.tsx`
2. `src/index.tsx` — two modes:
   - `init` subcommand: calls `createSession()` with `cwd` name/path and exits
   - TUI mode: renders the Ink `<App>`, awaits exit, then calls `tmux attach-session` (outside tmux) or `tmux switch-client` (inside tmux) based on `process.env.TMUX`
3. `src/components/App.tsx` — single `SessionView` component; all UI state lives here:
   - `mode`: `'list' | 'new' | 'rename' | 'confirm-kill'`
   - Keyboard input is gated on `process.stdin.isTTY` (passed as `interactive` prop)
   - Session mutations call parent callbacks (onCreate/onKill/onRename/onDetach) then `exit()` or `refresh()`
4. `src/services/tmuxService.ts` — thin wrappers around `execSync` tmux commands; all session names/paths are single-quote-escaped before shell interpolation
5. `src/types.ts` — `TmuxSession` interface (name, windows, created, attached, sessionId, path, lastAttached)

### Key behaviors

- Sessions are listed sorted by `lastAttached` (most recent first)
- The `init` subcommand uses `basename(cwd)` as the session name and `cwd` as the start path
- `~` in path input is expanded via `String.replace(/^~/, HOME)` at creation time
- The app uses ESM (`"type": "module"`); imports use `.js` extensions even for `.tsx` source files (TypeScript bundler resolution)
