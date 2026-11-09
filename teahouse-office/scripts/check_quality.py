#!/usr/bin/env python3
"""自動檢查渲染質感管線是否都在（只讀、只用標準庫）。
通過只代表「設定都在」，不代表畫面好看：還要跑真實截圖並排比對（見 references/quality-standard.md）。
用法：python3 scripts/check_quality.py"""
import os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'src', 'presets')
fails = []

def need(label, ok):
    print(('✅ ' if ok else '❌ ') + label)
    if not ok: fails.append(label)

def read(p):
    try: return open(p, encoding='utf-8').read()
    except Exception: return ''

CORE = os.path.join(ROOT, '..', 'core')
st = read(os.path.join(CORE, 'Stage.tsx'))
print('[共用舞台 core/Stage.tsx]')
need('柔陰影（shadows="soft"）', 'shadows="soft"' in st)
need('主光投影（castShadow）', 'castShadow' in st)
need('ACES 色調映射', 'ACES_FILMIC' in st)
need('泛光 Bloom', '<Bloom' in st)
need('暗角 Vignette', '<Vignette' in st)
need('天空（自訂漸層）', 'ShaderMaterial' in st and 'uTop' in st)
need('環境光（Environment）', '<Environment' in st)
need('霧（fog）', '<fog' in st)
need('半球光', 'hemisphereLight' in st)

presets = [d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d))] if os.path.isdir(ROOT) else []
need('找到至少一個場景預設', bool(presets))
for pr in presets:
    d = os.path.join(ROOT, pr); tod = read(os.path.join(d, 'tod.ts'))
    print(f'\n[{pr}]')
    need('有 index.tsx（Preset 介面）', os.path.exists(os.path.join(d, 'index.tsx')))
    for t in ('dusk', 'day', 'night'):
        m = re.search(r'\b' + t + r':\s*\{(.*?)\n  \},', tod, re.S)
        ok = bool(m) and all(k in m.group(1) for k in ('sky', 'sunColor', 'hemi', 'fog', 'bloom', 'glow', 'cloud'))
        need(f'時段「{t}」設定完整（天空／光／霧／泛光／發光／雲）', ok)
print('\n[角色]')
ch = read(os.path.join(ROOT, '..', 'Character.tsx'))
need('角色精靈：不被色調映射洗掉（toneMapped={false}）', 'toneMapped={false}' in ch)
need('角色精靈：腳底接觸影', 'circleGeometry' in ch)
print()
if fails:
    print(f'未通過 {len(fails)} 項；補齊後再做截圖比對。'); sys.exit(1)
print('設定檢查通過。下一步：截白天／黃昏／夜晚三張圖並排比對。')
