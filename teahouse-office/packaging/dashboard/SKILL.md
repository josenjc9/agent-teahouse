---
name: teahouse-dashboard
description: 帶使用者做出自己的玻璃質感儀表板：用一份 JSON 資料契約描述要看的東西（判讀、數字、趨勢、表格、狀態、提醒六種卡片），幫使用者寫資料源腳本接上自己的資料，壞掉的資料源會被隔離成紅色提醒而不是整頁壞掉。使用者說「做一個儀表板」「把我的數據做成看板」「幫我接資料到儀表板」時使用。
---

# teahouse-dashboard｜玻璃質感儀表板（v0.1.0）

> **版本狀態**：可用＝資料契約與檢查腳本、六種卡片（深淺色自動）、三支範例資料源、合併腳本（壞資料源隔離、全空不覆寫）、契約壞檔對照測試。
> **還沒驗**：請真實 agent 照提示詞寫資料源的成功率、cron 排程、Windows。使用者問到這些，照實說「這部分還沒驗」。
> **只在本機跑**：不連外部服務、不收集資料、開發伺服器只聽 127.0.0.1。見 `SECURITY.md`。

## 0. 先備
Node.js 20.19+（或 22.12+）與 npm、Python 3.9+、瀏覽器。不需要任何帳號或金鑰。

## 1. 工作流程（每步有通過條件，沒過不往下）
| # | 步驟 | 通過條件 |
|---|---|---|
| 1 | 跑範例：`python3 scripts/build_dashboard.py` → `cd app && npm install && npm run dev` | 頁面開得起來，看到範例卡片 |
| 2 | 問使用者想每天看什麼（最多 6 件事），每件寫下：看什麼、資料在哪、多久更新、怎樣算異常 | 每件四欄都有值；資料在哪不清楚就問，不猜 |
| 3 | 每件挑卡片類型：一個數字→`stat`；隨時間變化→`trend`；多筆明細→`table`；服務正不正常→`status`；要人處理的事→`alerts` | 使用者看過並同意 |
| 4 | 每件寫一支 provider（規則見 `接入說明-儀表板.md`），先單獨執行看輸出 | 輸出通過 `python3 scripts/check_dashboard.py` |
| 5 | 合併：`python3 scripts/build_dashboard.py` | 沒有紅色「資料源失敗」提醒，或失敗原因已向使用者說明 |
| 6 | 故意讓一支資料源失敗一次 | 頁面顯示紅色提醒、其他卡片照常 |
| 7 | 設定自動更新（cron 或 agent 每次任務結束時跑一次） | 使用者同意排程方式後才設定 |

## 2. 規則
- **只顯示真的查到的資料**。查不到就顯示「未連線」，不編數字、不放示範數字冒充真資料。
- 金鑰一律讀環境變數，不寫進檔案、不印出來。
- 寫好的 provider 是使用者電腦上會被執行的程式：寫完把內容給使用者看過。
- 不碰本資料夾以外的東西；要讀其他位置的資料，先問使用者路徑並取得同意。
- 分享或公開前跑 `python3 scripts/scan_private.py 自己的名字 團隊名`，並提醒 `app/public/data/dashboard.json` 會一起公開。

## 3. 檔案
| 檔案 | 用途 |
|---|---|
| `app/public/data/dashboard.json` | 頁面唯一讀的檔，每 5 秒重讀 |
| `schemas/dashboard.schema.json` | 資料契約（JSON Schema） |
| `providers/*.py` | 資料源，一支一件事；檔名 `_` 開頭的不會執行 |
| `scripts/build_dashboard.py` | 執行全部 provider、合併、檢查、原子寫入 |
| `scripts/check_dashboard.py` | 契約檢查；`tests/dashboard/` 有合格與 8 種不合格範例 |
| `接入說明-儀表板.md` | provider 規則與可直接貼給 agent 的提示詞 |

這個儀表板也是 `teahouse-office`（和風庭院 3D Office）的一個分頁，兩邊資料格式相同。
