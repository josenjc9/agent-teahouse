#!/usr/bin/env python3
"""範例 provider ③：檢查你列出的網址有沒有回應（狀態清單）。
設定：複製 providers/services.example.json 成 providers/services.json，填你要檢查的網址。沒設定就顯示「未設定」。
只對你列的網址發 GET 請求、逾時 5 秒；不送任何憑證。"""
import json, os, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
CONF = os.path.join(HERE, 'services.json')

def probe(url):
    t = time.time()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'teahouse-dashboard'})
        with urllib.request.urlopen(req, timeout=5) as r: code = r.status
    except urllib.error.HTTPError as e: code = e.code
    except Exception as e: return 'bad', f'連不上（{type(e).__name__}）'
    ms = int((time.time() - t) * 1000)
    if code < 400: return ('ok' if ms < 2000 else 'warn'), f'{code} · {ms} ms'
    return 'bad', f'HTTP {code}'

def main():
    if not os.path.exists(CONF):
        rows = [{'label': '服務檢查', 'state': 'off', 'detail': '尚未設定（複製 services.example.json 成 services.json）'}]
    else:
        items = json.load(open(CONF, encoding='utf-8'))
        rows = []
        for it in items:
            st, detail = probe(it['url'])
            rows.append({'label': it.get('name') or it['url'], 'state': st, 'detail': detail})
        if not rows: rows = [{'label': '服務檢查', 'state': 'off', 'detail': 'services.json 是空的'}]
    print(json.dumps({'id': 'services', 'type': 'status', 'title': '服務連線', 'rows': rows}, ensure_ascii=False))

main()
