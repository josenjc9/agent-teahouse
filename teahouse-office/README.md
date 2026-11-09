# teahouse-office

讓你的 AI 同事住進一座和風庭院。角色依工作狀態走去座位坐下、頭上顯示正在做的任務，閒下來就離座散步；旁邊有任務看板與儀表板。

*A cozy 3D Japanese-courtyard office for your AI agents. Characters walk to their desks while working and wander the garden when idle. Runs locally; no accounts, no tracking.*

## 一分鐘看效果
```bash
./scripts/check_env.sh                 # 檢查環境（只檢查、不安裝）
cd app && npm install && npm run dev   # 開 http://127.0.0.1:5180
```
另開終端機，讓範例角色開始工作：
```bash
python3 scripts/set_state.py kuro working "查證資料來源"
python3 scripts/set_state.py kuro idle
```

## 有什麼
- **和風庭院場景**：書齋、會議和室、工房、藏書室、展示和室五間房，黃昏／白天／夜晚三時段（右上角切換）。柔陰影、泛光、霧、石燈與窗燈隨時段變化。
- **你自己的角色**：問答建立人設與對白，提示詞帶你用任何生圖工具做出角色圖；腳本負責檢查、去背、打包成動畫圖集。
- **任務看板**：一個 Markdown 檔，`## 欄名` 底下 `- 任務 @負責人`。
- **儀表板分頁**：六種玻璃質感卡片，資料源自己接（見 `接入說明-儀表板.md`）。
- **任何 agent 都能接**：任務開始與結束各執行一行指令；Claude Code 可用 hook 全自動（見 `接入說明.md`）。

## 當成 Skill 使用
把整個資料夾放進 agent 的 skills 目錄（例如 Claude Code 的 `~/.claude/skills/teahouse-office/`），然後說「幫我做我的 Office」。agent 會照 `SKILL.md` 一步步問你、帶你做完。不用 skill 也能直接照本檔與 `SKILL.md` 手動操作。

## 需要
Node.js 20.19+（或 22.12+）、Python 3.9+、瀏覽器。做角色圖時另需 Pillow（`python3 -m pip install Pillow`）與一個生圖工具。

## 文件
| 檔案 | 內容 |
|---|---|
| `SKILL.md` | 完整流程（每步有通過條件） |
| `前置清單.md` | 開工前要準備的東西 |
| `接入說明.md` | 讓 agent 自動更新角色狀態 |
| `接入說明-儀表板.md` | 把自己的資料接進儀表板 |
| `references/` | 人設卡、對白、生圖提示詞、質感標準 |
| `SECURITY.md` | 它會碰什麼、不會碰什麼；分享前的檢查 |

## 範例角色與素材
兩位範例角色「麻糬」「小黑」由 `scripts/make_sample_character.py` 用程式畫出，場景的幾何與貼圖也全部由程式產生，不含任何第三方美術素材。前端使用的開源套件（React、three.js、react-three-fiber 等）各依其授權，安裝時由 npm 取得，不隨本 repo 散佈。

## 還沒驗證的部分
Codex 以外的生圖工具、在真實 Claude Code／Codex 工作階段跑完整條接入、手機與 Safari／Windows。遇到問題歡迎開 issue。
