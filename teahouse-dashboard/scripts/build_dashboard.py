#!/usr/bin/env python3
"""合併所有 provider，產生 app/public/data/dashboard.json（只用標準庫）。
用法：python3 scripts/build_dashboard.py [--title "我的儀表板"] [--out 路徑] [--providers 資料夾]
  - 執行 providers/ 底下每支 *.py（檔名以 _ 開頭的略過），每支限時 20 秒，stdout 要印一個區塊或一串區塊的 JSON
  - 某支 provider 失敗、逾時、輸出不合契約：不會讓整份壞掉，而是在儀表板放一個「資料源失敗」的醒目區塊，其餘照常
  - 自動加上「整體判讀」橫幅（有異常→bad，有注意→warn，否則 ok）與 updatedAt
  - 寫入前會跑契約檢查，通過才原子替換檔案（頁面不會讀到寫一半的檔）"""
import argparse, datetime, glob, importlib.util, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('check_dashboard', os.path.join(HERE, 'check_dashboard.py'))
chk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chk)


def run(path):
    """執行一支 provider，回傳 (合格的區塊, 錯誤說明或 None)。"""
    try:
        r = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=20, cwd=os.path.dirname(path))
    except subprocess.TimeoutExpired:
        return [], '執行超過 20 秒'
    if r.returncode != 0:
        return [], '執行失敗：' + (r.stderr.strip().splitlines() or ['沒有錯誤訊息'])[-1][:160]
    try:
        out = json.loads(r.stdout)
    except Exception:
        return [], '輸出不是有效的 JSON'
    blocks = out if isinstance(out, list) else [out]
    good, errs = [], []
    for i, b in enumerate(blocks):
        e, w = [], []
        chk.block(b, f'[{i}]', e, w)
        if e:
            errs.extend(e)
        else:
            good.append(b)
    return good, ('；'.join(errs[:3]) if errs else None)


def verdict(blocks):
    bad = warn = off = 0
    for b in blocks:
        if b['type'] == 'status':
            off += sum(r['state'] == 'off' for r in b['rows'])
            bad += sum(r['state'] == 'bad' for r in b['rows'])
            warn += sum(r['state'] == 'warn' for r in b['rows'])
        elif b['type'] == 'alerts':
            bad += sum(r['level'] == 'bad' for r in b['items'])
            warn += sum(r['level'] == 'warn' for r in b['items'])
    if bad:
        return {'tone': 'bad', 'headline': f'有 {bad} 項異常', 'detail': '往下看標紅色的項目。'}
    if warn:
        return {'tone': 'warn', 'headline': f'大致正常，有 {warn} 項要留意', 'detail': '往下看標黃色的項目。'}
    if off:
        return {'tone': 'ok', 'headline': f'已連線的項目都正常（{off} 項未設定或未連線）', 'detail': '未設定的項目沒有被檢查，不代表正常。'}
    return {'tone': 'ok', 'headline': '一切正常', 'detail': '所有檢查都通過。'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--title', default='我的儀表板')
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'app', 'public', 'data', 'dashboard.json'))
    ap.add_argument('--providers', default=os.path.join(HERE, '..', 'providers'))
    a = ap.parse_args()
    files = sorted(f for f in glob.glob(os.path.join(a.providers, '*.py')) if not os.path.basename(f).startswith('_'))
    if not files:
        sys.exit(f'{a.providers} 底下沒有 provider（*.py）')
    blocks, failed, used = [], [], set()
    for f in files:
        name = os.path.basename(f)
        got, err = run(f)
        if err:
            failed.append(name)
            blocks.append({'id': f'failed-{name[:-3]}', 'type': 'alerts', 'title': f'資料源「{name}」',
                           'items': [{'level': 'bad', 'text': f'這個資料源沒有產出可用的資料：{err}', 'action': f'單獨執行 python3 providers/{name} 看錯誤'}]})
        for b in got:
            base, n = b['id'], 2
            while b['id'] in used:
                b['id'] = f'{base}-{n}'
                n += 1
            used.add(b['id'])
            blocks.append(b)
    v = verdict(blocks)
    doc = {'version': 1, 'title': a.title, 'updatedAt': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
           'blocks': [{'id': 'verdict', 'type': 'verdict', 'title': '整體判讀', **v}] + blocks}
    fd, tmp = tempfile.mkstemp(suffix='.json')
    with os.fdopen(fd, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
    e, w = chk.check(tmp)
    os.unlink(tmp)
    if e:
        print('合併後的檔案沒通過契約檢查，沒有寫入：')
        for x in e:
            print('  ❌', x)
        sys.exit(1)
    out = os.path.abspath(a.out)
    fd, t2 = tempfile.mkstemp(dir=os.path.dirname(out), suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
    os.replace(t2, out)   # 原子替換
    print(f'已寫入 {out}：{len(blocks)} 個區塊（{len(files)} 個資料源' + (f'，失敗：{", ".join(failed)}' if failed else '') + '）')
    for x in w:
        print('  ⚠️', x)


main()
