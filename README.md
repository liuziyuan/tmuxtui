# tmuxtui

Interactive terminal UI for managing tmux sessions. Browse, create, rename, detach, and kill sessions without memorizing tmux commands.

## Features

- **Session browser** — list all tmux sessions sorted by last used, with window count and creation time
- **Quick attach** — select and attach to any session instantly
- **Create sessions** — new session with custom name and working directory
- **Rename / Detach / Kill** — full session lifecycle management
- **Works everywhere** — runs inside or outside tmux (auto-detects and uses `switch-client` or `attach-session`)
- **`init` command** — register the current directory as a new tmux session in one step

## Requirements

- Node.js >= 18
- tmux >= 3.2

## Install

```bash
npm install -g tmuxtui
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
| `q` | Quit |

When creating a new session, press `Tab` to switch between the name and path fields.

### Quick register current project

```bash
tmuxtui init
```

Creates a new tmux session named after the current directory and opens it with tmuxtui.

---

[English](#tmuxtui) | [中文](#tmuxtui-1)

---

# tmuxtui

tmux 会话管理的交互式终端界面。无需记忆 tmux 命令，即可浏览、创建、重命名、分离和销毁会话。

## 功能

- **会话浏览** — 按最近使用排序列出所有 tmux 会话，显示窗口数和创建时间
- **快速接入** — 选中会话后一键 attach
- **创建会话** — 自定义名称和工作目录
- **重命名 / 分离 / 销毁** — 完整的会话生命周期管理
- **全场景适配** — 在 tmux 内外均可运行（自动检测并使用 `switch-client` 或 `attach-session`）
- **`init` 命令** — 一行命令将当前目录注册为新的 tmux 会话

## 环境要求

- Node.js >= 18
- tmux >= 3.2

## 安装

```bash
npm install -g tmuxtui
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
| `q` | 退出 |

创建新会话时，按 `Tab` 在名称和路径输入框之间切换。

### 快速注册当前项目

```bash
tmuxtui init
```

以当前目录名创建 tmux 会话，并通过 tmuxtui 打开。

## License

MIT
