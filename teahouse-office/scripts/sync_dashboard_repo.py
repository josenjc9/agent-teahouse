#!/usr/bin/env python3
"""把儀表板打包並同步到「獨立的儀表板 repo」資料夾。只用標準庫，不會自動 commit 或 push。

用法：python3 scripts/sync_dashboard_repo.py <儀表板 repo 的本機資料夾>

做的事（任何一步失敗就停，不動目標資料夾）：
  1. 用 pack_dashboard.py 打包到暫存資料夾
  2. 去識別化掃描打包結果（scan_private.py，命中 0 才繼續）
  3. 資料契約檢查：good.json 要通過、所有 bad-*.json 都要被擋下
  4. 同步到目標資料夾：覆蓋打包產出的檔案，刪掉目標裡「打包已不再產生」的檔案
     不動的：.git、node_modules、LICENSE、.github、docs、app/package-lock.json
  5. 印出 git 變更摘要，請你看過再自己 commit 與 push
"""
import os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KEEP = {'.git', 'node_modules', 'LICENSE', '.github', 'docs', 'package-lock.json'}   # 目標資料夾裡自己的東西


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def die(msg):
    print('✖', msg); sys.exit(1)


if len(sys.argv) != 2:
    sys.exit(__doc__)
target = os.path.abspath(sys.argv[1])
if not os.path.isdir(os.path.join(target, '.git')):
    die(f'{target} 不是 git 資料夾（要給儀表板 repo 的本機 clone）')

tmp = tempfile.mkdtemp(prefix='dash_pack_')
out = os.path.join(tmp, 'pack')
try:
    r = run([sys.executable, '-I', os.path.join(HERE, 'pack_dashboard.py'), out])
    if r.returncode: die('打包失敗：' + (r.stderr or r.stdout)[-300:])
    print('✓ 1/4 打包完成')

    r = run([sys.executable, '-I', os.path.join(out, 'scripts', 'scan_private.py'), '--root', out])
    if r.returncode: die('去識別化掃描有命中，先處理再同步：\n' + r.stdout[-800:])
    print('✓ 2/4 去識別化掃描 0 命中')

    chk = os.path.join(out, 'scripts', 'check_dashboard.py')
    tdir = os.path.join(out, 'tests', 'dashboard')
    if run([sys.executable, '-I', chk, os.path.join(tdir, 'good.json')]).returncode:
        die('good.json 沒通過資料契約檢查')
    bad = sorted(f for f in os.listdir(tdir) if f.startswith('bad-'))
    for f in bad:
        if run([sys.executable, '-I', chk, os.path.join(tdir, f)]).returncode == 0:
            die(f'{f} 應該被擋下卻通過了')
    print(f'✓ 3/4 資料契約檢查：good 通過、{len(bad)} 個壞檔全部擋下')

    def listing(root):
        res = set()
        for dp, dn, fn in os.walk(root):
            rel = os.path.relpath(dp, root)
            top = rel.split(os.sep)[0] if rel != '.' else ''
            dn[:] = [d for d in dn if d not in KEEP and d != '__pycache__']
            for f in fn:
                if f in KEEP and rel == '.': continue
                if f == 'package-lock.json': continue
                res.add(os.path.normpath(os.path.join(rel, f)))
        return res
    new, old = listing(out), listing(target)
    for rel in sorted(old - new):
        os.remove(os.path.join(target, rel))
    for rel in sorted(new):
        dst = os.path.join(target, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(out, rel), dst)
    print(f'✓ 4/4 已同步：更新 {len(new)} 個檔案，移除 {len(old - new)} 個舊檔')
    print('\n--- git 變更摘要（請看過再自己 commit、push）---')
    print(run(['git', '-C', target, 'status', '--short']).stdout or '（沒有變更：兩邊已經一致）')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
