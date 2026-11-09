#!/usr/bin/env python3
"""給 Claude Code hook 用：讀 hook 傳進來的 JSON，自動更新角色狀態。只用標準庫；任何錯誤都吞掉（不能害 agent 卡住）。
用法（寫在 hook 設定裡）：python3 /絕對路徑/scripts/hook_state.py <角色id>
  UserPromptSubmit → working，任務名＝使用者訊息前 10 字
  Stop / SessionEnd → idle"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    if len(sys.argv) < 2: return
    try: ev = json.load(sys.stdin)
    except Exception: return
    name = ev.get('hook_event_name', '')
    if name == 'UserPromptSubmit':
        task = ' '.join(str(ev.get('prompt', '')).split())[:10] or '處理中'
        args = ['working', task]
    elif name in ('Stop', 'SessionEnd'):
        args = ['idle']
    else:
        return
    subprocess.run([sys.executable, os.path.join(HERE, 'set_state.py'), sys.argv[1], *args], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)

try: main()
except Exception: pass
