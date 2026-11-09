#!/usr/bin/env python3
"""推送角色狀態（任何 agent 或人手動都能呼叫；只用 Python 標準庫，不用裝東西）。
用法：python3 scripts/set_state.py <角色id> <working|idle|rest> ["任務名稱，建議 10 字內"]
例：  python3 scripts/set_state.py mochi working "整理本週排程"
      python3 scripts/set_state.py mochi idle
Office 頁面每 2 秒讀一次 app/public/data/state.json。"""
import json, os, sys, tempfile, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, '..', 'app', 'public', 'data', 'state.json')
CHARS = os.path.join(HERE, '..', 'app', 'public', 'characters', 'index.json')
OK = ('working', 'idle', 'rest')

def main():
    if len(sys.argv) < 3 or sys.argv[2] not in OK:
        sys.exit(__doc__)
    who, status = sys.argv[1], sys.argv[2]
    task = sys.argv[3] if len(sys.argv) > 3 else ''
    ids = [c['id'] for c in json.load(open(CHARS, encoding='utf-8'))]
    if who not in ids:
        sys.exit(f'沒有這個角色「{who}」。可用：{", ".join(ids)}')
    try: data = json.load(open(STATE, encoding='utf-8'))
    except Exception: data = {'characters': {}}
    data.setdefault('characters', {})[who] = {'status': status, 'task': task}
    data['updatedAt'] = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(STATE), suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE)   # 原子替換，頁面不會讀到寫一半的檔
    print(f'{who} → {status} {task}'.strip())

if __name__ == '__main__': main()
