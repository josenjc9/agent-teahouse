#!/usr/bin/env python3
"""產生原創範例角色的精靈圖集（程序繪製，無任何第三方美術）。
用法：python3 scripts/make_sample_character.py <輸出資料夾> <id> [hair] [shirt] [ears|glasses|none]
輸出：<輸出資料夾>/<id>/ 底下每個動作一張橫排 PNG（每格 280x260、透明底、腳底在 y=250）＋ atlas.json。
這同時是「圖集格式」的參考實作：自己的角色圖照同樣格式放進去就能用。"""
import json, math, os, sys
from PIL import Image, ImageDraw

FW, FH, FOOT = 280, 260, 250
SS = 4  # 超取樣倍率，縮回時邊緣才平滑
OUT_C = (42, 34, 48, 255)
SKIN = (246, 214, 184, 255)
PANTS = (58, 63, 92, 255)
SHOE = (43, 43, 43, 255)

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (255,)

class Pen:
    def __init__(self):
        self.im = Image.new('RGBA', (FW * SS, FH * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
    def _s(self, box): return [v * SS for v in box]
    def ell(self, box, fill, ow=3):
        b = self._s(box); o = ow * SS
        self.d.ellipse([b[0]-o, b[1]-o, b[2]+o, b[3]+o], fill=OUT_C)
        self.d.ellipse(b, fill=fill)
    def rr(self, box, fill, r=10, ow=3):
        b = self._s(box); o = ow * SS
        self.d.rounded_rectangle([b[0]-o, b[1]-o, b[2]+o, b[3]+o], radius=(r+ow)*SS, fill=OUT_C)
        self.d.rounded_rectangle(b, radius=r*SS, fill=fill)
    def tri(self, pts, fill, ow=3):
        p = [(x*SS, y*SS) for x, y in pts]
        self.d.polygon(p, fill=fill, outline=OUT_C, width=ow*SS)
    def dot(self, cx, cy, r, fill=OUT_C):
        self.d.ellipse(self._s([cx-r, cy-r, cx+r, cy+r]), fill=fill)
    def line(self, pts, w=3, fill=OUT_C):
        self.d.line([(x*SS, y*SS) for x, y in pts], fill=fill, width=int(round(w*SS)), joint='curve')
    def out(self):
        return self.im.resize((FW, FH), Image.LANCZOS)

def ears(p, cx, cy, hair, inner):
    for s in (-1, 1):
        p.tri([(cx+s*18, cy-44), (cx+s*54, cy-70), (cx+s*58, cy-22)], hair)
        p.tri([(cx+s*28, cy-44), (cx+s*50, cy-60), (cx+s*52, cy-30)], inner, ow=0)

def glasses(p, cx, cy):
    for s in (-1, 1): p.d.ellipse(p._s([cx+s*20-14, cy-2, cx+s*20+14, cy+22]), outline=OUT_C, width=3*SS)
    p.line([(cx-6, cy+8), (cx+6, cy+8)], 3)

def eyes(p, cx, cy, blink=False, open_mouth=False):
    for s in (-1, 1):
        if blink: p.line([(cx+s*20-7, cy+10), (cx+s*20+7, cy+10)], 3)
        else:
            p.dot(cx+s*20, cy+10, 7); p.dot(cx+s*20+2, cy+7, 2.4, (255, 255, 255, 255))
        p.ell([cx+s*34-9, cy+22, cx+s*34+9, cy+32], (255, 170, 170, 130), 0)
    if open_mouth: p.ell([cx-6, cy+26, cx+6, cy+38], (150, 60, 70, 255), 2)
    else: p.line([(cx-6, cy+30), (cx, cy+34), (cx+6, cy+30)], 2.5)

def head_front(p, cx, cy, c, blink=False, mouth=False):
    if c['acc'] == 'ears': ears(p, cx, cy, c['hair'], (255, 190, 190, 255))
    p.ell([cx-60, cy-60, cx+60, cy+58], SKIN)
    p.ell([cx-64, cy-66, cx+64, cy-6], c['hair'])             # 頭髮蓋住上半
    for bx in (-34, -4, 28): p.ell([cx+bx-18, cy-18, cx+bx+18, cy+12], c['hair'], 0)  # 瀏海
    p.ell([cx-62, cy-40, cx-44, cy+16], c['hair'], 2); p.ell([cx+44, cy-40, cx+62, cy+16], c['hair'], 2)
    eyes(p, cx, cy, blink, mouth)
    if c['acc'] == 'glasses': glasses(p, cx, cy)

def head_back(p, cx, cy, c):
    shade = tuple(max(0, int(v * 0.78)) for v in c['hair'][:3]) + (255,)
    dark = tuple(max(0, int(v * 0.6)) for v in c['hair'][:3]) + (255,)
    if c['acc'] == 'ears': ears(p, cx, cy, c['hair'], shade)
    p.ell([cx-62, cy-62, cx+62, cy+56], c['hair'])
    p.ell([cx-58, cy+6, cx+58, cy+54], shade, 0)                 # 後腦下半的陰影
    for sx in (-34, -14, 10, 32):                                   # 髮絲
        p.line([(cx+sx, cy-50), (cx+sx*1.1, cy+36)], 2.2, dark)
    p.line([(cx, cy-60), (cx, cy-14)], 3, dark)                      # 髮旋
    p.ell([cx-12, cy+34, cx+12, cy+56], SKIN, 2)                     # 後頸
    p.rr([cx-26, cy+14, cx+26, cy+26], c['shirt'], 5)                # 髮帶／領巾色點綴

def head_side(p, cx, cy, c, blink=False):
    # 朝左；臉偏左
    if c['acc'] == 'ears':
        p.tri([(cx-10, cy-46), (cx-40, cy-72), (cx-42, cy-24)], c['hair']); p.tri([(cx+14, cy-46), (cx+44, cy-70), (cx+44, cy-22)], c['hair'])
    p.ell([cx-58, cy-58, cx+52, cy+58], SKIN)
    p.ell([cx-54, cy-66, cx+64, cy-2], c['hair'])
    p.ell([cx-6, cy-46, cx+64, cy+40], c['hair'], 2)           # 後腦勺
    if blink: p.line([(cx-40, cy+10), (cx-26, cy+10)], 3)
    else: p.dot(cx-33, cy+10, 7); p.dot(cx-31, cy+7, 2.4, (255, 255, 255, 255))
    p.ell([cx-30, cy+22, cx-14, cy+32], (255, 170, 170, 130), 0)
    p.line([(cx-50, cy+28), (cx-42, cy+32), (cx-36, cy+29)], 2.5)
    if c['acc'] == 'glasses': p.d.ellipse(p._s([cx-48, cy-2, cx-18, cy+22]), outline=OUT_C, width=3*SS)

def arm(p, x, y, length, ang, c, w=22):
    # 以肩為起點、角度 ang（弧度，0＝垂直向下）畫一隻手臂
    ex, ey = x + math.sin(ang) * length, y + math.cos(ang) * length
    p.line([(x, y), (ex, ey)], w + 6, OUT_C); p.line([(x, y), (ex, ey)], w, c['shirt'])
    p.dot(ex, ey, 11, SKIN)

def front(c, f, n, pose):
    p = Pen(); ph = 2 * math.pi * f / n
    bob = math.sin(ph) * 2.5 if pose == 'idle' else abs(math.sin(ph)) * 5 if pose == 'walk' else 0
    sw = math.sin(ph) * (22 if pose == 'walk' else 0)
    if pose == 'work':
        y0 = FOOT - 64 + bob  # 坐姿：只畫到髖部，椅子由場景提供
        p.rr([105, y0, 175, FOOT], c['shirt'], 18)
        t = 1 if f % 2 == 0 else -1
        for s in (-1, 1):
            p.line([(140 + s*40, y0+14), (140 + s*26 + t*s*6, y0+50)], 28, OUT_C); p.line([(140+s*40, y0+14), (140+s*26+t*s*6, y0+50)], 22, c['shirt']); p.dot(140+s*26+t*s*6, y0+52, 11, SKIN)
        head_front(p, 140, y0 - 60, c, blink=(f == 3)); return p.out()
    legs_y = FOOT - 38
    for s, k in ((-1, 1), (1, -1)):
        lift = max(0, sw * k) * 0.5
        p.rr([140 + s*10 - (0 if s > 0 else 26), legs_y - lift, 140 + s*10 + (26 if s > 0 else 0), FOOT - 8 - lift], PANTS, 8)
        p.rr([140 + s*10 - (0 if s > 0 else 30), FOOT - 14 - lift, 140 + s*10 + (30 if s > 0 else 0), FOOT - lift], SHOE, 6)
    by = FOOT - 100 + bob
    p.rr([105, by, 175, legs_y + 6], c['shirt'], 18)
    if pose in ('talk', 'wave'):
        arm(p, 108, by + 18, 46, 0.25, c); arm(p, 172, by + 18, 46, -2.5 + math.sin(ph * 2) * 0.5 if True else 0, c)
    elif pose == 'stretch':
        up = math.sin(ph / 2) ** 2
        arm(p, 108, by + 18, 48, 0.2 + up * 3.0, c); arm(p, 172, by + 18, 48, -0.2 - up * 3.0, c)
    else:
        arm(p, 108, by + 18, 46, 0.12 + sw * 0.02, c); arm(p, 172, by + 18, 46, -0.12 - sw * 0.02, c)
    head_front(p, 140, by - 50, c, blink=(pose == 'idle' and f == n - 1), mouth=(pose == 'talk' and f % 2 == 1))
    return p.out()

def back(c, f, n, pose):
    p = Pen(); ph = 2 * math.pi * f / n
    bob = math.sin(ph) * 2.5 if pose == 'idle' else abs(math.sin(ph)) * 5; sw = math.sin(ph) * (22 if pose == 'walk' else 0)
    legs_y = FOOT - 38
    for s, k in ((-1, 1), (1, -1)):
        lift = max(0, sw * k) * 0.5
        p.rr([140 + s*10 - (0 if s > 0 else 26), legs_y - lift, 140 + s*10 + (26 if s > 0 else 0), FOOT - 8 - lift], PANTS, 8)
        p.rr([140 + s*10 - (0 if s > 0 else 30), FOOT - 14 - lift, 140 + s*10 + (30 if s > 0 else 0), FOOT - lift], SHOE, 6)
    by = FOOT - 100 + bob
    p.rr([105, by, 175, legs_y + 6], c['shirt'], 18)
    arm(p, 108, by + 18, 46, 0.12 + sw * 0.02, c); arm(p, 172, by + 18, 46, -0.12 - sw * 0.02, c)
    head_back(p, 140, by - 50, c); return p.out()

def side(c, f, n, pose):
    p = Pen(); ph = 2 * math.pi * f / n
    bob = math.sin(ph) * 2.5 if pose == 'idle' else abs(math.sin(ph)) * 5 if pose == 'walk' else 0
    sw = math.sin(ph) * (26 if pose == 'walk' else 0)
    legs_y = FOOT - 38
    for k, shade in ((-1, 0.82), (1, 1.0)):
        dx = sw * k; col = tuple(int(v * shade) for v in PANTS[:3]) + (255,)
        p.rr([140 - 13 + dx, legs_y, 140 + 13 + dx, FOOT - 8], col, 8)
        p.rr([140 - 22 + dx, FOOT - 14, 140 + 12 + dx, FOOT], SHOE, 6)
    by = FOOT - 100 + bob
    p.rr([112, by, 168, legs_y + 6], c['shirt'], 18)
    arm(p, 140, by + 18, 46, sw * 0.03 * -1, c)
    head_side(p, 136, by - 50, c, blink=(pose == 'idle' and f == n - 1)); return p.out()

def sheet(frames):
    im = Image.new('RGBA', (FW * len(frames), FH), (0, 0, 0, 0))
    for i, fr in enumerate(frames): im.paste(fr, (i * FW, 0))
    return im

def main():
    out, cid = sys.argv[1], sys.argv[2]
    hair = hexrgb(sys.argv[3]) if len(sys.argv) > 3 else hexrgb('#f4efe6')
    shirt = hexrgb(sys.argv[4]) if len(sys.argv) > 4 else hexrgb('#f08a4b')
    acc = sys.argv[5] if len(sys.argv) > 5 else 'ears'
    c = {'hair': hair, 'shirt': shirt, 'acc': acc}
    d = os.path.join(out, cid); os.makedirs(d, exist_ok=True)
    spec = {
        'idle_front': (front, 4, 'idle'), 'idle_back': (back, 4, 'idle'), 'still_left': (side, 1, 'idle'),
        'walk_front': (front, 4, 'walk'), 'walk_back': (back, 4, 'walk'), 'walk_left': (side, 4, 'walk'),
        'work': (front, 4, 'work'), 'talk': (front, 4, 'talk'),
        'rest_wave': (front, 4, 'wave'), 'rest_stretch': (front, 6, 'stretch'),
    }
    seq = {}
    for name, (fn, n, pose) in spec.items():
        sheet([fn(c, f, n, pose) for f in range(n)]).save(os.path.join(d, name + '.png'))
        seq[name] = {'cols': n, 'rows': 1, 'count': n}
    json.dump({'frame': [FW, FH], 'seq': seq, 'work': 'work', 'talk': 'talk', 'rest': ['rest_wave', 'rest_stretch'], 'side': ['still_left', 'walk_left']},
              open(os.path.join(d, 'atlas.json'), 'w'), ensure_ascii=False, indent=2)
    print('ok', d, len(seq), 'sequences')

if __name__ == '__main__': main()
