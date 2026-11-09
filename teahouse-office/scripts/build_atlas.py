#!/usr/bin/env python3
"""把生圖拼圖切格、清底霧、統一大小、對齊腳底，打包成 Office 用的圖集（只用 Pillow）。
用法：python3 scripts/build_atlas.py <manifest.json>
manifest 範例（見 references/atlas-manifest.example.json）：
{ "id": "mochi", "raw": "raw/mochi", "out": "app/public/characters",
  "scale_from": "idle_front",
  "sequences": [
    {"name": "idle_front", "file": "idle.png", "cols": 4, "rows": 2, "pick": "row:0"},
    {"name": "idle_back",  "file": "idle.png", "cols": 4, "rows": 2, "pick": "row:1"} ] }
pick：auto（預設，建議）＝自動找出圖裡每個分開的角色，上到下、左到右排序，不用寫 cols／rows；
      auto:a-b＝自動找、只取第 a 到 b 個；可加 "frames": 4 讓數量不對時提醒。
      生圖工具常不照要求的格數排版（實測要 4×1 會給 2×2），所以預設不靠格子。
      照格子切（圖確實是整齊格子時才用，要給 cols／rows）：row:N｜col:N｜all｜cells:a-b（列優先，從 0 起）
規則：全角色用同一個縮放比例（由 scale_from 那組決定），所以坐姿自然比站姿矮、不會變巨人；
      腳底（含坐姿的臀部）對齊畫面底部、水平以身體質心置中；格子 280×260。
名稱慣例：walk_front／walk_back／walk_left、idle_front／idle_back／still_left、work、talk、rest_*。"""
import json, math, os, statistics, sys
from PIL import Image, ImageFilter

FW, FH, BASE_Y, TARGET_H = 280, 260, 250, 205

def clean_haze(im):
    a = im.split()[3]
    core = a.point(lambda v: 255 if v > 110 else 0).filter(ImageFilter.MaxFilter(13))
    im.putalpha(Image.composite(a, Image.new('L', a.size, 0), core)); return im

def keep_main_band(cell, gap=3):
    """相鄰格漏進來的頭頂／腳邊碎片：依列投影只留質量最大的連續帶"""
    a = cell.split()[3].point(lambda v: 255 if v > 40 else 0); w, h = a.size
    rows = [(a.crop((0, y, w, y + 1)).getbbox() is not None) for y in range(h)]
    bands, y = [], 0
    while y < h:
        if rows[y]:
            y0 = last = y
            while y < h and (rows[y] or y - last <= gap):
                if rows[y]: last = y
                y += 1
            bands.append((y0, last + 1))
        else: y += 1
    if len(bands) <= 1: return cell
    def mass(b): return sum(1 for v in a.crop((0, b[0], w, b[1])).getdata() if v)
    best = max(bands, key=mass)
    keep = Image.new('L', (w, h), 0); keep.paste(255, (0, best[0], w, best[1]))
    cell.putalpha(Image.composite(cell.split()[3], Image.new('L', (w, h), 0), keep)); return cell

def cells_of(im, cols, rows, pick):
    cw, ch = im.width / cols, im.height / rows
    allc = [(r, c) for r in range(rows) for c in range(cols)]
    if pick.startswith('row:'): sel = [x for x in allc if x[0] == int(pick[4:])]
    elif pick.startswith('col:'): sel = [x for x in allc if x[1] == int(pick[4:])]
    elif pick.startswith('cells:'):
        a, b = map(int, pick[6:].split('-')); sel = allc[a:b + 1]
    else: sel = allc
    out = []
    for r, c in sel:
        cell = keep_main_band(clean_haze(im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))))
        bb = cell.split()[3].point(lambda v: 255 if v > 40 else 0).getbbox()
        if bb: out.append(cell.crop(bb))
    return out

def figures_auto(im, take=None, expect=None):
    """不靠格子：在透明圖上找出一個個分開的角色（生圖工具常不照格數排版）。
    依列（上到下）再依欄（左到右）排序；take='a-b' 取排序後第 a 到 b 個（從 0 起）。"""
    im = clean_haze(im.copy())
    S = 4  # 縮小 4 倍找輪廓，夠快也夠準
    small = im.split()[3].resize((max(1, im.width // S), max(1, im.height // S)), Image.BILINEAR)
    mask = small.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(5))   # 微膨脹：把頭髮、刀柄等小縫連起來
    w, h = mask.size; px = mask.load(); lab = [[0] * w for _ in range(h)]; comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] and not lab[y][x]:
                n = len(comps) + 1; stack = [(x, y)]; lab[y][x] = n; x0 = x1 = x; y0 = y1 = y; area = 0
                while stack:
                    cx, cy = stack.pop(); area += 1
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not lab[ny][nx]:
                            lab[ny][nx] = n; stack.append((nx, ny))
                comps.append({'n': n, 'area': area, 'box': (x0, y0, x1 + 1, y1 + 1)})
    if not comps: return []
    big = max(c['area'] for c in comps)
    comps = [c for c in comps if c['area'] >= big * 0.15]   # 碎屑不算一個角色
    def solid(img): return img.split()[3].point(lambda v: 255 if v > 40 else 0).getbbox()
    figs = []   # (左, 上, 圖)，座標是原圖的
    for c in comps:
        keep = Image.new('L', (w, h), 0); kp = keep.load()
        x0, y0, x1, y1 = c['box']
        for y in range(y0, y1):
            for x in range(x0, x1):
                if lab[y][x] == c['n']: kp[x, y] = 255
        keep = keep.resize(im.size, Image.NEAREST).filter(ImageFilter.MaxFilter(3))
        fig = im.copy(); fig.putalpha(Image.composite(fig.split()[3], Image.new('L', im.size, 0), keep))
        bb = solid(fig)
        if bb: figs.append((bb[0], bb[1], fig.crop(bb)))
    # 上下兩個角色碰在一起會黏成一個：比一般角色高 1.6 倍以上的，從中段最細的那一列切開
    if len(figs) >= 2:
        hs = sorted(f[2].height for f in figs); typ = hs[len(hs) // 4]
        res = []
        for fx, fy, f in figs:
            if f.height <= typ * 1.6: res.append((fx, fy, f)); continue
            a = f.split()[3].point(lambda v: 255 if v > 40 else 0); W, H = a.size
            mass = [sum(1 for v in a.crop((0, y, W, y + 1)).getdata() if v) for y in range(H)]
            cut = min(range(int(H * .3), int(H * .7)), key=lambda y: mass[y])
            for oy, part in ((0, f.crop((0, 0, W, cut))), (cut, f.crop((0, cut, W, H)))):
                bb = solid(part)
                if bb: res.append((fx + bb[0], fy + oy + bb[1], part.crop(bb)))
        figs = res
    # 左右兩個角色的手或頭髮碰在一起也會黏成一個：依寬度比例在最細的欄切開
    def split_w(fx, fy, f, k):
        k = max(2, min(k, 6))
        a = f.split()[3].point(lambda v: 255 if v > 40 else 0); W, H = a.size
        col = [sum(1 for v in a.crop((x, 0, x + 1, H)).getdata() if v) for x in range(W)]
        cuts = [0]
        for j in range(1, k):
            ideal, span = j * W / k, 0.35 * W / k
            cuts.append(min(range(int(ideal - span), int(ideal + span) + 1), key=lambda x: col[min(max(x, 0), W - 1)]))
        cuts.append(W)
        out_ = []
        for c0, c1 in zip(cuts, cuts[1:]):
            part = f.crop((c0, 0, c1, H)); bb = solid(part)
            if bb: out_.append((fx + c0 + bb[0], fy + bb[1], part.crop(bb)))
        return out_
    if len(figs) >= 3:   # 比一般角色寬 1.6 倍以上的，視為黏在一起
        typ_w = statistics.median(f[2].width for f in figs); res = []
        for fx, fy, f in figs:
            k = round(f.width / typ_w)
            res += split_w(fx, fy, f, k) if (f.width > typ_w * 1.6 and k >= 2) else [(fx, fy, f)]
        figs = res
    while expect and 0 < len(figs) < expect:   # 已知該有幾個：不夠就把最寬的那個切開
        i = max(range(len(figs)), key=lambda i: figs[i][2].width)
        fx, fy, f = figs.pop(i)
        parts = split_w(fx, fy, f, expect - len(figs))
        if len(parts) < 2: figs.insert(i, (fx, fy, f)); break
        figs += parts
    # 分列：垂直中心相差不到半個角色高算同一列；列內由左到右
    figs.sort(key=lambda f: f[1] + f[2].height / 2)
    rows, med_h = [], statistics.median(f[2].height for f in figs)
    for f in figs:
        cy = f[1] + f[2].height / 2
        if rows and abs(cy - rows[-1][0]) < med_h / 2: rows[-1][1].append(f)
        else: rows.append([cy, [f]])
    ordered = [f[2] for _, r in rows for f in sorted(r, key=lambda f: f[0])]
    if take:
        a, b = map(int, take.split('-')); ordered = ordered[a:b + 1]
    return ordered

def head_w(fr):
    """頭寬：角色最上面 22% 的寬度（Q 版頭最寬，手臂通常不在這一段）"""
    a = fr.split()[3].point(lambda v: 255 if v > 40 else 0)
    bb = a.crop((0, 0, fr.width, max(1, int(fr.height * .22)))).getbbox()
    return (bb[2] - bb[0]) if bb else fr.width

def centroid_x(fr):
    a = fr.split()[3]; w, h = a.size
    band = a.crop((0, int(h * .3), w, int(h * .7))); px = band.load(); tot = sx = 0
    for y in range(band.height):
        for x in range(band.width):
            v = px[x, y]
            if v: tot += v; sx += v * x
    return sx / tot if tot else w / 2

def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    mpath = os.path.abspath(sys.argv[1]); base = os.path.dirname(mpath)
    m = json.load(open(mpath, encoding='utf-8'))
    raw = os.path.join(base, m.get('raw', '.')); out = os.path.join(base, m.get('out', '.'), m['id'])
    os.makedirs(out, exist_ok=True)
    sheets, seqs = {}, {}
    for s in m['sequences']:
        f = os.path.join(raw, s['file'])
        if f not in sheets: sheets[f] = Image.open(f).convert('RGBA')
        pick = s.get('pick', 'auto' if 'cols' not in s else 'all')
        if pick == 'auto' or pick.startswith('auto:'):
            cs = figures_auto(sheets[f], pick[5:] or None, s.get('frames'))
        else:
            cs = cells_of(sheets[f], s['cols'], s['rows'], pick)
        if not cs: print('⚠️ 沒切出任何角色：', s['name']); continue
        if s.get('frames') and len(cs) != s['frames']:
            print(f'⚠️ {s["name"]}：預期 {s["frames"]} 格，實際找到 {len(cs)} 個角色（{s["file"]}）。圖裡角色黏在一起或多出碎片時會這樣，請看一下圖')
        seqs[s['name']] = cs
    ref = m.get('scale_from') or next(iter(seqs))
    if ref not in seqs: sys.exit(f'scale_from「{ref}」不存在')
    k = TARGET_H / statistics.median(c.height for c in seqs[ref])
    # 每張圖是分開生的，角色畫多大每張都不同，所以每組各自縮放：
    #   站姿（預設）→ 身高對齊 TARGET_H；坐姿（work，或 manifest 寫 "seated": true）→ 頭寬對齊站姿的頭寬
    #   同一張圖裡的多組（舊的格子拼圖）共用同一個比例，維持原本坐比站矮的關係
    seated = {s['name'] for s in m['sequences'] if s.get('seated') or s['name'] == 'work'}
    by_file = {}
    for s in m['sequences']: by_file.setdefault(s['file'], []).append(s['name'])
    head_ref = statistics.median(head_w(c) for c in seqs[ref]) * k
    scale = {}
    for name, cs in seqs.items():
        f = next(s['file'] for s in m['sequences'] if s['name'] == name)
        if len(by_file[f]) > 1 and ref in by_file[f]: scale[name] = k
        elif name in seated: scale[name] = head_ref / statistics.median(head_w(c) for c in cs)
        else: scale[name] = TARGET_H / statistics.median(c.height for c in cs)
    meta = {'frame': [FW, FH], 'seq': {}, 'rest': [], 'side': []}
    for name, cs in seqs.items():
        frames = []; k = scale[name]
        for c in cs:
            s = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
            if s.width > FW or s.height > FH - 10: print(f'⚠️ {name} 有一格放大後超出 {FW}×{FH}（{s.width}×{s.height}），可能被切到')
            can = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
            can.alpha_composite(s, (round(FW / 2 - centroid_x(s)), BASE_Y - s.height)); frames.append(can)
        n = len(frames); cols = min(n, 8); rows = math.ceil(n / cols)
        sheet = Image.new('RGBA', (FW * cols, FH * rows), (0, 0, 0, 0))
        for i, fr in enumerate(frames): sheet.paste(fr, ((i % cols) * FW, (i // cols) * FH))
        sheet.save(os.path.join(out, name + '.png'))
        meta['seq'][name] = {'cols': cols, 'rows': rows, 'count': n}
        if name.startswith('rest_'): meta['rest'].append(name)
        if name in ('still_left', 'walk_left') or name.endswith('_left'): meta['side'].append(name)
    if 'work' in meta['seq']: meta['work'] = 'work'
    if 'talk' in meta['seq']: meta['talk'] = 'talk'
    meta['side'] = sorted(set(meta['side'] + m.get('side', [])))
    json.dump(meta, open(os.path.join(out, 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    need = ['idle_front', 'idle_back', 'still_left', 'walk_front', 'walk_back', 'walk_left', 'work']
    miss = [n for n in need if n not in meta['seq']]
    print(f'✅ 已輸出 {len(meta["seq"])} 組動作到 {out}')
    if miss: print('⚠️ 缺少必備動作：' + '、'.join(miss) + '。缺的動作會讓角色在對應狀態下顯示不出來，請補圖後重跑')

if __name__ == '__main__': main()
