import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { basename } from 'path';
import App from './components/App.js';
import { createSession, killSession, renameSession, detachSession } from './services/tmuxService.js';
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

// ── TUI mode ──
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
