declare const __APP_VERSION__: string | undefined;

import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { basename } from 'path';
import App from './components/App.js';
import { createSession, killSession, renameSession, detachSession, listSessions } from './services/tmuxService.js';
import type { TmuxSession } from './types.js';

function attachToSession(name: string) {
  process.stdout.write(`\x1b]0;[tmux] ${name}\x07`);
  const cmd = process.env.TMUX
    ? `tmux switch-client -t ${name}`
    : `tmux attach-session -t ${name}`;
  execSync(cmd, { stdio: 'inherit' });
}

// ── tmuxtui init ──
const args = process.argv.slice(2);

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

if (args[0] === 'last' || args[0] === '-l') {
  const sessions = listSessions();
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
const favoritesOnly = args.includes('--favorites') || args.includes('-F');
const filteredArgs = args.filter((a) => a !== '--favorites' && a !== '-F');

if (filteredArgs[0] !== undefined) {
  console.error(`Unknown argument: ${filteredArgs[0]}`);
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
  }),
);

await instance.waitUntilExit();

try {
  if (state.session) {
    attachToSession(state.session.name);
  } else if (state.newSession) {
    attachToSession(state.newSession);
  }
} catch {
  process.exit(1);
}
