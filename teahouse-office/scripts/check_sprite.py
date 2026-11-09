#!/usr/bin/env python3
"""角色圖檢查（只用 Pillow）。檢查多格拼圖是否合規格，不合格會告訴你哪裡有問題與怎麼補。
用法：python3 scripts/check_sprite.py 圖.png --frames 4          （建議：自動找角色，不靠格子）
      python3 scripts/check_sprite.py 圖.png --cols 4 --rows 2    （圖確實是整齊格子時）
檢查項：①有沒有透明底 ②底霧 ③角色數量（自動）／每格有沒有角色（格子）④有沒有被切到 ⑤大小是否一致 ⑥腳底是否對齊（格子模式）
生圖工具常不照要求的格數排版，所以預設用自動模式。底霧在打包時會自動清掉，偏多時先看打包結果再決定要不要重生。"""
import statistics, sys
from PIL import Image, ImageFilter

def main():
    argv = sys.argv[1:]
    if not argv: sys.exit(__doc__)
    path = argv[0]; cols = rows = 1
    if '--cols' in argv: cols = int(argv[argv.index('--cols') + 1])
    if '--rows' in argv: rows = int(argv[argv.index('--rows') + 1])
    frames = int(argv[argv.index('--frames') + 1]) if '--frames' in argv else None
    auto = '--cols' not in argv and '--rows' not in argv
    im = Image.open(path).convert('RGBA'); W, H = im.size
    a = im.split()[3]
    issues, warns = [], []
    hist = a.histogram()
    nz = sum(hist[1:]); total = W * H
    full_opaque = hist[255] == total
    print(f'圖片 {W}×{H}，' + ('自動找角色（不靠格子）' if auto else f'格數 {cols}×{rows}（每格約 {W // cols}×{H // rows}）'))
    if full_opaque or nz == total and hist[0] == 0 and sum(hist[1:255]) == 0:
        px = im.load(); cs = [px[2, 2][:3], px[W - 3, 2][:3], px[2, H - 3][:3], px[W - 3, H - 3][:3]]
        same = all(max(abs(c[k] - cs[0][k]) for k in range(3)) < 24 for c in cs for k in range(3))
        issues.append('❌ 沒有透明度（整張不透明）。' + (f'四角顏色一致（約 #{cs[0][0]:02x}{cs[0][1]:02x}{cs[0][2]:02x}），是純色背景：請跑 scripts/remove_bg.py 去背後再檢查' if same else '背景不是單一純色，請在提示詞要求「透明背景」或「純白／純綠背景」後重生'))
    else:
        clear = hist[0] * 100 // total
        print(f'✅ 有透明度（透明 {clear}%）')
        core = a.point(lambda v: 255 if v > 200 else 0).filter(ImageFilter.MaxFilter(17))
        haze = 0; ca = core.getdata(); aa = a.getdata()
        for c, v in zip(ca, aa):
            if 24 < v <= 120 and c == 0: haze += 1   # 透明度 10% 以下肉眼看不到（實測 Codex 透明底會留這種淡斑），打包時也會清掉，不算
        hr = haze * 100 / max(1, nz)
        if hr > 3: issues.append(f'❌ 底霧偏多（角色外圍的淡色殘影佔 {hr:.1f}%）：重生圖並在提示詞強調「乾淨邊緣、沒有陰影、沒有光暈」，或用去背腳本重新處理')
        elif hr > 1: warns.append(f'⚠️ 有少量底霧（{hr:.1f}%），建議清理')
        else: print(f'✅ 底霧乾淨（{hr:.1f}%）')
    if issues:   # 沒有透明度時，格內分析沒有意義（整格都是不透明），先修這個
        for i_ in issues: print(i_)
        print('\n結果：不合格，修正後再檢查'); sys.exit(1)
    if auto:
        return finish_auto(im, a, frames, issues, warns)
    cw, ch = W / cols, H / rows
    boxes = []
    for r in range(rows):
        for c in range(cols):
            cell = a.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))).point(lambda v: 255 if v > 40 else 0)
            bb = cell.getbbox(); boxes.append((r, c, bb, cell.size))
    empty = [(r, c) for r, c, bb, _ in boxes if not bb]
    if empty: warns.append(f'⚠️ 空格 {len(empty)} 個：{[(r + 1, c + 1) for r, c in empty][:6]}（列,欄）。格數設定對嗎？或生圖少畫了')
    cut = [(r + 1, c + 1) for r, c, bb, (cw_, ch_) in boxes if bb and (bb[0] <= 1 or bb[1] <= 1 or bb[2] >= cw_ - 1 or bb[3] >= ch_ - 1)]
    if cut: issues.append(f'❌ 這些格的角色碰到格子邊（可能被切到）：{cut[:8]}。請在提示詞要求「每格四周留白、角色完整不超出格子」')
    hs = [bb[3] - bb[1] for _, _, bb, _ in boxes if bb]
    if hs:
        med = statistics.median(hs)
        bad = [(r + 1, c + 1) for r, c, bb, _ in boxes if bb and abs((bb[3] - bb[1]) - med) > med * 0.35]
        # 坐姿、蹲姿本來就比較矮：只在同一列內比較
        row_bad = []
        for r in range(rows):
            rh = [bb[3] - bb[1] for rr, _, bb, _ in boxes if rr == r and bb]
            if len(rh) > 1:
                m = statistics.median(rh)
                row_bad += [(r + 1, c + 1) for rr, c, bb, _ in boxes if rr == r and bb and abs((bb[3] - bb[1]) - m) > m * 0.25]
        if row_bad: warns.append(f'⚠️ 同一列內角色大小差異過大：{row_bad[:8]}（動作圖同一列應該是同一個動作的連續畫面，大小要接近）')
        foot = []
        for r in range(rows):
            fy = [bb[3] for rr, _, bb, _ in boxes if rr == r and bb]
            if len(fy) > 1 and max(fy) - min(fy) > ch * 0.06: foot.append(r + 1)
        if foot: warns.append(f'⚠️ 第 {foot} 列腳底高度不一致（站姿動作的腳應該在同一水平線；跳躍或坐下除外）')
    for w_ in warns: print(w_)
    for i_ in issues: print(i_)
    if not issues and not warns: print('✅ 全部通過')
    print('\n結果：' + ('不合格，修正後再檢查' if issues else '合格' + ('（有提醒）' if warns else '')))
    sys.exit(1 if issues else 0)

def finish_auto(im, a, frames, issues, warns):
    """自動模式：用 build_atlas 的找角色邏輯，檢查數量、大小一致、有沒有碰到圖邊。"""
    import importlib.util, os
    spec = importlib.util.spec_from_file_location('build_atlas', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_atlas.py'))
    ba = importlib.util.module_from_spec(spec); spec.loader.exec_module(ba)
    figs = ba.figures_auto(im, None, frames)
    print(f'找到 {len(figs)} 個角色')
    if not figs:
        issues.append('❌ 圖裡找不到角色')
    if frames and figs and len(figs) != frames:
        issues.append(f'❌ 預期 {frames} 個角色，找到 {len(figs)} 個：角色可能黏在一起或少畫了。請在提示詞要求「角色之間彼此分開、不重疊」後重生')
    if len(figs) > 1:
        hs = [f.height for f in figs]; m = statistics.median(hs)
        odd = [i + 1 for i, h in enumerate(hs) if abs(h - m) > m * 0.25]
        if odd: warns.append(f'⚠️ 第 {odd} 個角色大小跟其他差很多（同一張應該是同一個動作的連續畫面）')
    W, H = a.size; b = a.point(lambda v: 255 if v > 40 else 0)
    edge = any(sum(1 for v in b.crop(box).getdata() if v) > 12 for box in ((0, 0, W, 2), (0, H - 2, W, H), (0, 0, 2, H), (W - 2, 0, W, H)))   # 零星幾個像素不算被切到
    if edge: issues.append('❌ 角色碰到整張圖的邊（可能被切到）：請在提示詞要求「四周留白、角色完整入鏡」')
    for w_ in warns: print(w_)
    for i_ in issues: print(i_)
    if not issues and not warns: print('✅ 全部通過')
    print('\n結果：' + ('不合格，修正後再檢查' if issues else '合格' + ('（有提醒）' if warns else '')))
    sys.exit(1 if issues else 0)

if __name__ == '__main__': main()
