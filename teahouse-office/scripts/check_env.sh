#!/usr/bin/env bash
# 環境檢查：缺什麼就列出缺哪項、怎麼裝。只讀，不安裝任何東西。
ok=0; miss=0
say() { printf '%s\n' "$1"; }
check() { # 名稱 指令 版本指令 安裝提示
  if command -v "$2" >/dev/null 2>&1; then say "✅ $1：$($3 2>&1 | head -1)"; ok=$((ok+1)); else say "❌ $1：沒找到。$4"; miss=$((miss+1)); fi
}
check "Node.js" node "node -v" "請裝 20.19 以上（https://nodejs.org 下載 LTS）"
check "npm" npm "npm -v" "通常隨 Node.js 一起裝"
check "Python 3" python3 "python3 --version" "請裝 Python 3.9 以上（https://www.python.org）"
if command -v node >/dev/null 2>&1; then
  v=$(node -p "process.versions.node")
  maj=${v%%.*}; rest=${v#*.}; min=${rest%%.*}
  if [ "$maj" -lt 20 ] || { [ "$maj" -eq 20 ] && [ "$min" -lt 19 ]; }; then say "⚠️  Node 版本 $v 太舊（需要 20.19 以上或 22.12 以上），請更新"; miss=$((miss+1)); fi
fi
if command -v python3 >/dev/null 2>&1; then
  if python3 -c "import PIL" 2>/dev/null; then say "✅ Pillow：$(python3 -c 'import PIL;print(PIL.__version__)')"; ok=$((ok+1))
  else say "❌ Pillow：沒裝。只有要用角色切圖／圖集腳本時才需要，執行：python3 -m pip install Pillow"; miss=$((miss+1)); fi
fi
say ""
say "還需要你自己準備（腳本檢查不到）：① 一個 AI agent（Claude Code／Codex／Grok bot） ② 一個生圖工具（能出多格拼圖、最好有透明底） ③ 瀏覽器"
say "結果：通過 $ok 項、缺少 $miss 項"
[ "$miss" -eq 0 ]
