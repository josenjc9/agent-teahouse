#!/usr/bin/env python3
"""純色背景去背（只用 Pillow，不用裝其他東西、Mac／Windows／Linux 都能跑）。
生圖工具出不了真透明底時：提示詞要求「純綠色 #00ff00 或純白色背景」→ 用這支轉成透明 PNG。
用法：python3 scripts/remove_bg.py 輸入.png 輸出.png [--bg #00ff00] [--tol 48]
  --bg  背景色；不給就取四個角落的中位色
  --tol 顏色容許差（預設 48）；背景有漸層或雜訊就調高，會吃到角色就調低
限制：只處理「單一純色」背景、從外框往內填；角色身上有跟背景同色的區塊（例如綠色衣服配綠幕）會被挖掉，所以綠幕請避免綠色角色，改用白底。"""
import sys
from PIL import Image, ImageDraw, ImageFilter

def parse(argv):
    a = {'bg': None, 'tol': 48}; pos = []; i = 0
    while i < len(argv):
        if argv[i] == '--bg': a['bg'] = argv[i + 1]; i += 2
        elif argv[i] == '--tol': a['tol'] = int(argv[i + 1]); i += 2
        else: pos.append(argv[i]); i += 1
    return pos, a

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def main():
    pos, a = parse(sys.argv[1:])
    if len(pos) != 2: sys.exit(__doc__)
    im = Image.open(pos[0]).convert('RGBA'); w, h = im.size
    px = im.load()
    if a['bg']: bg = hexrgb(a['bg'])
    else:
        cs = [px[2, 2][:3], px[w - 3, 2][:3], px[2, h - 3][:3], px[w - 3, h - 3][:3]]
        bg = tuple(sorted(c[k] for c in cs)[1] for k in range(3))
    tol = a['tol']
    dist = lambda c: max(abs(c[0] - bg[0]), abs(c[1] - bg[1]), abs(c[2] - bg[2]))
    mark = (1, 2, 3, 0)       # 填色用的暗號（alpha=0）
    work = im.copy()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x in range(0, w, 24): seeds += [(x, 0), (x, h - 1)]
    for y in range(0, h, 24): seeds += [(0, y), (w - 1, y)]
    for sx, sy in seeds:
        if work.getpixel((sx, sy))[3] != 0 and dist(work.getpixel((sx, sy))) <= tol:
            ImageDraw.floodfill(work, (sx, sy), mark, thresh=tol)
    alpha = work.split()[3]
    # 邊緣羽化：縮 1 像素再輕微模糊，去掉背景色的硬邊
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy(); out.putalpha(alpha)
    # 去色邊：邊緣半透明像素的顏色往鄰近實心色靠，避免殘留背景色光暈
    spill = out.copy().filter(ImageFilter.MinFilter(5))
    o, s = out.load(), spill.load()
    for y in range(h):
        for x in range(w):
            r, g, b, al = o[x, y]
            if 0 < al < 255 and dist((r, g, b)) <= tol * 2:
                sr, sg, sb, sa = s[x, y]
                if sa > 0: o[x, y] = (sr, sg, sb, al)
    out.save(pos[1])
    total = w * h; clear = sum(1 for v in out.split()[3].getdata() if v == 0)
    print(f'背景色 #{bg[0]:02x}{bg[1]:02x}{bg[2]:02x}、容許差 {tol}；透明 {clear * 100 // total}%。請檢查：①角色身上有沒有被挖洞 ②邊緣有沒有殘色，再跑 check_sprite.py')

if __name__ == '__main__': main()
