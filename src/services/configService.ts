import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { TmuxSession } from '../types.js';

const CONFIG_DIR = join(homedir(), '.config', 'tmuxtui');
const FILE = join(CONFIG_DIR, 'config.json');

type SortMode = 'lastAttached' | 'name' | 'created';
type KeyAction =
  | 'select-up' | 'select-down'
  | 'attach' | 'new' | 'rename' | 'kill'
  | 'detach' | 'search' | 'favorite'
  | 'favorites-filter' | 'refresh' | 'help' | 'quit'
  | 'batch-mark';

export interface UserConfig {
  defaultSort?: SortMode;
  confirmBeforeKill?: boolean;
  autoAttachOnCreate?: boolean;
  refreshInterval?: number;
  keybindings?: Partial<Record<KeyAction, string>>;
  ui?: {
    showPath?: boolean;
    showSessionId?: boolean;
    sessionNameWidth?: number;
  };
}

const DEFAULT_KEYBINDINGS: Record<KeyAction, string> = {
  'select-up': 'up',
  'select-down': 'down',
  'attach': 'return',
  'new': 'n',
  'rename': 'r',
  'kill': 'd',
  'detach': 'x',
  'search': '/',
  'favorite': 's',
  'favorites-filter': 'f',
  'refresh': 'R',
  'help': 'h',
  'quit': 'q',
  'batch-mark': 'tab',
};

export type ResolvedConfig = {
  defaultSort: SortMode;
  confirmBeforeKill: boolean;
  autoAttachOnCreate: boolean;
  refreshInterval: number;
  keybindings: Record<KeyAction, string>;
  ui: {
    showPath: boolean;
    showSessionId: boolean;
    sessionNameWidth: number;
  };
};

const DEFAULT_CONFIG: ResolvedConfig = {
  defaultSort: 'lastAttached',
  confirmBeforeKill: true,
  autoAttachOnCreate: false,
  refreshInterval: 0,
  keybindings: DEFAULT_KEYBINDINGS,
  ui: {
    showPath: true,
    showSessionId: false,
    sessionNameWidth: 20,
  },
};

const VALID_SORTS = new Set<string>(['lastAttached', 'name', 'created']);

function validateConfig(raw: unknown): Partial<UserConfig> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: Partial<UserConfig> = {};

  if (VALID_SORTS.has(obj.defaultSort as string)) {
    result.defaultSort = obj.defaultSort as SortMode;
  }
  if (typeof obj.confirmBeforeKill === 'boolean') {
    result.confirmBeforeKill = obj.confirmBeforeKill;
  }
  if (typeof obj.autoAttachOnCreate === 'boolean') {
    result.autoAttachOnCreate = obj.autoAttachOnCreate;
  }
  if (typeof obj.refreshInterval === 'number' && obj.refreshInterval >= 0) {
    result.refreshInterval = Math.min(obj.refreshInterval, 300);
  }

  if (typeof obj.keybindings === 'object' && obj.keybindings !== null && !Array.isArray(obj.keybindings)) {
    const kb: Partial<Record<KeyAction, string>> = {};
    for (const [k, v] of Object.entries(obj.keybindings)) {
      if (typeof v === 'string') {
        kb[k as KeyAction] = v;
      }
    }
    result.keybindings = kb;
  }

  if (typeof obj.ui === 'object' && obj.ui !== null && !Array.isArray(obj.ui)) {
    const uiObj = obj.ui as Record<string, unknown>;
    const ui: UserConfig['ui'] = {};
    if (typeof uiObj.showPath === 'boolean') ui.showPath = uiObj.showPath;
    if (typeof uiObj.showSessionId === 'boolean') ui.showSessionId = uiObj.showSessionId;
    if (typeof uiObj.sessionNameWidth === 'number') {
      ui.sessionNameWidth = Math.max(10, Math.min(60, Math.round(uiObj.sessionNameWidth)));
    }
    result.ui = ui;
  }

  return result;
}

function mergeConfig(partial: Partial<UserConfig>): ResolvedConfig {
  return {
    defaultSort: partial.defaultSort ?? DEFAULT_CONFIG.defaultSort,
    confirmBeforeKill: partial.confirmBeforeKill ?? DEFAULT_CONFIG.confirmBeforeKill,
    autoAttachOnCreate: partial.autoAttachOnCreate ?? DEFAULT_CONFIG.autoAttachOnCreate,
    refreshInterval: partial.refreshInterval ?? DEFAULT_CONFIG.refreshInterval,
    keybindings: { ...DEFAULT_KEYBINDINGS, ...(partial.keybindings ?? {}) },
    ui: { ...DEFAULT_CONFIG.ui, ...(partial.ui ?? {}) },
  };
}

export function loadConfig(): ResolvedConfig {
  try {
    const raw = JSON.parse(readFileSync(FILE, 'utf-8'));
    const partial = validateConfig(raw);
    return mergeConfig(partial);
  } catch {
    return { ...DEFAULT_CONFIG, keybindings: { ...DEFAULT_KEYBINDINGS }, ui: { ...DEFAULT_CONFIG.ui } };
  }
}

export function saveConfig(config: ResolvedConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(config, null, 2));
}

const SPECIAL_KEYS: Record<string, string> = {
  up: 'upArrow',
  down: 'downArrow',
  return: 'return',
  escape: 'escape',
  tab: 'tab',
  backspace: 'backspace',
  delete: 'delete',
};

export function matchesKey(binding: string, input: string, key: Record<string, boolean>): boolean {
  const inkProp = SPECIAL_KEYS[binding];
  if (inkProp) return !!key[inkProp];
  return input === binding;
}

export function sortSessions(sessions: TmuxSession[], sortBy: SortMode): TmuxSession[] {
  return [...sessions].sort((a, b) => {
    if (a.attached !== b.attached) return a.attached ? -1 : 1;
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'created': return b.created - a.created;
      default: return b.lastAttached - a.lastAttached;
    }
  });
}
