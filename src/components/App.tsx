import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { listSessions, formatTime } from '../services/tmuxService.js';
import type { TmuxSession } from '../types.js';

type Mode = 'list' | 'new' | 'rename' | 'confirm-kill';

interface SessionViewProps {
  interactive: boolean;
  onSelect?: (session: TmuxSession) => void;
  onCreate?: (name: string, path: string) => void;
  onKill?: (name: string) => void;
  onRename?: (oldName: string, newName: string) => void;
  onDetach?: (name: string) => void;
}

function SessionView({ interactive, onSelect, onCreate, onKill, onRename, onDetach }: SessionViewProps) {
  const { exit } = useApp();
  const [sessions, setSessions] = useState(listSessions);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [inputValue, setinputValue] = useState('');
  const [inputValue2, setinputValue2] = useState('');
  const [focusField, setFocusField] = useState<'name' | 'path'>('name');
  const [error, setError] = useState('');

  const refresh = () => {
    const updated = listSessions();
    setSessions(updated);
    setSelected((i) => Math.min(i, Math.max(0, updated.length - 1)));
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
          onKill?.(sessions[selected].name);
          refresh();
          setMode('list');
        }
        return;
      }

      // ── list mode ──
      if (input === 'q') { exit(); return; }
      if (input === 'n') {
        setMode('new');
        setFocusField('name');
        setinputValue('');
        setinputValue2('');
        setError('');
        return;
      }
      if (input === 'r' && sessions.length > 0) {
        setMode('rename');
        setinputValue(sessions[selected].name);
        setError('');
        return;
      }
      if (input === 'x' && sessions.length > 0) {
        onDetach?.(sessions[selected].name);
        refresh();
        return;
      }
      if (input === 'd' && sessions.length > 0) {
        setMode('confirm-kill');
        return;
      }
      if (key.upArrow) {
        setSelected((i) => (i - 1 + sessions.length) % sessions.length);
      } else if (key.downArrow) {
        setSelected((i) => (i + 1) % sessions.length);
      } else if (key.return && sessions.length > 0) {
        onSelect?.(sessions[selected]);
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
        <Box><Text dimColor>tab switch  enter create  esc cancel</Text></Box>
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
        <Box><Text dimColor>enter confirm  esc cancel</Text></Box>
      </Box>
    );
  }

  // ── Render: confirm-kill ──
  if (mode === 'confirm-kill' && sessions.length > 0) {
    const target = sessions[selected];
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
          <Text dimColor>y confirm  n/esc cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: list ──
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="white" backgroundColor="blue">{' tmuxtui '}</Text>
        <Text dimColor>{' '}tmux sessions ({sessions.length})</Text>
      </Box>

      {sessions.length === 0 ? (
        <Text dimColor>No tmux sessions found</Text>
      ) : (
        sessions.map((s, i) => (
          <Box key={s.sessionId} flexDirection="column" marginBottom={1}>
            <Box>
              <Text>{i === selected ? '▸ ' : '  '}</Text>
              <Text bold color={i === selected ? 'cyan' : (s.attached ? 'green' : 'white')}>
                {s.name.padEnd(18)}
              </Text>
              <Text dimColor>
                {s.windows} win{s.windows !== 1 ? 's' : ''}
              </Text>
              <Text color="yellow">{s.attached ? '  attached  ' : '            '}</Text>
              <Text dimColor>{formatTime(s.created)}</Text>
            </Box>
            {s.path && (
              <Text dimColor>{'    '}{s.path.replace(process.env.HOME || '', '~')}</Text>
            )}
          </Box>
        ))
      )}

      {interactive && (
        <Box marginTop={1}>
          <Text dimColor>↑↓ select  enter attach  </Text>
          <Text color="green" bold>n new  </Text>
          <Text color="yellow" bold>r rename  </Text>
          <Text color="blue" bold>x detach  </Text>
          <Text color="red" bold>d delete  </Text>
          <Text dimColor>q quit</Text>
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
}: {
  onSelect?: (session: TmuxSession) => void;
  onCreate?: (name: string, path: string) => void;
  onKill?: (name: string) => void;
  onRename?: (oldName: string, newName: string) => void;
  onDetach?: (name: string) => void;
}) {
  return (
    <SessionView
      interactive={!!process.stdin.isTTY}
      onSelect={onSelect}
      onCreate={onCreate}
      onKill={onKill}
      onRename={onRename}
      onDetach={onDetach}
    />
  );
}
