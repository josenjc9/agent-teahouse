---
name: teahouse-office
description: 帶使用者做出自己的 3D 虛擬 Office（和風庭院茶屋）：問答式建立 AI 同事角色（人設、對白、三視圖、動作圖），跑起一個有任務看板、角色會依工作狀態走動坐下的 3D 網頁，並可接上任何 agent 自動更新狀態。使用者說「做我的 Office」「建立虛擬辦公室角色」「做 agent 辦公室」「讓我的 AI 角色在畫面上工作」時使用。
---

# teahouse-office｜AI 同事的和風庭院 Office（v0.1.0）

> **版本狀態**：可用＝環境檢查、和風庭院 3D 場景（黃昏／白天／夜晚）、兩位原創範例角色、角色工作流（人設、對白、提示詞、圖檢查、去背、圖集打包）、任務看板、狀態推送、玻璃質感儀表板分頁、質感檢查、去識別化掃描。
> **已實測（2026-11）**：用 Codex 生圖從零做一個新角色走完全程——Codex 能直接出真透明底；一個角色約 10 張圖、每張約 2 分鐘。
> **還沒驗**：其他生圖工具（ChatGPT 網頁、Midjourney 等）的透明底；在真實 Claude Code／Codex 工作階段跑完整條狀態接入；手機與 Safari／Windows。使用者問到這些，請如實說明尚未驗證，不要推測。
> **只在本機跑**：不連任何外部服務、不收集資料、開發伺服器只聽 127.0.0.1。安全說明見本資料夾 `SECURITY.md`。
>
> **畫面質感是驗收條件之一**：成品必須達到 `references/quality-standard.md`，見下方「質感標準」。

## 0. 先備清單（先勾完再開工）
完整可勾選版：`前置清單.md`。

**必要**
- 一個 AI agent：Claude Code／Codex／Grok bot 擇一
- 生圖工具：能出透明背景最佳（Codex 已實測可行）；不行也能用純色底加去背腳本
- Node.js 20.19 以上（或 22.12 以上）與 npm
- Python 3；用到圖集腳本時另需 Pillow（`python3 -m pip install Pillow`）
- 瀏覽器

**選用**：Playwright（自動截圖驗收）、Blender（想進階做 3D 角色才需要，本套件不依賴）

先跑：`./scripts/check_env.sh`，缺什麼會列出怎麼裝。

## 1. 工作流程（每步有通過條件，沒過不往下）
| # | 步驟 | 工具／參考 | 通過條件 |
|---|---|---|---|
| 0 | 環境檢查 | `scripts/check_env.sh` | 必要項全 ✅ |
| 1 | 問喜好、建人設卡 | `references/01-persona-card.md` | 每欄有值、畫風錨點是一句可貼的話 |
| 2 | 對白庫（含輸出 `dialogue.json`） | `references/02-dialogue.md` | 每類 ≥3 句、遮名字猜得出是誰 |
| 3 | 三視圖提示詞 → 使用者生圖 → 檢查 | `references/03-image-prompts.md`、`scripts/check_sprite.py`、`scripts/remove_bg.py` | 三視角同一人、全身、通過檢查腳本 |
| 4 | 動作圖提示詞（一張一個動作朝向：必備 7 張＋選配）→ 生圖 → 檢查 | 同上 | 每張通過 `check_sprite.py 圖 --frames 4` |
| 5 | 圖放 `raw/<id>/`，寫 manifest，打包圖集 | `scripts/build_atlas.py`、`references/atlas-manifest.example.json` | 輸出 atlas.json，必備 7 組動作齊全 |
| 6 | 選場景預設與時段、安排角色座位 | `app/public/scene.json`、`characters/index.json` | 頁面看得到房間，角色坐進自己的座位 |
| 7 | 編輯任務看板 | `app/public/data/board.md` | 頁面五欄顯示 |
| 8 | 啟動 Office 並驗收（含質感驗收） | `check_quality.py` ＋三時段截圖並排比對 | 角色在場景走動、坐下、頭上顯示任務與對白；質感合格 |

> 生圖工具能出真透明底就用提示詞的 D1（Codex 實測可以）；不行用 D2（純白底，角色身上白色多就改綠幕）再跑 `remove_bg.py`。其他工具先試一張再決定。
> 生圖工具**常不照要求的格數排版**，所以動作圖不要求格數，打包腳本會自動找出每個角色（見 `references/03-image-prompts.md`）。

## 2. 啟動
```bash
cd app && npm install && npm run dev      # 開 http://127.0.0.1:5180
```
內建兩位**原創範例角色**（麻糬、小黑）：用 AI 生圖工具（Codex）照本流程做的動漫風 Q 版，人設卡見 `references/examples/`，無第三方美術。
還沒有角色圖、只想先跑通流程時，可用 `python3 scripts/make_sample_character.py app/public/characters <id> <髮色> <衣色> <ears|glasses|none>` 產生簡易佔位角色（需 Pillow）。

## 3. 推送狀態（任何 agent 都能呼叫）
```bash
python3 scripts/set_state.py <角色id> <working|idle|rest> "任務名稱（10 字內）"
```
`working`＝走到座位、坐下工作、頭上顯示任務；`idle`／`rest`＝離開座位到休息點閒晃。頁面每 2 秒讀一次。
讓角色開口說話（對話泡泡約 6 秒，狀態與任務不變；多個 agent 可以互相對話）：
```bash
python3 scripts/set_state.py <角色id> say "要說的話（40 字內）"
```
接入方式見 `接入說明.md`（通用：任何能執行 shell 指令的 agent 都一樣；有 hook 的工具可全自動；純聊天機器人只能手動）。

## 3b. 儀表板（選用）
資料契約、範例資料源、怎麼請 agent 寫自己的資料源：見 `接入說明-儀表板.md`。單獨開 `dashboard.html`，或 Office 上方的「儀表板」分頁。

## 4. 資料檔（全部在 `app/public/`）
| 檔案 | 用途 |
|---|---|
| `scene.json` | 場景預設與時段：`{"preset":"japanese-garden","timeOfDay":"dusk"}`（時段 dusk／day／night；頁面右上也能即時切換） |
| `characters/index.json` | 角色清單（名字、職務、簡介、座位、顏色、大小）。座位寫法「房間#第幾個」，和風庭院的房間：`study`書齋、`meeting`會議和室、`workshop`工房、`archive`藏書室、`preview`展示和室，每間 4 個座位。**畫面看得到的人數**：會議和室、工房各 4 位；書齋、藏書室、展示和室各 1 位（其餘座位會被牆或柱子擋住），多人請優先排會議和室與工房 |
| `characters/<id>/atlas.json` + `<動作>.png` | 角色圖集：每動作一張橫排圖，每格 280×260、透明底、腳底在 y=250 |
| `data/state.json` | 角色目前狀態（由 set_state.py 寫） |
| `data/board.md` | 任務看板：`## 欄名` 底下 `- 任務 @負責人` |

必備動作名稱：`idle_front` `idle_back` `still_left` `walk_front` `walk_back` `walk_left` `work`；選配：`talk`、`rest_*`（列在 atlas.json 的 `rest`）。`*_left` 圖朝左，向右時自動鏡像。

## 5. 質感標準（完整版見 `references/quality-standard.md`）
引擎層一律具備：柔陰影、ACES 色調映射、泛光、暗角、自訂漸層天空＋環境光、霧、暖冷對比光、發光材質（窗燈／石燈隨時段調亮度）、浮島底座與雲；角色精靈永遠面向鏡頭、不被色調映射洗掉、腳底有接觸影。時段表在 `app/src/presets/<預設>/tod.ts`，**加場景或時段必須給完整一組值，不能只換背景色**。

驗收三步（缺一不算完成）：
1. `python3 scripts/check_quality.py`：設定都在
2. 用瀏覽器開起來，截白天／黃昏／夜晚三張
3. 與本套件預設場景截圖**並排比對**；目視上與預設場景有明顯落差者視為未達標，退回修改

## 6. 規則
- 缺資料先問使用者，不自己腦補角色設定。
- 不使用有版權的角色或他人作品當成品。
- 驗收要實跑：頁面開起來、看到角色在動，不是「檔案存在」。
- **不碰使用者機器上本套件以外的東西**：只讀寫本資料夾；不安裝系統套件、不改使用者的全域設定。要改 agent 的 hook／規則檔時，先把要加的內容給使用者看、同意後才改。
- 使用者要把 Office 分享出去（公開 repo、部署上網）之前，先跑 `python3 scripts/scan_private.py 自己的名字 團隊名`，並提醒：`app/public/data/` 裡的看板與狀態會一起被公開。
