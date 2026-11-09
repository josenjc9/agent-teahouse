# 安全說明

這個套件設計成**只在你自己的電腦上跑、只碰這個資料夾**。下面逐項列出它會做什麼、不會做什麼，方便你在安裝前自己檢查。

## 它不會做的事
- 不連任何外部服務、不回傳任何資料、沒有追蹤或統計碼。網頁只讀同一個資料夾裡的檔案（`app/public/`）。
- 不需要、也不保存任何帳號密碼或 API 金鑰。
- 不安裝系統套件、不改你的全域設定。`scripts/check_env.sh` 只檢查、不安裝。
- 3D 場景、貼圖、天空全部由程式在瀏覽器裡現場產生，不從網路下載素材。

## 它會做的事（以及要注意的地方）
| 動作 | 誰做 | 注意 |
|---|---|---|
| 開本機網頁伺服器 | `npm run dev` | 只聽 `127.0.0.1`（只有這台電腦連得到）。**不要改成 `--host 0.0.0.0`**，否則同網路的人看得到你的看板與狀態 |
| 寫 `app/public/data/state.json` | `set_state.py`、`hook_state.py` | `hook_state.py` 會把你送給 agent 的訊息**前 10 個字**當任務名寫進去。訊息開頭若可能有敏感內容，改用 `set_state.py` 手動指定任務名 |
| 執行 `providers/` 裡的每一支 `.py` | `build_dashboard.py` | **等於執行程式**。只放你自己寫或讀過的 provider；別人給的 provider 先看過再放 |
| 對你列的網址發 GET | `providers/service_check.py` | 只連 `providers/services.json` 裡你自己填的網址；這個檔已列入 `.gitignore` |
| 讀本機 git 紀錄 | `providers/git_activity.py` | 只讀提交日期與 repo 資料夾名稱，不讀程式內容 |

## 分享或公開之前
1. `app/public/data/` 裡的 `board.md`（任務看板）、`state.json`（角色狀態）、`dashboard.json`（儀表板）是**你的工作內容**。公開 repo 或把 `npm run build` 的成品部署上網，這些會一起被公開。
2. 先跑去識別化掃描，把你的名字、團隊名、網域加進去：
   ```bash
   python3 scripts/scan_private.py 你的名字 團隊名 你的網域
   ```
   它會找：本機路徑、長數字 ID、email、常見金鑰格式、圖片裡藏的文字資料，以及你指定的詞。命中 0 才算通過。
3. 金鑰一律放環境變數，不寫進檔案。`.env`、`*.pem`、`*.key` 已列入 `.gitignore`。

## 相依套件
前端相依套件版本全部釘死（見 `app/package.json`），來源只有官方 npm registry。安裝後可以自己跑 `npm audit` 檢查；發佈時的檢查結果是 0 個已知弱點。

## 回報安全問題
發現安全問題，請用 GitHub repo 的 **Security → Report a vulnerability**（私下回報），不要開公開 issue。
