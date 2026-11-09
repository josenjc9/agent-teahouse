#!/usr/bin/env python3
"""檢查 dashboard.json 符合資料契約 v1（只用標準庫）。規則與頁面（app/src/dashboard/validate.ts）一致。
用法：python3 scripts/check_dashboard.py [檔案]    預設檢查 app/public/data/dashboard.json
結果：有錯誤 exit 1；只有警告 exit 0。"""
import json, os, sys, datetime, math

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT = os.path.join(HERE, '..', 'app', 'public', 'data', 'dashboard.json')
TONES = ('ok', 'warn', 'bad')
KNOWN = {'verdict': {'id','type','title','tone','headline','detail'}, 'stat': {'id','type','title','items'}, 'trend': {'id','type','title','kind','unit','series'},
         'table': {'id','type','title','columns','rows'}, 'status': {'id','type','title','rows'}, 'alerts': {'id','type','title','items'}}

def s_(v): return isinstance(v, str) and v.strip() != ''
def n_(v): return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
def o_(v): return isinstance(v, dict)

def block(b, at, e, w):
    if not o_(b): e.append(f'{at}：區塊必須是物件'); return
    if not s_(b.get('id')): e.append(f'{at}.id：必須是非空字串')
    if not s_(b.get('title')): e.append(f'{at}.title：必須是非空字串')
    t = b.get('type')
    def arr(k, mn=1):
        a = b.get(k)
        if not isinstance(a, list) or len(a) < mn: e.append(f'{at}.{k}：必須是至少 {mn} 筆的陣列'); return []
        return a
    if t in KNOWN:
        extra = set(b) - KNOWN[t]
        if extra: w.append(f'{at}：多出不會被使用的欄位 {sorted(extra)}')
    if t == 'verdict':
        if b.get('tone') not in TONES: e.append(f'{at}.tone：必須是 ok／warn／bad')
        if not s_(b.get('headline')): e.append(f'{at}.headline：必須是非空字串')
    elif t == 'stat':
        for i, it in enumerate(arr('items')):
            p = f'{at}.items[{i}]'
            if not o_(it): e.append(f'{p}：必須是物件'); continue
            if not s_(it.get('label')): e.append(f'{p}.label：必須是非空字串')
            if not n_(it.get('value')): e.append(f'{p}.value：必須是數字（現在是 {json.dumps(it.get("value"), ensure_ascii=False)}）')
            d = it.get('detail')
            if d is not None and not (isinstance(d, list) and all(s_(x) for x in d)): e.append(f'{p}.detail：必須是字串陣列')
    elif t == 'trend':
        if b.get('kind') not in ('line', 'bar'): e.append(f'{at}.kind：必須是 line 或 bar')
        ser = arr('series')
        if len(ser) > 3: e.append(f'{at}.series：最多 3 條（超過請分圖或合併成「其他」）')
        for i, se in enumerate(ser):
            p = f'{at}.series[{i}]'
            if not o_(se) or not s_(se.get('name')): e.append(f'{p}.name：必須是非空字串'); continue
            pts = se.get('points'); need = 2 if b.get('kind') == 'line' else 1
            if not isinstance(pts, list) or len(pts) < need: e.append(f'{p}.points：{"折線至少 2 點" if need == 2 else "至少 1 點"}'); continue
            for j, pt in enumerate(pts):
                if not o_(pt) or not s_(pt.get('x')): e.append(f'{p}.points[{j}].x：必須是非空字串')
                elif not n_(pt.get('y')): e.append(f'{p}.points[{j}].y：必須是數字（現在是 {json.dumps(pt.get("y"), ensure_ascii=False)}）')
        lens = {len(se['points']) for se in ser if o_(se) and isinstance(se.get('points'), list)}
        if len(lens) > 1: w.append(f'{at}：各系列點數不同 {sorted(lens)}，圖表以第一條的 x 軸為準')
    elif t == 'table':
        cols, rows = arr('columns'), arr('rows', 0)
        keys = [c.get('key') if o_(c) else None for c in cols]
        for i, c in enumerate(cols):
            if not (o_(c) and s_(c.get('key')) and s_(c.get('label'))): e.append(f'{at}.columns[{i}]：需要 key 與 label')
        for i, r in enumerate(rows):
            if not o_(r): e.append(f'{at}.rows[{i}]：必須是物件'); continue
            for k in keys:
                if isinstance(k, str) and k not in r: e.append(f'{at}.rows[{i}]：缺少欄位「{k}」')
            for k, v in r.items():
                if not (v is None or isinstance(v, str) or n_(v)): e.append(f'{at}.rows[{i}].{k}：只能是字串、數字或 null')
    elif t == 'status':
        for i, r in enumerate(arr('rows')):
            if not o_(r) or not s_(r.get('label')): e.append(f'{at}.rows[{i}].label：必須是非空字串'); continue
            if r.get('state') not in TONES + ('off',): e.append(f'{at}.rows[{i}].state：必須是 ok／warn／bad／off')
    elif t == 'alerts':
        for i, r in enumerate(arr('items', 0)):
            if not o_(r) or not s_(r.get('text')): e.append(f'{at}.items[{i}].text：必須是非空字串'); continue
            if r.get('level') not in ('info', 'warn', 'bad'): e.append(f'{at}.items[{i}].level：必須是 info／warn／bad')
    else:
        e.append(f'{at}.type：不認得「{t}」，可用 verdict／stat／trend／table／status／alerts')

def check(path):
    e, w = [], []
    try: raw = json.load(open(path, encoding='utf-8'))
    except FileNotFoundError: return [f'找不到檔案：{path}'], []
    except Exception as x: return [f'不是有效的 JSON：{x}'], []
    if not o_(raw): return ['整份檔案必須是 JSON 物件'], []
    if raw.get('version') != 1: e.append(f'version：必須是 1（現在是 {json.dumps(raw.get("version"))}）')
    if not s_(raw.get('title')): e.append('title：必須是非空字串')
    bl = raw.get('blocks')
    if not isinstance(bl, list) or not bl: e.append('blocks：必須是至少 1 個區塊的陣列')
    ts = raw.get('updatedAt')
    if ts is not None:
        try: when = datetime.datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
        except Exception: when = None; e.append('updatedAt：不是有效的日期時間（用 ISO 格式，如 2026-01-01T09:00:00+08:00）')
        if when and not raw.get('demo'):
            now = datetime.datetime.now(when.tzinfo) if when.tzinfo else datetime.datetime.now()
            if (now - when).total_seconds() > 86400: w.append('updatedAt：資料超過 24 小時沒更新，頁面會標示「資料偏舊」')
    elif not raw.get('demo'): w.append('沒有 updatedAt：頁面無法顯示資料新舊，建議 provider 一律寫入')
    if isinstance(bl, list):
        seen = set()
        for i, b in enumerate(bl):
            block(b, f'blocks[{i}]', e, w)
            if o_(b) and s_(b.get('id')):
                if b['id'] in seen: e.append(f'blocks[{i}].id：「{b["id"]}」重複')
                seen.add(b['id'])
    return e, w

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
    e, w = check(path)
    for x in e: print('❌', x)
    for x in w: print('⚠️ ', x)
    print(f'\n{len(e)} 個錯誤、{len(w)} 個警告' + ('；通過' if not e else '；請修正後再用'))
    sys.exit(1 if e else 0)
