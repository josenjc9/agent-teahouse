#!/usr/bin/env python3
"""範例 provider ②：本機 git repo 近 7 天每天提交數（長條圖）。只讀、不連網、不需憑證。
設定：環境變數 TEAHOUSE_REPOS＝repo 路徑，多個用冒號分隔；沒設就看「這個套件所在的 git repo」（若有）。"""
import datetime, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))

def repos():
    env = os.environ.get('TEAHOUSE_REPOS', '').strip()
    paths = [p for p in env.split(':') if p] if env else [os.path.join(HERE, '..')]
    out = []
    for p in paths:
        r = subprocess.run(['git', '-C', p, 'rev-parse', '--show-toplevel'], capture_output=True, text=True)
        if r.returncode == 0: out.append(r.stdout.strip())
    return sorted(set(out))

def main():
    rs = repos()
    if not rs:
        print(json.dumps({'id': 'git-activity', 'type': 'status', 'title': '程式提交', 'rows': [{'label': '本機 git repo', 'state': 'off', 'detail': '找不到 repo（用環境變數 TEAHOUSE_REPOS 指定路徑）'}]}, ensure_ascii=False)); return
    today = datetime.date.today()
    days = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
    series = []
    for r in rs[:3]:
        cnt = {d: 0 for d in days}
        o = subprocess.run(['git', '-C', r, 'log', '--since', f'{days[0]} 00:00', '--pretty=%ad', '--date=short'], capture_output=True, text=True)
        for line in o.stdout.split():
            try: d = datetime.date.fromisoformat(line)
            except ValueError: continue
            if d in cnt: cnt[d] += 1
        series.append({'name': os.path.basename(r) or r, 'points': [{'x': f'{d.month}/{d.day}', 'y': cnt[d]} for d in days]})
    print(json.dumps({'id': 'git-activity', 'type': 'trend', 'title': '近 7 天程式提交', 'kind': 'bar', 'unit': '次', 'series': series}, ensure_ascii=False))

main()
