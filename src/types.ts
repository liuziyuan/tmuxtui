export interface TmuxSession {
  name: string;
  windows: number;
  created: number;
  attached: boolean;
  sessionId: string;
  path: string;
  lastAttached: number;
}
