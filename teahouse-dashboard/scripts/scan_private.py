#!/usr/bin/env python3
"""去識別化掃描：公開或分享前掃整個資料夾，找私人資料殘留（本機路徑、長數字 ID、email、金鑰樣式、你自己的名字）。只用標準庫。

用法：python3 scripts/scan_private.py [--root 資料夾] [--words-file 詞表.txt] [要找的詞 ...]
  - 內建規則只抓「格式」：本機路徑、17–20 位數字 ID、email、常見金鑰樣式、金鑰類欄位
  - 你的名字、團隊名、網域、內部專案名，用參數或詞表檔（一行一個詞）加進來
    詞表檔請放在要公開的資料夾外面，或寫進 .gitignore —— 它本身就是私人資料
  - 也會檢查 PNG／JPEG 裡藏的文字資料（常見會帶到拍攝裝置、軟體或本機路徑）
命中 0 才算通過（exit 0）。"""
import argparse, os, re, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKIP_DIR = {'node_modules', 'dist', '.git', '__pycache__', '.venv'}
TEXT = ('.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.py', '.sh', '.html', '.css', '.txt', '.yml', '.yaml', '.toml', '.env')

PATTERNS = {
    '本機絕對路徑': r'/Users/[A-Za-z0-9_.-]+|[A-Za-z]:\\Users\\[A-Za-z0-9_.-]+|/home/[a-z0-9_-]+/',
    '長數字 ID（Discord／Telegram 等）': r'\b\d{17,20}\b',
    '電子郵件': r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
    'API 金鑰樣式': r'sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----',
    '金鑰類欄位': r'(?i)\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["\'][^"\']{6,}["\']',
    '對外隧道網址': r'https?://[a-z0-9.-]*(ngrok|trycloudflare|loca\.lt)[a-z0-9./-]*',
}
# 範例用的保留網域與 npm 套件作者欄位不算命中
ALLOW = re.compile(r'example\.(com|org|net)|noreply@|@users\.noreply\.github\.com')


def walk(root):
    for d, ds, fs in os.walk(root):
        ds[:] = [x for x in ds if x not in SKIP_DIR]
        for f in fs:
            yield os.path.join(d, f)   # 連這支腳本自己也掃：它也會被公開


def png_text(b):
    """回傳 PNG 裡的文字區塊（tEXt／iTXt／zTXt／eXIf）。"""
    out, i = [], 8
    while i + 8 <= len(b):
        n = struct.unpack('>I', b[i:i + 4])[0]
        t = b[i + 4:i + 8].decode('latin1')
        if t in ('tEXt', 'iTXt', 'zTXt', 'eXIf'):
            out.append(t)
        i += 12 + n
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.join(HERE, '..'))
    ap.add_argument('--words-file')
    ap.add_argument('words', nargs='*')
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    words = [w for w in a.words if w.strip()]
    allowed = []   # 詞表裡用 ! 開頭的整句＝刻意公開（如授權檔的版權人），整句比對、只放行那一句
    if a.words_file:
        for l in open(a.words_file, encoding='utf-8'):
            l = l.strip()
            if not l or l.startswith('#'):
                continue
            (allowed.append(l[1:]) if l.startswith('!') else words.append(l))
    # 英數詞比對整個字（避免 Ann 撞到 annual）；中文等其他詞照字面找。都不分大小寫
    word_rx = [(w, re.compile((r'(?<![A-Za-z0-9])' + re.escape(w) + r'(?![A-Za-z0-9])') if re.fullmatch(r'[\x00-\x7f]+', w) else re.escape(w), re.I)) for w in words]
    hits = []
    for p in walk(root):
        rel = os.path.relpath(p, root)
        name = os.path.basename(p)
        if name.endswith(('.png', '.jpg', '.jpeg')):
            b = open(p, 'rb').read()
            if b[:8] == b'\x89PNG\r\n\x1a\n':
                found = png_text(b)
                if found:
                    hits.append((rel, 0, '圖片內嵌文字資料', ','.join(found)))
            elif b'Exif' in b[:64]:
                hits.append((rel, 0, '圖片內嵌 EXIF', '可能含裝置或位置資訊'))
            continue
        if name == 'package-lock.json' or not name.endswith(TEXT):
            continue
        try:
            txt = open(p, encoding='utf-8').read()
        except Exception:
            continue
        for i, line in enumerate(txt.splitlines(), 1):
            plain = line
            for s in allowed:
                plain = plain.replace(s, '')
            for w, rx in word_rx:
                if rx.search(plain):
                    hits.append((rel, i, '指定的詞', w))
            for label, rx in PATTERNS.items():
                m = re.search(rx, line)
                if m and not ALLOW.search(m.group(0)):
                    hits.append((rel, i, label, line.strip()[:90]))
    for rel, i, label, s in hits:
        print(f'❌ {rel}:{i}  {label}：{s}')
    print(f'掃描 {root}｜自訂詞 {len(words)} 個｜命中 {len(hits)} 筆；' + ('通過' if not hits else '不通過'))
    sys.exit(1 if hits else 0)


if __name__ == '__main__':
    main()
