# tmux 环境搭建指南

在新系统上完整安装 tmux、插件及 Claude Code hooks 的标准流程。

---

## 目录

1. [依赖安装](#1-依赖安装)
2. [安装 TPM（插件管理器）](#2-安装-tpm插件管理器)
3. [应用 tmux 配置](#3-应用-tmux-配置)
4. [安装插件](#4-安装插件)
5. [安装 Claude Code hooks](#5-安装-claude-code-hooks)
6. [注册 hooks 到 Claude Code](#6-注册-hooks-到-claude-code)
7. [验证](#7-验证)

---

## 1. 依赖安装

```bash
# macOS
brew install tmux jq

# 验证版本（需要 tmux >= 3.1，jq 用于解析 hook 的 JSON 输入）
tmux -V
jq --version
```

---

## 2. 安装 TPM（插件管理器）

```bash
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

---

## 3. 应用 tmux 配置

将本仓库的 `.tmux.conf` 复制到 `~`：

```bash
cp .tmux.conf ~/.tmux.conf
```

> **注意**：配置末尾的 `status-right` 中写有本机的 powerline 路径（`/Users/liuziyuan/...`），
> 在新机器上需要修改为实际用户名：
>
> ```bash
> sed -i '' "s|/Users/liuziyuan|$HOME|g" ~/.tmux.conf
> ```

---

## 4. 安装插件

启动（或重启）tmux，然后在 tmux 内执行：

```
prefix + I
```

（默认 prefix 是 `Ctrl+a`，按下后松开，再按大写 `I`）

TPM 会自动下载并安装 `.tmux.conf` 中声明的所有插件，包括 `erikw/tmux-powerline`。

安装完成后重载配置：

```
prefix + r
```

---

## 5. 安装 Claude Code hooks

hooks 脚本负责将 Claude Code 的运行状态实时写入 tmux，在 pane 标题和底部状态栏同时显示。

### 5.1 创建目录并复制脚本

```bash
mkdir -p ~/.claude/hooks
cp .claude/hooks/tmux-status.sh ~/.claude/hooks/tmux-status.sh
chmod +x ~/.claude/hooks/tmux-status.sh
```

### 5.2 脚本功能说明

脚本监听以下 Claude Code 事件，并更新 tmux 显示：

| 事件 | 显示 |
|------|------|
| `SessionStart` / `Stop` / `StopFailure` | `✓ 空闲` |
| `UserPromptSubmit` / `PostToolUse` | `⠿ 处理中` |
| `PermissionRequest` | `🔒 等待授权` |
| `Notification` | `💬 <消息前40字>` |
| `SessionEnd` | （清空） |

脚本写入两个 tmux 变量：

- `@claude_pane_status`：pane 级别，每个 pane 独立（pane 标题边框读取）
- `@claude_all_status`：全局聚合，格式为 `1.0:✓ 空闲  1.2:🔒 等待授权`（状态栏读取）

> **实现细节**：Claude Code 的 hook 子进程不继承 `$TMUX_PANE`，脚本通过进程树向上查找
> 当前进程所属的 tmux pane ID，因此多个 Claude Code 实例可以各自独立更新状态。

---

## 6. 注册 hooks 到 Claude Code

编辑 `~/.claude/settings.json`，在 `hooks` 字段中添加以下内容（将 `$HOME` 替换为实际路径）：

```json
{
  "hooks": {
    "Notification":       [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh Notification",       "type": "command"}], "matcher": ""}],
    "PermissionRequest":  [{"hooks": [{"command":       "$HOME/.claude/hooks/tmux-status.sh PermissionRequest",             "type": "command"}], "matcher": ""}],
    "PostToolUse":        [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh PostToolUse",         "type": "command"}], "matcher": ""}],
    "PostToolUseFailure": [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh PostToolUseFailure",  "type": "command"}], "matcher": ""}],
    "UserPromptSubmit":   [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh UserPromptSubmit",    "type": "command"}], "matcher": ""}],
    "Stop":               [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh Stop",               "type": "command"}], "matcher": ""}],
    "StopFailure":        [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh StopFailure",        "type": "command"}], "matcher": ""}],
    "SessionStart":       [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh SessionStart",       "type": "command"}], "matcher": ""}],
    "SessionEnd":         [{"hooks": [{"async": true,  "command": "$HOME/.claude/hooks/tmux-status.sh SessionEnd",         "type": "command"}], "matcher": ""}]
  }
}
```

> **提示**：`settings.json` 里不能直接用 `$HOME`，需要写成绝对路径，例如 `/Users/yourname`。
> 可以用以下命令批量生成：
>
> ```bash
> # 用 jq 检查当前 hooks 配置
> jq '.hooks | keys' ~/.claude/settings.json
> ```

---

## 7. 验证

```bash
# 1. 手动触发一次 hook，确认变量写入成功
echo '{}' | bash ~/.claude/hooks/tmux-status.sh SessionStart
tmux show-option -g @claude_all_status

# 2. 检查 pane 状态变量（应显示当前 pane 的状态）
tmux list-panes -a -F "#{window_index}.#{pane_index} #{pane_id} #{@claude_pane_status}"

# 3. 重载 tmux 配置
tmux source ~/.tmux.conf
```

正常输出示例：

```
@claude_all_status "1.1:✓ 空闲"
1.1 %20 ✓ 空闲
1.2 %22 ✓ 空闲
```

---

## 快捷键速查

Prefix 为 `Ctrl+a`（按下后松开，再按对应键）。

### 高频

| 快捷键 | 功能 |
|--------|------|
| `prefix c` | 创建新 window |
| `prefix n` | 下一个 window |
| `prefix p` | 上一个 window |
| `prefix 0-9` | 切换到指定 window |
| `prefix d` | detach 当前 session |
| `prefix \|` | 左右分屏 |
| `prefix -` | 上下分屏 |
| `prefix x` | 关闭当前 pane |
| `prefix h/j/k/l` | 切换 pane（vim 风格） |

### 中频

| 快捷键 | 功能 |
|--------|------|
| `prefix &` | 关闭当前 window |
| `prefix ,` | 重命名 window |
| `prefix w` | 列出所有 window |
| `prefix s` | 列出所有 session |
| `prefix $` | 重命名 session |
| `prefix z` | pane 全屏切换 |
| `prefix o` | 轮换切换 pane |
| `prefix q` | 显示 pane 编号 |
| `prefix r` | 重载配置 |
| `prefix I` | 安装 TPM 插件 |
