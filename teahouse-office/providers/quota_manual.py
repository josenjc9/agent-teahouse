#!/usr/bin/env python3
"""範例 provider ④：額度進度條（自己填數字）。
設定：複製 providers/quota.example.json 成 providers/quota.json，填你的額度項目（名稱、已用、上限、單位、重置時間）。沒設定就顯示「未設定」。
只讀這一個本機檔案：不連網、不讀任何帳號或金鑰。要接真實用量的人，請自己寫 provider 把數字寫進 quota.json 或直接輸出同樣格式。"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
CONF = os.path.join(HERE, 'quota.json')

def main():
    if not os.path.exists(CONF):
        print(json.dumps({'id': 'quota', 'type': 'status', 'title': '額度', 'rows': [{'label': '額度', 'state': 'off', 'detail': '尚未設定（複製 quota.example.json 成 quota.json）'}]}, ensure_ascii=False)); return
    items = []
    for it in json.load(open(CONF, encoding='utf-8')):
        row = {'label': str(it['label']), 'used': float(it['used']), 'limit': float(it['limit'])}
        if it.get('unit'): row['unit'] = str(it['unit'])
        if it.get('resetAt'): row['resetAt'] = str(it['resetAt'])
        items.append(row)
    if not items:
        print(json.dumps({'id': 'quota', 'type': 'status', 'title': '額度', 'rows': [{'label': '額度', 'state': 'off', 'detail': 'quota.json 是空的'}]}, ensure_ascii=False)); return
    print(json.dumps({'id': 'quota', 'type': 'quota', 'title': '額度', 'items': items}, ensure_ascii=False))

main()
