import { execSync } from 'child_process';
import type { TmuxSession } from '../types.js';

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

export function formatTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()} ${h}:${m}`;
}
