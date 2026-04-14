export interface TmuxWindow {
  name: string;
  index: number;
  panes: number;
  active: boolean;
  paneList?: TmuxPane[];
}

export interface TmuxPane {
  index: number;
  title: string;
  currentCommand: string;
  currentPath: string;
  active: boolean;
}

export interface TmuxSession {
  name: string;
  windows: number;
  created: number;
  attached: boolean;
  sessionId: string;
  path: string;
  lastAttached: number;
}
