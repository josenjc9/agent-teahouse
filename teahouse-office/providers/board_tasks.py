#!/usr/bin/env python3
"""範例 provider ①：讀任務看板（app/public/data/board.md），輸出「數字卡＋每人任務表」。
Provider 契約：stdout 印一個區塊（物件）或一串區塊（陣列）的 JSON，格式見 schemas/dashboard.schema.json。
只讀本機檔案、不需要任何憑證。"""
import json, os, re, sys

BOARD = os.environ.get('TEAHOUSE_BOARD') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'public', 'data', 'board.md')

def parse(path):
    cols, cur = {}, None
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        m = re.match(r'^##\s+(.+?)\s*$', line)
        if m: cur = m.group(1); cols[cur] = []; continue
        m = re.match(r'^[-*]\s+(.+?)\s*$', line)
        if m and cur is not None:
            text = m.group(1); who = ''
            o = re.search(r'\s@(\S+)\s*$', text)
            if o: who = o.group(1); text = text[:o.start()].strip()
            cols[cur].append((text, who))
    return cols

def main():
    if not os.path.exists(BOARD):
        print(json.dumps({'id': 'board-tasks', 'type': 'status', 'title': '任務看板', 'rows': [{'label': '任務看板', 'state': 'off', 'detail': f'找不到 {os.path.basename(BOARD)}'}]}, ensure_ascii=False)); return
    cols = parse(BOARD)
    if not any(cols.values()):
        print(json.dumps({'id': 'board-tasks', 'type': 'status', 'title': '任務看板', 'rows': [{'label': '任務看板', 'state': 'off', 'detail': '看板是空的'}]}, ensure_ascii=False)); return
    stat = {'id': 'board-counts', 'type': 'stat', 'title': '任務看板', 'items': [
        {'label': name, 'value': len(items), 'unit': '件', **({'detail': [t + (f' @{w}' if w else '') for t, w in items[:8]]} if items else {})}
        for name, items in cols.items()]}
    owners = sorted({w for items in cols.values() for _, w in items if w})
    names = list(cols)
    table = {'id': 'board-people', 'type': 'table', 'title': '每個人手上的任務',
             'columns': [{'key': 'who', 'label': '誰'}] + [{'key': f'c{i}', 'label': n, 'align': 'right'} for i, n in enumerate(names)],
             'rows': [{'who': o, **{f'c{i}': sum(1 for _, w in cols[n] if w == o) for i, n in enumerate(names)}} for o in owners]}
    print(json.dumps([stat] + ([table] if owners else []), ensure_ascii=False))

main()
