# tmuxtui

[English](README.md)

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

### 命令

#### Init — 注册当前项目

```bash
tmuxtui init
# 或
tmuxtui -i
```

以当前目录名创建 tmux 会话，并通过 tmuxtui 打开。

#### Update — 自动更新

```bash
tmuxtui update
```

检查 npm 仓库中的最新版本，如有新版本则自动更新 tmuxtui。显示当前版本，更新完成后确认新版本号。

#### Version — 显示版本

```bash
tmuxtui --version
# 或
tmuxtui -v
```

显示已安装的 tmuxtui 版本。

#### Last — 快速接入最近会话

```bash
tmuxtui last
# 或
tmuxtui -l
```

直接接入最近使用的 tmux 会话，无需打开会话选择器。

#### Favorites only — 仅显示收藏会话

```bash
tmuxtui --favorites
# 或
tmuxtui -F
```

打开 tmuxtui 但仅显示已收藏的会话。

## License

MIT
