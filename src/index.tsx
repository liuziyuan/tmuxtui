declare const __APP_VERSION__: string | undefined;

import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { basename } from 'path';
import App from './components/App.js';
import { createSession, killSession, renameSession, detachSession, listSessions } from './services/tmuxService.js';
import { loadConfig, sortSessions } from './services/configService.js';
import type { TmuxSession } from './types.js';

function attachToSession(name: string) {
  process.stdout.write(`\x1b]0;[tmux] ${name}\x07`);
  const escaped = `'${name.replace(/'/g, "'\\''")}'`;
  const cmd = process.env.TMUX
    ? `tmux switch-client -t ${escaped}`
    : `tmux attach-session -t ${escaped}`;
  execSync(cmd, { stdio: 'inherit' });
}

// ── Commands ──
const args = process.argv.slice(2);

function showHelp() {
  console.log(`
tmuxtui - Terminal UI for tmux session management

USAGE:
  tmuxtui [OPTIONS]

OPTIONS:
  -h, --help          Show this help message
  -v, --version       Show version information
  update              Self-update to the latest version
  init, -i            Register current directory as a new tmux session
  .                   Attach to current directory's session (or hint to init)
  last, -l            Attach to the most recent session
  -F, --favorites     Show only favorited sessions (TUI mode)

EXAMPLES:
  tmuxtui                     Launch the TUI session picker
  tmuxtui -v                  Show version
  tmuxtui update              Update to latest version
  tmuxtui init                Create session from current directory
  tmuxtui .                   Open current directory's tmux session
  tmuxtui --favorites         Show only favorited sessions
`);
}

if (args[0] === 'help' || args[0] === '-h' || args[0] === '--help') {
  showHelp();
  process.exit(0);
}

if (args[0] === 'version' || args[0] === '-v' || args[0] === '--version') {
  const ver = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  console.log(ver);
  process.exit(0);
}

if (args[0] === 'init' || args[0] === '-i') {
  const sessionName = basename(process.cwd());
  const sessionPath = process.cwd();

  try {
    createSession(sessionName, sessionPath);
    console.log(`${sessionName} project has been added to tmuxtui`);
  } catch {
    console.error(`Failed to create session. A session with the same name may already exist.`);
    process.exit(1);
  }
  process.exit(0);
}

if (args[0] === '.') {
  const sessionName = basename(process.cwd());
  const sessions = listSessions();
  const found = sessions.find(s => s.name === sessionName);
  if (found) {
    try {
      attachToSession(sessionName);
    } catch {
      process.exit(1);
    }
  } else {
    console.error(`Session "${sessionName}" not found. Run \`tmuxtui init\` to create it first.`);
    process.exit(1);
  }
  process.exit(0);
}

if (args[0] === 'last' || args[0] === '-l') {
  const cfg = loadConfig();
  const sessions = sortSessions(listSessions(), cfg.defaultSort);
  if (sessions.length === 0) {
    console.error('No tmux sessions found');
    process.exit(1);
  }
  try {
    attachToSession(sessions[0].name);
  } catch {
    process.exit(1);
  }
  process.exit(0);
}

if (args[0] === 'update') {
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  console.log(`Current version: v${currentVersion}`);

  let latestVersion: string;
  try {
    latestVersion = execSync('npm view tmux-tui version', { encoding: 'utf8' }).trim();
  } catch {
    console.error('Failed to check latest version. Please check your network connection.');
    process.exit(1);
  }

  if (currentVersion === latestVersion) {
    console.log('Already up to date.');
    process.exit(0);
  }

  console.log(`Updating to v${latestVersion}...`);
  try {
    execSync('npm install -g tmux-tui@latest', { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
  console.log(`Done. Updated to v${latestVersion}`);
  process.exit(0);
}

// ── TUI mode ──
const config = loadConfig();
const favoritesOnly = args.includes('--favorites') || args.includes('-F');
const filteredArgs = args.filter((a) => a !== '--favorites' && a !== '-F');

if (filteredArgs[0] !== undefined) {
  console.error(`Unknown argument: ${filteredArgs[0]}`);
  console.error('Use "tmuxtui -h" or "tmuxtui --help" for usage information.');
  process.exit(1);
}

const state = {
  session: null as TmuxSession | null,
  newSession: null as string | null,
};

const instance = render(
  React.createElement(App, {
    onSelect: (s: TmuxSession) => { state.session = s; },
    onCreate: (name: string, path: string) => {
      createSession(name, path);
      state.newSession = name;
    },
    onKill: (name: string) => { killSession(name); },
    onRename: (oldName: string, newName: string) => { renameSession(oldName, newName); },
    onDetach: (name: string) => { detachSession(name); },
    favoritesOnly,
    config,
  }),
);

await instance.waitUntilExit();

try {
  if (state.session) {
    attachToSession(state.session.name);
  } else if (state.newSession && config.autoAttachOnCreate) {
    attachToSession(state.newSession);
  }
} catch {
  process.exit(1);
}
