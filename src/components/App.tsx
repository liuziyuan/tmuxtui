import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { listSessions, listWindows, newWindow, renameWindow, killWindow, initPanes, PANE_LAYOUTS, formatTime, getSessionDetail, moveWindow } from '../services/tmuxService.js';
import { loadFavorites, toggleFavorite } from '../services/favoritesService.js';
import type { TmuxSession, TmuxWindow } from '../types.js';

type Mode = 'list' | 'new' | 'rename' | 'confirm-kill' | 'config' | 'search' | 'detail' | 'confirm-batch-kill' | 'help';
type ConfigSubMode = 'list' | 'new' | 'rename' | 'confirm-delete' | 'init-panes' | 'move';

interface SessionViewProps {
  interactive: boolean;
  onSelect?: (session: TmuxSession) => void;
  onCreate?: (name: string, path: string) => void;
  onKill?: (name: string) => void;
  onRename?: (oldName: string, newName: string) => void;
  onDetach?: (name: string) => void;
}

function SessionView({ interactive, favoritesOnly, onSelect, onCreate, onKill, onRename, onDetach }: SessionViewProps & { favoritesOnly?: boolean }) {
  const { exit } = useApp();

  function fuzzyMatch(query: string, text: string): boolean {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
  }
  const [sessions, setSessions] = useState(listSessions);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [inputValue, setinputValue] = useState('');
  const [inputValue2, setinputValue2] = useState('');
  const [focusField, setFocusField] = useState<'name' | 'path'>('name');
  const [error, setError] = useState('');

  // config mode state
  const [configSession, setConfigSession] = useState<TmuxSession | null>(null);
  const [configWindows, setConfigWindows] = useState<TmuxWindow[]>([]);
  const [configSelected, setConfigSelected] = useState(0);
  const [configSubMode, setConfigSubMode] = useState<ConfigSubMode>('list');
  const [layoutSelected, setLayoutSelected] = useState(0);

  // search state
  const [searchQuery, setSearchQuery] = useState('');

  // detail state
  const [detailSession, setDetailSession] = useState<TmuxSession | null>(null);
  const [detailWindows, setDetailWindows] = useState<TmuxWindow[]>([]);
  const [detailSelected, setDetailSelected] = useState(0);

  // move state
  const [moveTargets, setMoveTargets] = useState<TmuxSession[]>([]);
  const [moveSelected, setMoveSelected] = useState(0);

  // favorites state
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(favoritesOnly ?? false);

  // batch mark state
  const [marked, setMarked] = useState<Set<string>>(new Set());

  const refresh = () => {
    const updated = listSessions();
    setSessions(updated);
    setSelected((i) => Math.min(i, Math.max(0, updated.length - 1)));
  };

  const displayedSessions = showFavoritesOnly
    ? sessions.filter((s) => favorites.has(s.name))
    : sessions;

  const refreshConfigWindows = () => {
    if (!configSession) return;
    const wins = listWindows(configSession.name);
    setConfigWindows(wins);
    setConfigSelected((i) => Math.min(i, Math.max(0, wins.length - 1)));
  };

  if (interactive) {
    useInput((input, key) => {
      // ── new mode ──
      if (mode === 'new') {
        if (key.escape) {
          setMode('list');
          setinputValue('');
          setinputValue2('');
          setError('');
          return;
        }
        if (key.tab) {
          setFocusField((f) => (f === 'name' ? 'path' : 'name'));
          return;
        }
        if (key.return) {
          if (!inputValue.trim()) {
            setError('Session name is required');
            return;
          }
          const expandedPath = (inputValue2 || process.cwd()).replace(/^~/, process.env.HOME || '~');
          onCreate?.(inputValue.trim(), expandedPath);
          exit();
          return;
        }
        if (key.backspace || key.delete) {
          if (focusField === 'name') setinputValue((v) => v.slice(0, -1));
          else setinputValue2((v) => v.slice(0, -1));
          setError('');
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          if (focusField === 'name') setinputValue((v) => v + input);
          else setinputValue2((v) => v + input);
          setError('');
        }
        return;
      }

      // ── rename mode ──
      if (mode === 'rename') {
        if (key.escape) {
          setMode('list');
          setinputValue('');
          setError('');
          return;
        }
        if (key.return) {
          if (!inputValue.trim()) {
            setError('Name cannot be empty');
            return;
          }
          onRename?.(sessions[selected].name, inputValue.trim());
          refresh();
          setMode('list');
          setinputValue('');
          setError('');
          return;
        }
        if (key.backspace || key.delete) {
          setinputValue((v) => v.slice(0, -1));
          setError('');
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setinputValue((v) => v + input);
          setError('');
        }
        return;
      }

      // ── confirm-kill mode ──
      if (mode === 'confirm-kill') {
        if (key.escape || input === 'n') {
          setMode('list');
          return;
        }
        if (input === 'y' || key.return) {
          onKill?.(displayedSessions[selected].name);
          refresh();
          setMode('list');
        }
        return;
      }

      // ── confirm-batch-kill mode ──
      if (mode === 'confirm-batch-kill') {
        if (key.escape || input === 'n') {
          setMode('list');
          return;
        }
        if (input === 'y' || key.return) {
          for (const name of marked) { onKill?.(name); }
          setMarked(new Set());
          refresh();
          setMode('list');
        }
        return;
      }

      // ── search mode ──
      if (mode === 'search') {
        if (key.escape) {
          setMode('list');
          setSearchQuery('');
          return;
        }
        if (key.return) {
          const filtered = sessions.filter((s) => fuzzyMatch(searchQuery, s.name));
          if (filtered.length > 0) {
            onSelect?.(filtered[selected]);
            exit();
          }
          return;
        }
        if (key.backspace || key.delete) {
          setSearchQuery((v) => v.slice(0, -1));
          return;
        }
        if (key.upArrow || key.downArrow) {
          const filtered = sessions.filter((s) => fuzzyMatch(searchQuery, s.name));
          if (key.upArrow) setSelected((i) => (i - 1 + filtered.length) % filtered.length);
          else setSelected((i) => (i + 1) % filtered.length);
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setSearchQuery((v) => v + input);
          setSelected(0);
        }
        return;
      }

      // ── detail mode ──
      if (mode === 'detail') {
        if (key.escape) {
          setMode('list');
          setDetailSession(null);
          setDetailWindows([]);
          return;
        }
        if (key.upArrow) {
          setDetailSelected((i) => (i - 1 + detailWindows.length) % detailWindows.length);
        } else if (key.downArrow) {
          setDetailSelected((i) => (i + 1) % detailWindows.length);
        }
        return;
      }

      // ── help mode ──
      if (mode === 'help') {
        if (key.escape || input === 'q' || input === 'h') {
          setMode('list');
          return;
        }
        return;
      }

      // ── config mode ──
      if (mode === 'config') {
        // config/new sub-mode
        if (configSubMode === 'new') {
          if (key.escape) {
            setConfigSubMode('list');
            setinputValue('');
            setError('');
            return;
          }
          if (key.return) {
            if (!inputValue.trim()) {
              setError('Window name is required');
              return;
            }
            try {
              newWindow(configSession!.name, inputValue.trim(), configSession!.path);
            } catch (e: any) {
              setError(e.message);
              return;
            }
            refreshConfigWindows();
            setConfigSubMode('list');
            setinputValue('');
            setError('');
            return;
          }
          if (key.backspace || key.delete) {
            setinputValue((v) => v.slice(0, -1));
            setError('');
            return;
          }
          if (input && !key.ctrl && !key.meta) {
            setinputValue((v) => v + input);
            setError('');
          }
          return;
        }

        // config/rename sub-mode
        if (configSubMode === 'rename') {
          if (key.escape) {
            setConfigSubMode('list');
            setinputValue('');
            setError('');
            return;
          }
          if (key.return) {
            if (!inputValue.trim()) {
              setError('Name cannot be empty');
              return;
            }
            try {
              renameWindow(configSession!.name, configWindows[configSelected].index, inputValue.trim());
            } catch (e: any) {
              setError(e.message);
              return;
            }
            refreshConfigWindows();
            setConfigSubMode('list');
            setinputValue('');
            setError('');
            return;
          }
          if (key.backspace || key.delete) {
            setinputValue((v) => v.slice(0, -1));
            setError('');
            return;
          }
          if (input && !key.ctrl && !key.meta) {
            setinputValue((v) => v + input);
            setError('');
          }
          return;
        }

        // config/confirm-delete sub-mode
        if (configSubMode === 'confirm-delete') {
          if (key.escape || input === 'n') {
            setConfigSubMode('list');
            return;
          }
          if (input === 'y' || key.return) {
            try {
              killWindow(configSession!.name, configWindows[configSelected].index);
            } catch (e: any) {
              setError(e.message);
              setConfigSubMode('list');
              return;
            }
            refreshConfigWindows();
            setConfigSubMode('list');
          }
          return;
        }

        // config/init-panes sub-mode
        if (configSubMode === 'init-panes') {
          if (key.escape) {
            setConfigSubMode('list');
            setError('');
            return;
          }
          if (key.return) {
            try {
              initPanes(configSession!.name, configWindows[configSelected].index, PANE_LAYOUTS[layoutSelected].id, configSession!.path);
            } catch (e: any) {
              setError(e.message);
              return;
            }
            refreshConfigWindows();
            setConfigSubMode('list');
            return;
          }
          if (key.upArrow) {
            setLayoutSelected((i) => (i - 1 + PANE_LAYOUTS.length) % PANE_LAYOUTS.length);
          } else if (key.downArrow) {
            setLayoutSelected((i) => (i + 1) % PANE_LAYOUTS.length);
          }
          return;
        }

        // config/move sub-mode
        if (configSubMode === 'move') {
          if (key.escape) {
            setConfigSubMode('list');
            setMoveTargets([]);
            return;
          }
          if (key.return && moveTargets.length > 0) {
            try {
              moveWindow(configSession!.name, configWindows[configSelected].index, moveTargets[moveSelected].name);
            } catch (e: any) {
              setError(e.message);
              setConfigSubMode('list');
              setMoveTargets([]);
              return;
            }
            refreshConfigWindows();
            setConfigSubMode('list');
            setMoveTargets([]);
            return;
          }
          if (key.upArrow) {
            setMoveSelected((i) => (i - 1 + moveTargets.length) % moveTargets.length);
          } else if (key.downArrow) {
            setMoveSelected((i) => (i + 1) % moveTargets.length);
          }
          return;
        }

        // config/list sub-mode
        if (key.escape) {
          refresh();
          setMode('list');
          setConfigSession(null);
          return;
        }
        if (input === 'n') {
          setConfigSubMode('new');
          setinputValue('');
          setError('');
          return;
        }
        if (input === 'r' && configWindows.length > 0) {
          setConfigSubMode('rename');
          setinputValue(configWindows[configSelected].name);
          setError('');
          return;
        }
        if (input === 'd' && configWindows.length > 0) {
          setConfigSubMode('confirm-delete');
          return;
        }
        const canInitPanes = configWindows.length > 0 && configWindows[configSelected].panes === 1;
        if (input === 'i' && canInitPanes) {
          setLayoutSelected(0);
          setConfigSubMode('init-panes');
          setError('');
          return;
        }
        if (input === 'm' && configWindows.length > 0) {
          const targets = listSessions().filter((s) => s.name !== configSession!.name);
          if (targets.length === 0) {
            setError('No other sessions to move to');
            return;
          }
          setMoveTargets(targets);
          setMoveSelected(0);
          setConfigSubMode('move');
          setError('');
          return;
        }
        if (key.upArrow) {
          setConfigSelected((i) => (i - 1 + configWindows.length) % configWindows.length);
        } else if (key.downArrow) {
          setConfigSelected((i) => (i + 1) % configWindows.length);
        }
        return;
      }

      // ── list mode ──
      if (input === 'q') { exit(); return; }
      if (input === 'R') { refresh(); return; }
      if (input === 's' && displayedSessions.length > 0) {
        setFavorites(toggleFavorite(displayedSessions[selected].name, favorites));
        return;
      }
      if (input === 'f') {
        setShowFavoritesOnly((v) => !v);
        setSelected(0);
        return;
      }
      if (key.tab && displayedSessions.length > 0) {
        setMarked((prev) => {
          const next = new Set(prev);
          const name = displayedSessions[selected].name;
          next.has(name) ? next.delete(name) : next.add(name);
          return next;
        });
        setSelected((i) => (i + 1) % displayedSessions.length);
        return;
      }
      if (input === 'X' && marked.size > 0) {
        for (const name of marked) { onDetach?.(name); }
        setMarked(new Set());
        refresh();
        return;
      }
      if (input === 'D' && marked.size > 0) {
        setMode('confirm-batch-kill');
        return;
      }
      if (input === '/') {
        setMode('search');
        setSearchQuery('');
        setSelected(0);
        return;
      }
      if (input === 'i' && displayedSessions.length > 0) {
        const s = displayedSessions[selected];
        setDetailSession(s);
        setDetailWindows(getSessionDetail(s.name));
        setDetailSelected(0);
        setMode('detail');
        return;
      }
      if (input === 'h') {
        setMode('help');
        return;
      }
      if (input === 'n') {
        setMode('new');
        setFocusField('name');
        setinputValue('');
        setinputValue2('');
        setError('');
        return;
      }
      if (input === 'r' && displayedSessions.length > 0) {
        setMode('rename');
        setinputValue(displayedSessions[selected].name);
        setError('');
        return;
      }
      if (input === 'x' && displayedSessions.length > 0) {
        onDetach?.(displayedSessions[selected].name);
        refresh();
        return;
      }
      if (input === 'd' && displayedSessions.length > 0) {
        setMode('confirm-kill');
        return;
      }
      if (input === 'c' && displayedSessions.length > 0) {
        const s = displayedSessions[selected];
        setConfigSession(s);
        setConfigWindows(listWindows(s.name));
        setConfigSelected(0);
        setConfigSubMode('list');
        setError('');
        setMode('config');
        return;
      }
      if (key.upArrow) {
        setSelected((i) => (i - 1 + displayedSessions.length) % displayedSessions.length);
      } else if (key.downArrow) {
        setSelected((i) => (i + 1) % displayedSessions.length);
      } else if (key.return && displayedSessions.length > 0) {
        onSelect?.(displayedSessions[selected]);
        exit();
      }
    });
  }

  // ── Render: new ──
  if (mode === 'new') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
          <Text>{' '}new session</Text>
        </Box>
        <Box marginBottom={1} flexDirection="column">
          <Box>
            <Text color={focusField === 'name' ? 'cyan' : 'white'} bold={focusField === 'name'}>{'Name: '}</Text>
            <Text color={focusField === 'name' ? 'cyan' : 'white'}>{inputValue}</Text>
            {focusField === 'name' && <Text backgroundColor="cyan"> </Text>}
          </Box>
          <Box>
            <Text color={focusField === 'path' ? 'cyan' : 'white'} bold={focusField === 'path'}>{'Path:  '}</Text>
            <Text color={focusField === 'path' ? 'cyan' : 'white'}>{inputValue2}</Text>
            {focusField === 'path' && <Text backgroundColor="cyan"> </Text>}
          </Box>
        </Box>
        {error && <Box marginBottom={1}><Text color="red">{error}</Text></Box>}
        <Box><Text dimColor>tab switch | ↵ create | esc cancel</Text></Box>
      </Box>
    );
  }

  // ── Render: rename ──
  if (mode === 'rename') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
          <Text>{' '}rename session</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>{'New name: '}</Text>
          <Text color="cyan">{inputValue}</Text>
          <Text backgroundColor="cyan"> </Text>
        </Box>
        {error && <Box marginBottom={1}><Text color="red">{error}</Text></Box>}
        <Box><Text dimColor>↵ confirm | esc cancel</Text></Box>
      </Box>
    );  }

  // ── Render: confirm-kill ──
  if (mode === 'confirm-kill' && displayedSessions.length > 0) {
    const target = displayedSessions[selected];
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="red">{' ⚠ delete '}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Kill session </Text>
          <Text bold color="red">{target.name}</Text>
          <Text>?</Text>
        </Box>
        <Box>
          <Text dimColor>y confirm | n/esc cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: confirm-batch-kill ──
  if (mode === 'confirm-batch-kill' && marked.size > 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="red">{' ⚠ batch delete '}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Kill </Text>
          <Text bold color="red">{marked.size}</Text>
          <Text> sessions?</Text>
        </Box>
        {[...marked].map((name) => (
          <Box key={name} marginLeft={2}>
            <Text color="red">{'- '}{name}</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text dimColor>y confirm | n/esc cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: search ──
  if (mode === 'search') {
    const filtered = sessions.filter((s) => fuzzyMatch(searchQuery, s.name));
    const displaySelected = Math.min(selected, Math.max(0, filtered.length - 1));
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
          <Text>{' '}</Text>
          <Text color="cyan">/</Text>
          <Text color="cyan">{searchQuery}</Text>
          <Text backgroundColor="cyan"> </Text>
          <Text dimColor>{`  ${filtered.length}/${sessions.length}`}</Text>
        </Box>
        {filtered.length === 0 ? (
          <Text dimColor>No matching sessions</Text>
        ) : (
          <Box flexDirection="column">
            <Box>
              <Text>{'  '}</Text>
              <Text dimColor>{'NAME'.padEnd(22)}</Text>
              <Text dimColor>{'WINS'.padEnd(7)}</Text>
              <Text dimColor>{'STATUS'.padEnd(8)}</Text>
              <Text dimColor>{'  LAST USED'}</Text>
            </Box>
            {filtered.map((s, i) => (
              <Box key={s.sessionId} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text>{i === displaySelected ? '▸ ' : '  '}</Text>
                  <Text bold color={i === displaySelected ? 'cyan' : (s.attached ? 'green' : 'white')}>
                    {(s.name.length > 20 ? s.name.slice(0, 17) + '...' : s.name).padEnd(22)}
                  </Text>
                  <Text dimColor>
                    {`${s.windows} win${s.windows !== 1 ? 's' : ''}`.padEnd(7)}
                  </Text>
                  <Text color="yellow">{s.attached ? 'attached' : '        '}</Text>
                  <Text dimColor>{'  '}{formatTime(s.lastAttached)}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {interactive && (
          <Box marginTop={1}>
            <Text dimColor>↑↓ select | ↵ attach | esc cancel</Text>
          </Box>
        )}
      </Box>
    );
  }

  // ── Render: detail ──
  if (mode === 'detail' && detailSession) {
    const ds = detailSelected;
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
          <Text>{' '}</Text>
          <Text bold color="cyan">{detailSession.name}</Text>
          <Text dimColor>{'  '}{detailSession.path.replace(process.env.HOME || '', '~')}</Text>
        </Box>

        {detailWindows.length === 0 ? (
          <Text dimColor>No windows found</Text>
        ) : (
          detailWindows.map((w, i) => (
            <Box key={w.index} flexDirection="column" marginBottom={1}>
              <Box>
                <Text>{i === ds ? '▸ ' : '  '}</Text>
                <Text bold color={i === ds ? 'cyan' : (w.active ? 'green' : 'white')}>
                  {w.name}
                </Text>
                <Text dimColor>{`  ${w.panes} pane${w.panes !== 1 ? 's' : ''}`}</Text>
                <Text color="yellow">{w.active ? '  active' : ''}</Text>
              </Box>
              {i === ds && w.paneList && w.paneList.map((p) => (
                <Box key={p.index} marginLeft={3}>
                  <Text dimColor>{`[${p.index}] `}</Text>
                  <Text color={p.active ? 'green' : 'white'}>
                    {p.currentCommand}
                  </Text>
                  {p.currentPath && (
                    <Text dimColor>{`  ${p.currentPath.replace(process.env.HOME || '', '~')}`}</Text>
                  )}
                </Box>
              ))}
            </Box>
          ))
        )}

        {interactive && (
          <Box marginTop={1}>
            <Text dimColor>↑↓ select | esc back</Text>
          </Box>
        )}
      </Box>
    );
  }

  // ── Render: help ──
  if (mode === 'help') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
          <Text>{' '}</Text>
          <Text bold color="cyan">Help</Text>
          <Text dimColor>{'  All available commands'}</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold color="white">NAVIGATION</Text>
          <Text>{'  '}<Text bold>↑↓</Text><Text dimColor>          Select session</Text></Text>

          <Box marginTop={1}><Text bold color="white">SESSION MANAGEMENT</Text></Box>
          <Text>{'  '}<Text bold>↵</Text><Text dimColor>           Attach to selected session</Text></Text>
          <Text>{'  '}<Text color="green" bold>n</Text><Text dimColor>           Create new session</Text></Text>
          <Text>{'  '}<Text color="yellow" bold>r</Text><Text dimColor>           Rename selected session</Text></Text>
          <Text>{'  '}<Text color="blue" bold>x</Text><Text dimColor>           Detach selected session</Text></Text>
          <Text>{'  '}<Text color="red" bold>d</Text><Text dimColor>           Delete selected session</Text></Text>

          <Box marginTop={1}><Text bold color="white">SEARCH & FILTER</Text></Box>
          <Text>{'  '}<Text color="cyan" bold>/</Text><Text dimColor>           Search sessions by name</Text></Text>
          <Text>{'  '}<Text color="yellow" bold>s</Text><Text dimColor>           Toggle favorite on selected session</Text></Text>
          <Text>{'  '}<Text color="cyan" bold>f</Text><Text dimColor>           Filter list to favorites only</Text></Text>

          <Box marginTop={1}><Text bold color="white">ADVANCED</Text></Box>
          <Text>{'  '}<Text color="magenta" bold>c</Text><Text dimColor>           Config — manage windows for selected session</Text></Text>
          <Text>{'  '}<Text color="white" bold>i</Text><Text dimColor>           Show session details (windows & panes)</Text></Text>
          <Text>{'  '}<Text color="white" bold>R</Text><Text dimColor>           Refresh session list</Text></Text>

          <Box marginTop={1}><Text bold color="white">BATCH OPERATIONS</Text></Box>
          <Text>{'  '}<Text color="white" bold>Tab</Text><Text dimColor>         Mark / unmark session</Text></Text>
          <Text>{'  '}<Text color="blue" bold>X</Text><Text dimColor>           Batch detach all marked sessions</Text></Text>
          <Text>{'  '}<Text color="red" bold>D</Text><Text dimColor>           Batch delete all marked sessions</Text></Text>

          <Box marginTop={1}><Text bold color="white">OTHER</Text></Box>
          <Text>{'  '}<Text bold>q</Text><Text dimColor>           Quit tmuxtui</Text></Text>
          <Text>{'  '}<Text bold>h</Text><Text dimColor>           Show this help screen</Text></Text>

          <Box marginTop={1}><Text bold color="white">PERSISTENCE</Text></Box>
          <Text dimColor>{'  Sessions live in tmux server memory and do NOT survive reboots.'}</Text>
          <Text dimColor>{'  Install tmux-resurrect + tmux-continuum to save/restore across restarts.'}</Text>
        </Box>

        {interactive && (
          <Box marginTop={1}>
            <Text dimColor>esc back to sessions</Text>
          </Box>
        )}
      </Box>
    );
  }

  // ── Render: config ──
  if (mode === 'config' && configSession) {
    // config/new sub-mode
    if (configSubMode === 'new') {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Box marginBottom={1}>
            <Text bold color="white" backgroundColor="magenta">{' config '}</Text>
            <Text>{' '}new window</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>{'Name: '}</Text>
            <Text color="cyan">{inputValue}</Text>
            <Text backgroundColor="cyan"> </Text>
          </Box>
          {error && <Box marginBottom={1}><Text color="red">{error}</Text></Box>}
          <Box><Text dimColor>↵ create | esc cancel</Text></Box>
        </Box>
      );
    }

    // config/rename sub-mode
    if (configSubMode === 'rename') {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Box marginBottom={1}>
            <Text bold color="white" backgroundColor="magenta">{' config '}</Text>
            <Text>{' '}rename window</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>{'New name: '}</Text>
            <Text color="cyan">{inputValue}</Text>
            <Text backgroundColor="cyan"> </Text>
          </Box>
          {error && <Box marginBottom={1}><Text color="red">{error}</Text></Box>}
          <Box><Text dimColor>↵ confirm | esc cancel</Text></Box>
        </Box>
      );
    }

    // config/confirm-delete sub-mode
    if (configSubMode === 'confirm-delete' && configWindows.length > 0) {
      const target = configWindows[configSelected];
      return (
        <Box flexDirection="column" paddingX={1}>
          <Box marginBottom={1}>
            <Text bold color="white" backgroundColor="red">{' ⚠ delete '}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>Delete window </Text>
            <Text bold color="red">{target.name}</Text>
            <Text>?</Text>
          </Box>
          <Box>
            <Text dimColor>y confirm | n/esc cancel</Text>
          </Box>
        </Box>
      );
    }

    // config/list sub-mode
    if (configSubMode === 'list') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="magenta">{' config '}</Text>
          <Text>{' '}{configSession.name}</Text>
          <Text dimColor>{'  windows ('}{configWindows.length}{')'}</Text>
        </Box>

        {configWindows.length === 0 ? (
          <Text dimColor>No windows found</Text>
        ) : (
          configWindows.map((w, i) => (
            <Box key={w.index}>
              <Text>{i === configSelected ? '▸ ' : '  '}</Text>
              <Text bold color={i === configSelected ? 'cyan' : (w.active ? 'green' : 'white')}>
                {w.name.padEnd(20)}
              </Text>
              <Text dimColor>
                {w.panes} pane{w.panes !== 1 ? 's' : ''}
              </Text>
              <Text color="yellow">{w.active ? '  active' : ''}</Text>
            </Box>
          ))
        )}

        {interactive && (
          <Box marginTop={1}>
            <Text dimColor>↑↓ select | </Text>
            <Text color="green" bold>n</Text><Text dimColor> new | </Text>
            <Text color="yellow" bold>r</Text><Text dimColor> rename | </Text>
            <Text color="red" bold>d</Text><Text dimColor> delete | </Text>
            {configWindows.length > 0 && configWindows[configSelected].panes === 1 && (
              <><Text color="cyan" bold>i</Text><Text dimColor> init panes | </Text></>
            )}
            {configWindows.length > 0 && (<><Text color="blue" bold>m</Text><Text dimColor> move | </Text></>)}
            <Text dimColor>esc back</Text>
          </Box>
        )}
      </Box>
    );
    }

    // config/move sub-mode
    if (configSubMode === 'move') {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Box marginBottom={1}>
            <Text bold color="white" backgroundColor="magenta">{' config '}</Text>
            <Text>{' '}move window </Text>
            <Text bold color="cyan">{configWindows[configSelected]?.name}</Text>
            <Text>{' to:'}</Text>
          </Box>

          {moveTargets.map((s, i) => (
            <Box key={s.sessionId}>
              <Text>{i === moveSelected ? '▸ ' : '  '}</Text>
              <Text bold color={i === moveSelected ? 'cyan' : 'white'}>
                {s.name}
              </Text>
              <Text dimColor>{`  ${s.windows} win${s.windows !== 1 ? 's' : ''}`}</Text>
              <Text color="yellow">{s.attached ? '  attached' : ''}</Text>
            </Box>
          ))}

          {error && <Box marginTop={1}><Text color="red">{error}</Text></Box>}

          {interactive && (
            <Box marginTop={1}>
              <Text dimColor>↑↓ select | ↵ move | esc cancel</Text>
            </Box>
          )}
        </Box>
      );
    }

    // config/init-panes sub-mode
    const selectedLayout = PANE_LAYOUTS[layoutSelected];
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color="white" backgroundColor="magenta">{' config '}</Text>
          <Text>{' '}{configWindows[configSelected]?.name}</Text>
          <Text dimColor>{'  init panes'}</Text>
        </Box>

        {PANE_LAYOUTS.map((layout, i) => (
          <Box key={layout.id}>
            <Text>{i === layoutSelected ? '▸ ' : '  '}</Text>
            <Text bold color={i === layoutSelected ? 'cyan' : 'white'}>
              {`${layout.id}. ${layout.name.padEnd(12)}`}
            </Text>
            <Text dimColor>{`${layout.panes} pane${layout.panes !== 1 ? 's' : ''}`}</Text>
          </Box>
        ))}

        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Preview:</Text>
          {selectedLayout.preview.map((line, i) => (
            <Text key={i} color="cyan">{line}</Text>
          ))}
        </Box>

        {error && <Box marginTop={1}><Text color="red">{error}</Text></Box>}

        {interactive && (
          <Box marginTop={1}>
            <Text dimColor>↑↓ select | ↵ apply | esc cancel</Text>
          </Box>
        )}
      </Box>
    );
  }

  // ── Render: list ──
  const safeSelected = Math.min(selected, Math.max(0, displayedSessions.length - 1));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
        <Text dimColor>{' '}tmux sessions ({displayedSessions.length}{showFavoritesOnly ? ' ★' : ''}/{sessions.length})</Text>
      </Box>

      {displayedSessions.length === 0 ? (
        <Text dimColor>{showFavoritesOnly ? 'No favorite sessions' : 'No tmux sessions found'}</Text>
      ) : (
        <Box flexDirection="column">
          <Box>
            <Text>{'  '}</Text>
            <Text dimColor>{'NAME'.padEnd(22)}</Text>
            <Text dimColor>{'WINS'.padEnd(7)}</Text>
            <Text dimColor>{'STATUS'.padEnd(8)}</Text>
            <Text dimColor>{'  LAST USED'}</Text>
          </Box>
          {displayedSessions.map((s, i) => (
            <Box key={s.sessionId} flexDirection="column" marginBottom={1}>
              <Box>
                <Text>{marked.has(s.name) ? '☑' : '☐'}</Text>
                <Text>{favorites.has(s.name) ? '★' : ' '}</Text>
                <Text>{i === safeSelected ? '▸' : ' '}</Text>
                <Text bold color={i === safeSelected ? 'cyan' : (s.attached ? 'green' : 'white')}>
                  {(s.name.length > 20 ? s.name.slice(0, 17) + '...' : s.name).padEnd(22)}
                </Text>
                <Text dimColor>
                  {`${s.windows} win${s.windows !== 1 ? 's' : ''}`.padEnd(7)}
                </Text>
                <Text color="yellow">{s.attached ? 'attached' : '        '}</Text>
                <Text dimColor>{'  '}{formatTime(s.lastAttached)}</Text>
              </Box>
              {s.path && (
                <Text dimColor>{'    '}{s.path.replace(process.env.HOME || '', '~')}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {interactive && (
        <Box marginTop={1} flexDirection="column">
            <Box>
              <Text dimColor>↑↓ select | ↵ attach | </Text>
              <Text color="green" bold>n</Text><Text dimColor> new | </Text>
              <Text color="yellow" bold>r</Text><Text dimColor> rename | </Text>
              <Text color="magenta" bold>c</Text><Text dimColor> config | </Text>
              <Text dimColor>q quit | </Text>
              <Text bold>h</Text><Text dimColor> help</Text>
            </Box>
            <Box>
              <Text color="cyan" bold>/</Text><Text dimColor> search | </Text>
              <Text color="yellow" bold>s</Text><Text dimColor> star | </Text>
              <Text color="cyan" bold>f</Text><Text dimColor> filter | </Text>
              <Text color="white" bold>R</Text><Text dimColor> refresh | </Text>
              <Text color="blue" bold>x</Text><Text dimColor> detach | </Text>
              <Text color="red" bold>d</Text><Text dimColor> delete | </Text>
              <Text color="white" bold>i</Text><Text dimColor> info</Text>
            </Box>
            <Box>
              <Text color="white" bold>Tab</Text><Text dimColor> mark | </Text>
              <Text color="blue" bold>X</Text><Text dimColor> batch detach | </Text>
              <Text color="red" bold>D</Text><Text dimColor> batch kill</Text>
            </Box>
        </Box>
      )}
    </Box>
  );
}

export default function App({
  onSelect,
  onCreate,
  onKill,
  onRename,
  onDetach,
  favoritesOnly,
}: {
  onSelect?: (session: TmuxSession) => void;
  onCreate?: (name: string, path: string) => void;
  onKill?: (name: string) => void;
  onRename?: (oldName: string, newName: string) => void;
  onDetach?: (name: string) => void;
  favoritesOnly?: boolean;
}) {
  return (
    <SessionView
      interactive={!!process.stdin.isTTY}
      favoritesOnly={favoritesOnly}
      onSelect={onSelect}
      onCreate={onCreate}
      onKill={onKill}
      onRename={onRename}
      onDetach={onDetach}
    />
  );
}
