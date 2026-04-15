# tmuxtui

[中文文档](README_zh.md)

Interactive terminal UI for managing tmux sessions. Browse, create, rename, detach, and kill sessions without memorizing tmux commands.

## Features

- **Session browser** — list all tmux sessions sorted by last used, with window count, working directory, and creation time
- **Quick attach** — select and attach to any session instantly; auto sets terminal tab title to `[tmux] session_name`
- **Create sessions** — new session with custom name and working directory
- **Window manager** — press `c` to enter config mode: create, rename, delete windows, and initialize pane layouts
- **Pane layout presets** — 9 built-in layouts (IDE, Quad, Triple, etc.) with live preview
- **Rename / Detach / Kill** — full session lifecycle management
- **Works everywhere** — runs inside or outside tmux (auto-detects and uses `switch-client` or `attach-session`)
- **`init` command** — register the current directory as a new tmux session in one step

## Requirements

- Node.js >= 18
- tmux >= 3.2

## Install

```bash
npm install -g tmux-tui
```

## Usage

### Interactive TUI

```bash
tmuxtui
```

Keyboard shortcuts:

| Key | Action |
|-----|--------|
| `↑` `↓` | Select session |
| `Enter` | Attach to session |
| `n` | New session |
| `r` | Rename session |
| `x` | Detach session |
| `d` | Kill session (with confirm) |
| `c` | Config — window management |
| `q` | Quit |

When creating a new session, press `Tab` to switch between the name and path fields.

### Config mode (window management)

Press `c` on any session to enter config mode. This lets you manage windows within the selected session.

| Key | Action |
|-----|--------|
| `↑` `↓` | Select window |
| `n` | New window |
| `r` | Rename window |
| `d` | Delete window (with confirm) |
| `i` | Init pane layout (only for single-pane inactive windows) |
| `Esc` | Back to session list |

#### Pane layout presets

When you press `i`, you can choose from 9 built-in pane layouts:

| Layout | Panes | Description |
|--------|-------|-------------|
| 1. Single | 1 | No splits |
| 2. H-Split | 2 | Horizontal 50/50 |
| 3. V-Split | 2 | Vertical 50/50 |
| 4. IDE | 2 | Left sidebar (25%) + main |
| 5. IDE+Term | 3 | IDE + bottom terminal |
| 6. Triple | 3 | Three equal columns |
| 7. IDE+Side | 3 | IDE with right sidebar |
| 8. Quad | 4 | 2x2 grid |
| 9. IDE Pro | 4 | IDE + split right panel |

### Commands

#### Init — register current project

```bash
tmuxtui init
# or
tmuxtui -i
```

Creates a new tmux session named after the current directory and opens it with tmuxtui.

#### Update — self-update

```bash
tmuxtui update
```

Checks for the latest version on npm registry and automatically updates tmuxtui if a newer version is available. Shows the current version, and confirms the updated version after completion.

#### Version — show version

```bash
tmuxtui --version
# or
tmuxtui -v
```

Displays the installed version of tmuxtui.

#### Last — attach to most recent session

```bash
tmuxtui last
# or
tmuxtui -l
```

Quickly attach to the most recently used tmux session without opening the session picker.

#### Favorites only

```bash
tmuxtui --favorites
# or
tmuxtui -F
```

Open tmuxtui showing only favorited sessions.

## Development

### Prerequisites

- Node.js >= 18
- tmux >= 3.2

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/tmuxtui.git
cd tmuxtui

# Install dependencies
npm install
```

### Development Commands

```bash
# Run in development mode (with subcommands)
npm run dev -- init
npm run dev -- --help

# Run with arguments (alternative)
npm run dev:args init

# Build and test the compiled output
npm run dev:build -- init

# Test the packaged distribution (before publish)
npm run dev:pack
```

### Build and Publish

```bash
# Build the project
npm run build

# Dry-run publish (creates .tgz for testing)
npm pack

# Publish to npm
npm publish
```

## License

MIT
