# Pokemon GO PvP 助手 — 手機版網頁

Pokemon GO PvP 戰術分析手機網頁，部署在 **Cloudflare Workers**。
查詢寶可夢 PvP 排名、技能組合、屬性剋制，並可登入後管理自己的對戰盒子、取得最佳隊伍分析。

> v2.0 已從 Telegram Bot 全面改寫為獨立手機網頁，並改用 **Google 登入**做跨裝置雲端同步。

## 技術棧

- **執行環境**：Cloudflare Workers (Serverless)
- **語言**：TypeScript（無打包步驟，wrangler 直接 bundle `src/worker.ts`）
- **前端**：原生 SPA（單一 HTML，深色手機介面，底部分頁導覽）
- **登入**：Google OAuth 2.0 / OpenID Connect（白名單 email）
- **儲存**：Cloudflare KV（盒子 / 垃圾清單 / 登入 session）
- **資料來源**：PvPoke 排名、wingzero.tw 活動（GitHub Actions 每日自動更新）

## 功能

| 分頁 | 功能 | 需登入 |
|------|------|--------|
| 🔍 搜尋 | 寶可夢家族各聯盟排名、推薦招式、屬性、相關活動、保留建議 | 否 |
| 🏆 排行 | 各聯盟完整排行榜 + 三聯盟 Meta 隊伍分析（一鍵複製搜尋字串） | 否 |
| 🛡️ 剋制 | 攻擊 / 防守屬性相剋查詢 | 否 |
| 🎒 盒子 | 多帳號盒子、批量匯入、一鍵清垃圾、最佳/即戰力三人組分析、垃圾清單 | 是 |

## 開發指令

```bash
npm install          # 安裝依賴 (wrangler / typescript / workers-types)
npm run dev          # 本地開發 (wrangler dev)
npm run typecheck    # TypeScript 型別檢查
npm run deploy       # 部署到 Cloudflare
npm run tail         # 即時日誌
```

## 首次設定（重要）

### 1. 設定 Google 登入憑證

登入功能需要你在 Google Cloud Console 申請 OAuth 憑證：

1. 前往 <https://console.cloud.google.com/> → 建立專案（或選現有專案）。
2. 左側選單 →「API 和服務」→「OAuth 同意畫面」：
   - User Type 選「外部」。
   - 填入應用程式名稱、你的 email。
   - 「測試使用者」加入你（與其他要授權的人）的 Google email。
   - 範圍只需預設的 `email`、`profile`、`openid`。
3. 「API 和服務」→「憑證」→「建立憑證」→「OAuth 用戶端 ID」：
   - 應用程式類型選「網頁應用程式」。
   - **已授權的重新導向 URI** 填入你的 Worker 網址加 `/auth/callback`，例如：
     ```
     https://pokemon.<你的帳號子網域>.workers.dev/auth/callback
     ```
     （部署一次後即可在 Cloudflare 看到實際網址；多個網址可都加進去）
4. 取得 **用戶端 ID** 與 **用戶端密鑰**，設為 Worker 機密：
   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

### 2. 設定登入白名單

在 `wrangler.toml` 的 `[vars]` 設定允許登入的 email（逗號分隔）：

```toml
[vars]
ALLOWED_EMAILS = "you@gmail.com,friend@gmail.com"
```

- 留空字串 = 任何 Google 帳號都能登入（各自有自己的盒子）。
- 公開頁面（搜尋 / 排行 / 剋制）不需登入即可使用，只有盒子需要。

### 3. 部署

```bash
npm run deploy
```

## 環境變數

| 變數 | 種類 | 說明 |
|------|------|------|
| `GOOGLE_CLIENT_ID` | secret | Google OAuth 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | secret | Google OAuth 用戶端密鑰 |
| `ALLOWED_EMAILS` | var | 允許登入的 email 白名單（逗號分隔，留空=全部） |

## API 端點

公開：
- `GET /` — 手機網頁
- `GET /api/search?q=` — 寶可夢搜尋
- `GET /api/names` — 全部名稱（自動完成）
- `GET /api/leagues` — 所有聯盟 + 當下開放聯盟
- `GET /api/rankings?league=&limit=` — 單一聯盟排行
- `GET /api/meta` — 三聯盟 Meta 分析
- `GET /api/types`、`GET /api/type?type=&mode=` — 屬性剋制

登入：
- `GET /auth/login` → Google → `GET /auth/callback`、`GET /auth/logout`、`GET /api/me`

需登入（身分取自 session，不信任前端傳來的 ID）：
- `GET/POST /api/box`、`POST /api/analyze`、`POST /api/clean-box`
- `GET/POST /api/account-names`、`GET/POST /api/trash`

## 專案結構

```
src/
├── worker.ts            # 入口：路由 (SPA + API + 登入)
├── auth.ts              # Google OAuth + session
├── types.ts             # 型別定義
├── constants.ts         # 聯盟 / 屬性表 / 設定
├── handlers/
│   ├── search.ts        # 搜尋 + 名稱清單
│   ├── league.ts        # 聯盟排行 + Meta 分析
│   ├── box.ts           # 盒子隊伍分析 + 清垃圾
│   └── types.ts         # 屬性剋制查詢
├── utils/
│   ├── cache.ts         # 資料抓取 / 記憶體快取 / 當下聯盟
│   ├── userdata.ts      # 盒子 / 垃圾 / 帳號名稱 (KV，以登入身分為 key)
│   └── helpers.ts       # 通用工具 (名稱解析 / 屬性計算)
└── web/
    └── app.ts           # 手機版 SPA (HTML/CSS/JS)

data/                    # JSON 資料 (GitHub Actions 每日更新)
scripts/                 # Python 自動化腳本
```
