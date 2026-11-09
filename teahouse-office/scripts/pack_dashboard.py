#!/usr/bin/env python3
"""把儀表板單獨打包成 teahouse-dashboard 資料夾（不含 3D、角色、場景），給只想要儀表板的人。只用標準庫。
用法：python3 scripts/pack_dashboard.py <輸出資料夾>   （資料夾必須不存在或是空的）
打包後：cd <輸出>/app && npm install && npm run dev → 開 http://127.0.0.1:5180/"""
import json, os, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def cp(src, dst):
    s, d = os.path.join(ROOT, src), os.path.join(OUT, dst)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    if os.path.isdir(s):
        shutil.copytree(s, d, ignore=shutil.ignore_patterns('__pycache__', 'services.json', '*.pyc'))
    else:
        shutil.copy2(s, d)


def write(rel, text):
    with open(os.path.join(OUT, rel), 'w', encoding='utf-8') as f:
        f.write(text)


if len(sys.argv) != 2:
    sys.exit(__doc__)
OUT = os.path.abspath(sys.argv[1])
if os.path.exists(OUT) and os.listdir(OUT):
    sys.exit(f'{OUT} 不是空資料夾，請換一個')
os.makedirs(OUT, exist_ok=True)

for f in ('providers', 'schemas', 'tests/dashboard', 'app/src/dashboard'):
    cp(f, f)
for f in ('build_dashboard.py', 'check_dashboard.py', 'scan_private.py'):
    cp('scripts/' + f, 'scripts/' + f)
for f in ('SKILL.md', 'README.md', 'SECURITY.md'):
    cp('packaging/dashboard/' + f, f)
for f in ('app/public/data/dashboard.json', 'app/public/data/board.md', 'app/tsconfig.json', '.gitignore'):
    cp(f, f)

# 接入說明：路徑改成單獨版
doc = open(os.path.join(ROOT, '接入說明-儀表板.md'), encoding='utf-8').read()
doc = (doc.replace('http://127.0.0.1:5180/dashboard.html（單獨儀表板），或 Office 上方的「儀表板」分頁', 'http://127.0.0.1:5180/')
          .replace('/你的路徑/teahouse-office', '/你的路徑/teahouse-dashboard'))
write('接入說明-儀表板.md', doc)

pkg = json.load(open(os.path.join(ROOT, 'app', 'package.json'), encoding='utf-8'))
pkg['name'] = 'teahouse-dashboard-app'
pkg['dependencies'] = {k: v for k, v in pkg['dependencies'].items() if k in ('react', 'react-dom')}
pkg['devDependencies'].pop('@types/three', None)
write('app/package.json', json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
write('app/vite.config.ts', "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()] })\n")
shutil.copy2(os.path.join(ROOT, 'app', 'dashboard.html'), os.path.join(OUT, 'app', 'index.html'))   # 單獨版入口＝index.html
print(f'已打包到 {OUT}（記得在 app/ 執行 npm install --package-lock-only 產生鎖定檔）')
