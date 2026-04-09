#!/bin/bash
# Claude Code → tmux 状态栏 hook
# 用法: tmux-status.sh <EVENT_TYPE>
# stdin: Claude Code 传入的 JSON 数据

EVENT="$1"
INPUT=$(cat)

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
