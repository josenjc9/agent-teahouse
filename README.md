# agent-teahouse

**讓你的 AI 同事住進一座和風庭院。** 兩個可以直接交給 AI agent 的 Skill：一個是角色會依工作狀態走動、坐下的 3D Office，一個是玻璃質感儀表板。全部在你自己的電腦上跑，不需要帳號、不收集資料。

*Two agent skills: a cozy 3D Japanese-courtyard office where your AI agents walk to their desks while working, and a glassy local-first dashboard. Runs entirely on your machine.*

**[▶ 線上預覽（不用安裝，點開就能看）](https://josenjc9.github.io/agent-teahouse/)**　｜　[下載 ZIP](https://github.com/josenjc9/agent-teahouse/archive/refs/heads/main.zip)

![角色隨 agent 狀態走動並互相對話：待命時在庭院散步，收到工作指令後走進會議和室坐下，兩位用對話泡泡交談，完成後離座](docs/office-demo.gif)

*每一步由一行指令觸發：`set_state.py mochi working "整理本週排程"` 讓角色去工作，`set_state.py mochi say "…"` 讓角色開口說話。兩位範例角色為原創設計。*

![和風庭院 Office：黃昏](docs/office-dusk.png)

| 白天 | 夜晚 | 儀表板 |
|---|---|---|
| ![白天](docs/office-day.png) | ![夜晚](docs/office-night.png) | ![儀表板](docs/dashboard.png) |

## 做出自己的角色
![流程：寫人設卡、三視圖、動作圖、檢查打包、進入庭院](docs/workflow.svg)

## 兩個 Skill
| 資料夾 | 做什麼 | 適合 |
|---|---|---|
| [`teahouse-office/`](teahouse-office/) | 3D 和風庭院 Office：自訂角色（人設、對白、動作圖）、任務看板、角色依 agent 狀態走動坐下，內含儀表板分頁 | 想把自己的 AI 團隊「看得見」 |
| [`teahouse-dashboard/`](teahouse-dashboard/) | 單獨的玻璃質感儀表板：一份 JSON 契約、六種卡片、自己寫資料源接資料 | 只想要儀表板、不要 3D |

兩邊的儀表板資料格式相同，可以先用 dashboard、之後再換成 office。

## 不會用 GitHub？
1. 點上方的 **下載 ZIP**（不需要帳號、不需要 git），解壓縮。
2. 把解壓縮後的 `teahouse-office` 資料夾交給你的 AI agent：放進它的 skills 資料夾（各家路徑不同，請查你用的 agent 說明），或直接請它先讀該資料夾的 `SKILL.md`。
3. 對它說：**「幫我安裝並開起來」**，之後再說「幫我做我自己的角色」。

由 agent 替你執行安裝指令，你不必自己開終端機（這個流程尚未在各家真實 agent 上逐一驗證，見文末）。線上預覽只是展示，不能接你自己的 agent。

## 快速開始
```bash
git clone https://github.com/<你的帳號>/agent-teahouse.git
cd agent-teahouse/teahouse-office
./scripts/check_env.sh                 # 只檢查環境、不安裝任何東西
cd app && npm install && npm run dev   # 開 http://127.0.0.1:5180
```
另開終端機讓範例角色開始工作：
```bash
python3 scripts/set_state.py kuro working "查證資料來源"
```

## 交給 AI agent
把 `teahouse-office/` 或 `teahouse-dashboard/` 整個資料夾放進你的 agent 的 skills 資料夾（路徑依各家 agent 而異），對它說「幫我做我的 Office」或「幫我做一個儀表板」。每個 Skill 的 `SKILL.md` 會帶 agent 一步步問你、做完、驗收。
Codex 或其他 agent：請它先讀該資料夾的 `SKILL.md` 再開始。

## 需要
Node.js 20.19+（或 22.12+）、Python 3.9+、瀏覽器。做角色圖另需 Pillow 與一個生圖工具。

## 安全
- 只在本機跑：開發伺服器只聽 `127.0.0.1`，不連外部服務、沒有追蹤。
- 不需要任何金鑰；自己接資料時，金鑰放環境變數。
- 分享前用 `scripts/scan_private.py` 檢查有沒有留下名字、路徑、金鑰。
- 詳見各資料夾的 `SECURITY.md`。發現安全問題請用 **Security → Report a vulnerability** 私下回報。

## 授權與素材
程式碼以 [MIT](LICENSE) 授權。兩位範例角色是原創設計，由 AI 生圖工具（OpenAI 圖像生成，經 Codex CLI）依 `teahouse-office` 自己的人設卡與提示詞流程製作（人設卡見 `teahouse-office/references/examples/`）；3D 場景的幾何與貼圖全部由程式產生。不含第三方美術素材。前端開源套件（React、three.js、react-three-fiber 等）各依其授權，由 npm 安裝時取得。

## 目前還沒驗證
Codex 以外的生圖工具、真實 Claude Code／Codex 工作階段的完整接入、手機與 Safari／Windows。歡迎開 issue 回報。
