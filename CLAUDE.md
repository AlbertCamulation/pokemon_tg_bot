# CLAUDE.md - Pokemon PvP 手機網頁 開發指南

## 專案概述

**Pokemon GO PvP 戰術分析手機網頁**，部署在 Cloudflare Workers。
查詢寶可夢 PvP 排名、技能、屬性剋制；登入後可管理對戰盒子並取得最佳隊伍分析。

> v2.0：本專案原為 Telegram Bot，已全面改寫為獨立手機網頁，改用 **Google 登入**做跨裝置同步。
> Telegram 相關程式碼（webhook、admin、gatekeeper）已全部移除。

## 技術棧

- **執行環境**：Cloudflare Workers (Serverless)
- **語言**：TypeScript（無打包步驟，wrangler 直接 bundle `src/worker.ts`）
- **前端**：原生 SPA（`src/web/app.ts` 匯出單一 HTML 字串）
- **登入**：Google OAuth 2.0（白名單 email，session 存 KV，sid cookie）
- **儲存**：Cloudflare KV（盒子 / 垃圾清單 / session）
- **資料**：PvPoke 排名、wingzero.tw 活動（GitHub Actions 每日更新）

## 專案結構

```
src/
├── worker.ts            # 入口：路由 (SPA + 公開 API + 登入 + 受保護 API)
├── auth.ts              # Google OAuth + session 管理
├── types.ts             # 型別定義
├── constants.ts         # 聯盟設定 / 屬性相剋表 / 常數
├── handlers/
│   ├── index.ts         # 統一匯出
│   ├── search.ts        # searchPokemon / getAllPokemonNames
│   ├── league.ts        # getLeagueRankingData / getMetaAnalysisData
│   ├── box.ts           # analyzeUserBoxTeam / filterGarbage
│   └── types.ts         # getTypeQuery / getAllTypeOptions
├── utils/
│   ├── index.ts         # 統一匯出
│   ├── cache.ts         # 資料抓取 / 記憶體快取 / getActiveLeagues
│   ├── userdata.ts      # 盒子 / 垃圾 / 帳號名稱 (KV，key 為 Google sub)
│   └── helpers.ts       # 名稱解析 / 屬性計算 / 評級
└── web/
    └── app.ts           # 手機版 SPA (HTML/CSS/JS，APP_HTML)

data/                    # JSON 資料 (rankings_*.json, all_rankings_bundle.json, ...)
scripts/                 # Python 自動化腳本
wrangler.toml            # Cloudflare 設定
```

## 常用指令

```bash
npm install
npm run dev          # wrangler dev
npm run typecheck    # tsc --noEmit
npm run deploy       # wrangler deploy
npm run tail         # 日誌
```

資料更新：`python scripts/fetch_data.py`、`python scripts/update_events.py`

## 環境變數

| 變數 | 種類 | 說明 |
|------|------|------|
| `GOOGLE_CLIENT_ID` | secret | Google OAuth 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | secret | Google OAuth 用戶端密鑰 |
| `ALLOWED_EMAILS` | var (wrangler.toml) | 允許登入 email 白名單（逗號分隔，留空=全部） |

## 核心架構

### 路由 (`src/worker.ts`)
- `GET /` → SPA
- 公開 API：`/api/search`、`/api/names`、`/api/leagues`、`/api/rankings`、`/api/meta`、`/api/types`、`/api/type`
- 登入：`/auth/login`、`/auth/callback`、`/auth/logout`、`/api/me`
- 受保護 API（需 session）：`/api/box`、`/api/analyze`、`/api/clean-box`、`/api/account-names`、`/api/trash`

### 登入與權限 (`src/auth.ts`)
- Google OAuth authorization code flow；id_token 由 token endpoint 取得（走 TLS，僅解碼 payload）。
- session 存 KV `session_{sid}`，sid 放 HttpOnly Secure cookie。
- email 白名單在 `ALLOWED_EMAILS`。
- **安全要點**：所有個人資料 API 的使用者身分一律取自 session（`session.sub`），**不信任**前端傳來的任何 userId（修正了舊版的 IDOR/冒用問題）。

### 個人資料 (`src/utils/userdata.ts`)
- 盒子 key：`box_{sub}_{acct}_{cp}` → `{ box: string[], favs: string[] }`
- 帳號名稱：`acctnames_{sub}`；垃圾清單：`trash_{sub}`

### 資料快取 (`src/utils/cache.ts`)
- 記憶體快取：trans / moves / events / bundle。
- 主要走 `getAllRankingsBundle()`（大禮包），失敗才退回單檔。
- 空值不寫入快取，避免毒化 isolate。
- `getActiveLeagues()` 5 分鐘快取，對照 manifest 與本地 `leagues`。

## 修改注意事項

### 新增聯盟/杯賽
1. `src/constants.ts` 的 `leagues` 陣列新增 `{ command, name, cp, path }`。
2. 確保 `data/` 有對應排名 JSON（會被打包進 `all_rankings_bundle.json`）。

### 前端修改 (`src/web/app.ts`)
- 是一段純 HTML/CSS/JS 字串（非編譯內容）。
- **前端 JS 刻意不使用樣板字面值**（template literal），以免與外層 TS 樣板字串跳脫衝突。
- DOM 一律用 `h()` 輔助函式以 `textContent` 建立，**禁止**把使用者資料塞進 `innerHTML`（避免 XSS）。

### 分析邏輯回傳 JSON
- 所有 handler 回傳結構化資料，由前端渲染（不再產生 Telegram HTML 字串）。

## 常見問題

- **登入失敗**：檢查 Google「重新導向 URI」是否填了 `https://<worker網址>/auth/callback`；`GOOGLE_CLIENT_ID/SECRET` 是否已 `wrangler secret put`。
- **登入被擋**：email 不在 `ALLOWED_EMAILS` 白名單。
- **資料未更新**：檢查 GitHub Actions；`data/manifest.json` 為空時當下聯盟會退回標準三聯盟。
- **型別錯誤**：`npm run typecheck`。
