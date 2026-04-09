#!/bin/bash
# Claude Code → tmux 状态栏 hook
# 用法: tmux-status.sh <EVENT_TYPE>
# stdin: Claude Code 传入的 JSON 数据

EVENT="$1"
INPUT=$(cat)

# Claude Code 的 hook 子进程不继承 $TMUX_PANE，通过进程树向上查找所属 pane
if [ -n "$TMUX" ] && [ -z "$TMUX_PANE" ]; then
    check_pid=$$
    while [ "${check_pid:-0}" -gt 1 ]; do
        found=$(tmux list-panes -a -F "#{pane_id} #{pane_pid}" 2>/dev/null \
                | awk -v pid="$check_pid" '$2==pid{print $1; exit}')
        if [ -n "$found" ]; then TMUX_PANE="$found"; break; fi
        check_pid=$(ps -o ppid= -p "$check_pid" 2>/dev/null | tr -d '[:space:]')
    done
fi

case "$EVENT" in
  Notification)
    MSG=$(echo "$INPUT" | jq -r '.message // ""' 2>/dev/null | cut -c1-40)
    STATUS="💬 ${MSG}"
    ;;
  PermissionRequest)
    STATUS="🔒 等待授权"
    ;;
  PostToolUse|PostToolUseFailure)
    STATUS="⠿ 处理中"
    ;;
  UserPromptSubmit)
    STATUS="⠿ 处理中"
    ;;
  Stop|StopFailure)
    STATUS="✓ 空闲"
    ;;
  SessionStart)
    STATUS="✓ 空闲"
    ;;
  SessionEnd)
    STATUS=""
    ;;
  *)
    exit 0
    ;;
esac

# 写入 tmux 全局变量（status-left/right 通过 #{@claude_status} 读取）
tmux set-option -g @claude_status "$STATUS" 2>/dev/null || true

# 写入 pane 用户变量（当在 tmux pane 内运行时，每个 pane 独立显示）
if [ -n "$TMUX" ] && [ -n "$TMUX_PANE" ]; then
    tmux set-option -pt "$TMUX_PANE" @claude_pane_status "$STATUS" 2>/dev/null || true

    # 重建聚合状态：扫描所有 pane，收集非空状态写入全局变量供状态栏使用
    ALL=""
    while IFS='|' read -r win_idx pane_idx pane_status; do
        [ -n "$pane_status" ] && ALL="${ALL:+$ALL  }${win_idx}.${pane_idx}:${pane_status}"
    done < <(tmux list-panes -a -F "#{window_index}|#{pane_index}|#{@claude_pane_status}" 2>/dev/null)
    tmux set-option -g @claude_all_status "$ALL" 2>/dev/null || true
fi
