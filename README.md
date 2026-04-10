# tmuxtui

Interactive terminal UI for managing tmux sessions. Browse, create, rename, detach, and kill sessions without memorizing tmux commands.

## Features

- **Session browser** — list all tmux sessions sorted by last used, with window count, working directory, and creation time
- **Quick attach** — select and attach to any session instantly; auto sets terminal tab title to `[tmux] session_name`
- **Create sessions** — new session with custom name and working directory
- **Window manager** — press `c` to enter config mode: create, rename, delete windows, and initialize pane layouts
- **Pane layout presets** — 9 built-in layouts (IDE, Quad, Triple, etc.) with live preview
- **Rename / Detach / Kill** — full session lifecycle management
- **Works everywhere** — runs inside or outside tmux (auto-detects and uses `switch-client` or `attach-session`)
- **`init` command** — register the current directory as a new tmux session in one step

## Requirements

- Node.js >= 18
- tmux >= 3.2

## Install

```bash
npm install -g tmux-tui
```

## Usage

### Interactive TUI

```bash
tmuxtui
```

Keyboard shortcuts:

| Key | Action |
|-----|--------|
| `↑` `↓` | Select session |
| `Enter` | Attach to session |
| `n` | New session |
| `r` | Rename session |
| `x` | Detach session |
| `d` | Kill session (with confirm) |
| `c` | Config — window management |
| `q` | Quit |

When creating a new session, press `Tab` to switch between the name and path fields.

### Config mode (window management)

Press `c` on any session to enter config mode. This lets you manage windows within the selected session.

| Key | Action |
|-----|--------|
| `↑` `↓` | Select window |
| `n` | New window |
| `r` | Rename window |
| `d` | Delete window (with confirm) |
| `i` | Init pane layout (only for single-pane inactive windows) |
| `Esc` | Back to session list |

#### Pane layout presets

When you press `i`, you can choose from 9 built-in pane layouts:

| Layout | Panes | Description |
|--------|-------|-------------|
| 1. Single | 1 | No splits |
| 2. H-Split | 2 | Horizontal 50/50 |
| 3. V-Split | 2 | Vertical 50/50 |
| 4. IDE | 2 | Left sidebar (25%) + main |
| 5. IDE+Term | 3 | IDE + bottom terminal |
| 6. Triple | 3 | Three equal columns |
| 7. IDE+Side | 3 | IDE with right sidebar |
| 8. Quad | 4 | 2x2 grid |
| 9. IDE Pro | 4 | IDE + split right panel |

### Quick register current project

```bash
tmuxtui init
# or
tmuxtui -i
```

Creates a new tmux session named after the current directory and opens it with tmuxtui.

---

[English](#tmuxtui) | [中文](#tmuxtui-1)

---

# tmuxtui

tmux 会话管理的交互式终端界面。无需记忆 tmux 命令，即可浏览、创建、重命名、分离和销毁会话。

## 功能

- **会话浏览** — 按最近使用排序列出所有 tmux 会话，显示窗口数、工作目录和创建时间
- **快速接入** — 选中会话后一键 attach，自动设置终端标签为 `[tmux] 会话名`
- **创建会话** — 自定义名称和工作目录
- **窗口管理** — 按 `c` 进入配置模式：新建、重命名、删除窗口，初始化 pane 布局
- **Pane 布局预设** — 9 种内置布局（IDE、Quad、Triple 等），带实时预览
- **重命名 / 分离 / 销毁** — 完整的会话生命周期管理
- **全场景适配** — 在 tmux 内外均可运行（自动检测并使用 `switch-client` 或 `attach-session`）
- **`init` 命令** — 一行命令将当前目录注册为新的 tmux 会话

## 环境要求

- Node.js >= 18
- tmux >= 3.2

## 安装

```bash
npm install -g tmux-tui
```

## 使用

### 交互式 TUI

```bash
tmuxtui
```

快捷键：

| 按键 | 操作 |
|------|------|
| `↑` `↓` | 选择会话 |
| `Enter` | 接入会话 |
| `n` | 新建会话 |
| `r` | 重命名会话 |
| `x` | 分离会话 |
| `d` | 销毁会话（需确认） |
| `c` | 配置 — 窗口管理 |
| `q` | 退出 |

创建新会话时，按 `Tab` 在名称和路径输入框之间切换。

### 配置模式（窗口管理）

在任意会话上按 `c` 进入配置模式，管理该会话下的窗口。

| 按键 | 操作 |
|------|------|
| `↑` `↓` | 选择窗口 |
| `n` | 新建窗口 |
| `r` | 重命名窗口 |
| `d` | 删除窗口（需确认） |
| `i` | 初始化 pane 布局（仅限单 pane 且非活跃窗口） |
| `Esc` | 返回会话列表 |

#### Pane 布局预设

按 `i` 后可从 9 种内置布局中选择：

| 布局 | Pane 数 | 说明 |
|------|---------|------|
| 1. Single | 1 | 无分屏 |
| 2. H-Split | 2 | 水平 50/50 |
| 3. V-Split | 2 | 垂直 50/50 |
| 4. IDE | 2 | 左侧栏 (25%) + 主区域 |
| 5. IDE+Term | 3 | IDE + 底部终端 |
| 6. Triple | 3 | 三等分列 |
| 7. IDE+Side | 3 | IDE + 右侧栏 |
| 8. Quad | 4 | 2x2 网格 |
| 9. IDE Pro | 4 | IDE + 右侧分屏 |

### 快速注册当前项目

```bash
tmuxtui init
# 或
tmuxtui -i
```

以当前目录名创建 tmux 会话，并通过 tmuxtui 打开。

## License

MIT
