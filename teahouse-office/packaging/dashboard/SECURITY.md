# 安全說明

這個套件設計成**只在你自己的電腦上跑、只碰這個資料夾**。

## 它不會做的事
- 不連任何外部服務、不回傳任何資料、沒有追蹤或統計碼。網頁只讀 `app/public/data/dashboard.json`。
- 不需要、也不保存任何帳號密碼或 API 金鑰。
- 不安裝系統套件、不改你的全域設定。

## 它會做的事（以及要注意的地方）
| 動作 | 誰做 | 注意 |
|---|---|---|
| 開本機網頁伺服器 | `npm run dev` | 只聽 `127.0.0.1`。**不要改成 `--host 0.0.0.0`**，否則同網路的人看得到你的儀表板 |
| 執行 `providers/` 裡的每一支 `.py` | `build_dashboard.py` | **等於執行程式**。只放你自己寫或讀過的 provider |
| 對你列的網址發 GET | `providers/service_check.py` | 只連 `providers/services.json` 裡你填的網址；這個檔已列入 `.gitignore` |
| 讀本機 git 紀錄 | `providers/git_activity.py` | 只讀提交日期與 repo 資料夾名稱 |

## 分享或公開之前
1. `app/public/data/dashboard.json` 是你的資料。公開 repo 或部署 `npm run build` 的成品，它會一起被公開。
2. 先跑：`python3 scripts/scan_private.py 你的名字 團隊名 你的網域`，命中 0 才算通過。
3. 金鑰一律放環境變數。`.env`、`*.pem`、`*.key` 已列入 `.gitignore`。

## 相依套件
只依賴 React 與 Vite，版本釘死，來源只有官方 npm registry。可自行 `npm audit` 檢查。

## 回報安全問題
請用 GitHub repo 的 **Security → Report a vulnerability** 私下回報，不要開公開 issue。
