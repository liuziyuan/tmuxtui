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

export function newWindow(sessionName: string, windowName: string): void {
  const safeSession = sessionName.replace(/'/g, "'\\''");
  const safeWindow = windowName.replace(/'/g, "'\\''");
  execSync(`tmux new-window -d -t '${safeSession}' -n '${safeWindow}'`, { stdio: 'pipe' });
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

export function formatTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()} ${h}:${m}`;
}
