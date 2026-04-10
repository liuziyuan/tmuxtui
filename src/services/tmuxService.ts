import { execSync } from 'child_process';
import type { TmuxSession, TmuxWindow } from '../types.js';

export function listSessions(): TmuxSession[] {
  const format = '#{session_name}\t#{session_windows}\t#{session_created}\t#{session_attached}\t#{session_id}\t#{session_path}\t#{session_last_attached}';

  try {
    const output = execSync(`tmux list-sessions -F '${format}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!output) return [];

    const sessions = output.split('\n').map((line) => {
      const [name, windows, created, attached, sessionId, path, lastAttached] = line.split('\t');
      return {
        name,
        windows: parseInt(windows, 10),
        created: parseInt(created, 10),
        attached: attached === '1',
        sessionId,
        path: path || '',
        lastAttached: parseInt(lastAttached, 10),
      };
    });

    return sessions.sort((a, b) => b.lastAttached - a.lastAttached);
  } catch {
    return [];
  }
}

export function createSession(name: string, path: string): void {
  const safeName = name.replace(/'/g, "'\\''");
  const safePath = path.replace(/'/g, "'\\''");
  const cmd = path
    ? `tmux new-session -d -s '${safeName}' -c '${safePath}'`
    : `tmux new-session -d -s '${safeName}'`;
  execSync(cmd, { stdio: 'pipe' });
}

export function killSession(name: string): void {
  const safeName = name.replace(/'/g, "'\\''");
  execSync(`tmux kill-session -t '${safeName}'`, { stdio: 'pipe' });
}

export function renameSession(oldName: string, newName: string): void {
  const safeOld = oldName.replace(/'/g, "'\\''");
  const safeNew = newName.replace(/'/g, "'\\''");
  execSync(`tmux rename-session -t '${safeOld}' '${safeNew}'`, { stdio: 'pipe' });
}

export function detachSession(name: string): void {
  const safeName = name.replace(/'/g, "'\\''");
  execSync(`tmux detach-client -s '${safeName}'`, { stdio: 'pipe' });
}

export function listWindows(sessionName: string): TmuxWindow[] {
  const format = '#{window_name}\t#{window_index}\t#{window_panes}\t#{window_active}';
  const safeName = sessionName.replace(/'/g, "'\\''");
  try {
    const output = execSync(`tmux list-windows -t '${safeName}' -F '${format}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!output) return [];
    return output.split('\n').map((line) => {
      const [name, index, panes, active] = line.split('\t');
      return {
        name,
        index: parseInt(index, 10),
        panes: parseInt(panes, 10),
        active: active === '1',
      };
    });
  } catch {
    return [];
  }
}

export function newWindow(sessionName: string, windowName: string, path?: string): void {
  const safeSession = sessionName.replace(/'/g, "'\\''");
  const safeWindow = windowName.replace(/'/g, "'\\''");
  const safePath = path ? path.replace(/'/g, "'\\''") : '';
  const cmd = safePath
    ? `tmux new-window -d -t '${safeSession}' -n '${safeWindow}' -c '${safePath}'`
    : `tmux new-window -d -t '${safeSession}' -n '${safeWindow}'`;
  execSync(cmd, { stdio: 'pipe' });
}

export function renameWindow(sessionName: string, windowIndex: number, newName: string): void {
  const safeSession = sessionName.replace(/'/g, "'\\''");
  const safeNew = newName.replace(/'/g, "'\\''");
  execSync(`tmux rename-window -t '${safeSession}':${windowIndex} '${safeNew}'`, { stdio: 'pipe' });
}

export function killWindow(sessionName: string, windowIndex: number): void {
  const safeSession = sessionName.replace(/'/g, "'\\''");
  execSync(`tmux kill-window -t '${safeSession}':${windowIndex}`, { stdio: 'pipe' });
}

interface SplitStep {
  pane: number;
  horizontal: boolean;
  percentage: number;
}

export interface PaneLayout {
  id: number;
  name: string;
  panes: number;
  preview: string[];
  splits: SplitStep[];
}

export const PANE_LAYOUTS: PaneLayout[] = [
  {
    id: 1, name: 'Single', panes: 1,
    preview: ['┌────────┐', '│   1    │', '└────────┘'],
    splits: [],
  },
  {
    id: 2, name: 'H-Split', panes: 2,
    preview: ['┌───┬───┐', '│ 1 │ 2 │', '└───┴───┘'],
    splits: [{ pane: 0, horizontal: true, percentage: 50 }],
  },
  {
    id: 3, name: 'V-Split', panes: 2,
    preview: ['┌───────┐', '│   1   │', '├───────┤', '│   2   │', '└───────┘'],
    splits: [{ pane: 0, horizontal: false, percentage: 50 }],
  },
  {
    id: 4, name: 'IDE', panes: 2,
    preview: ['┌──┬────┐', '│1 │ 2  │', '└──┴────┘'],
    splits: [{ pane: 0, horizontal: true, percentage: 75 }],
  },
  {
    id: 5, name: 'IDE+Term', panes: 3,
    preview: ['┌──┬────┐', '│  │ 2  │', '│1 ├────┤', '│  │ 3  │', '└──┴────┘'],
    splits: [
      { pane: 0, horizontal: true, percentage: 75 },
      { pane: 1, horizontal: false, percentage: 50 },
    ],
  },
  {
    id: 6, name: 'Triple', panes: 3,
    preview: ['┌──┬──┬──┐', '│1 │2 │3 │', '└──┴──┴──┘'],
    splits: [
      { pane: 0, horizontal: true, percentage: 66 },
      { pane: 1, horizontal: true, percentage: 50 },
    ],
  },
  {
    id: 7, name: 'IDE+Side', panes: 3,
    preview: ['┌─┬──┬─┐', '│1│2 │3│', '└─┴──┴─┘'],
    splits: [
      { pane: 0, horizontal: true, percentage: 80 },
      { pane: 1, horizontal: true, percentage: 25 },
    ],
  },
  {
    id: 8, name: 'Quad', panes: 4,
    preview: ['┌──┬──┐', '│1 │2 │', '├──┼──┤', '│3 │4 │', '└──┴──┘'],
    splits: [
      { pane: 0, horizontal: true, percentage: 50 },
      { pane: 0, horizontal: false, percentage: 50 },
      { pane: 1, horizontal: false, percentage: 50 },
    ],
  },
  {
    id: 9, name: 'IDE Pro', panes: 4,
    preview: ['┌──┬─────┐', '│  │  2  │', '│1 ├──┬──┤', '│  │ 3│4 │', '└──┴──┴──┘'],
    splits: [
      { pane: 0, horizontal: true, percentage: 75 },
      { pane: 1, horizontal: false, percentage: 40 },
      { pane: 2, horizontal: true, percentage: 50 },
    ],
  },
];

export function initPanes(sessionName: string, windowIndex: number, layoutId: number): void {
  const layout = PANE_LAYOUTS.find((l) => l.id === layoutId);
  if (!layout || layout.splits.length === 0) return;

  const safeSession = sessionName.replace(/'/g, "'\\''");
  const base = `'${safeSession}':${windowIndex}`;

  let paneBase = 0;
  try {
    const out = execSync('tmux show-option -g pane-base-index', { encoding: 'utf-8' }).trim();
    paneBase = parseInt(out.split(' ').pop() || '0', 10);
  } catch { /* default 0 */ }

  for (const step of layout.splits) {
    const dir = step.horizontal ? '-h' : '-v';
    const target = `${base}.${paneBase + step.pane}`;
    execSync(`tmux split-window -t ${target} ${dir} -p ${step.percentage}`, { stdio: 'pipe' });
  }
}

export function formatTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()} ${h}:${m}`;
}
