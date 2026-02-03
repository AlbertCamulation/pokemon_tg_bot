# CLAUDE.md - Pokemon Telegram Bot 開發指南

## 專案概述

這是一個 **Pokemon GO PvP 戰術分析 Telegram 機器人**，部署在 Cloudflare Workers 上。主要功能是查詢寶可夢的 PvP 排名、技能組合、屬性剋制等資訊。

## 技術棧

- **執行環境**: Cloudflare Workers (Serverless)
- **語言**: TypeScript
- **資料庫**: Cloudflare KV (鍵值存儲，用於用戶權限管理)
- **API**: Telegram Bot API
- **資料來源**: PvPoke 排名數據、wingzero.tw 活動資訊
- **自動化**: GitHub Actions (每日更新排名和活動資料)

## 專案結構

```
/
├── src/                       # TypeScript 原始碼
│   ├── worker.ts              # 主程式入口點
│   ├── types.ts               # 型別定義
│   ├── constants.ts           # 常數與設定
│   ├── handlers/              # 功能處理器
│   │   ├── index.ts           # 統一匯出
│   │   ├── search.ts          # 寶可夢搜尋
│   │   ├── menu.ts            # 選單與按鈕
│   │   ├── league.ts          # 聯盟排名
│   │   ├── trash.ts           # 垃圾清單
│   │   └── admin.ts           # 管理員功能
│   ├── utils/                 # 工具函數
│   │   ├── index.ts           # 統一匯出
│   │   ├── cache.ts           # 快取管理
│   │   ├── telegram.ts        # Telegram API
│   │   ├── kv.ts              # KV 存儲操作
│   │   └── helpers.ts         # 通用工具
│   └── web/
│       └── html.ts            # Web 介面 HTML
├── data/                      # JSON 資料檔案
│   ├── rankings_*.json        # 各聯盟排名
│   ├── chinese_translation.json
│   ├── move.json
│   └── events.json
├── scripts/                   # Python 自動化腳本
│   ├── fetch_data.py
│   └── update_events.py
├── worker.js                  # 舊版 JavaScript (保留)
├── wrangler.toml              # Cloudflare Workers 設定
├── tsconfig.json              # TypeScript 設定
├── package.json               # npm 套件設定
└── .github/workflows/         # GitHub Actions
```

## 常用指令

### 安裝依賴

```bash
npm install
```

### 部署與開發

```bash
# 本地開發
npm run dev
# 或
npx wrangler dev

# 部署到 Cloudflare
npm run deploy
# 或
npx wrangler deploy

# 查看日誌
npm run tail
# 或
npx wrangler tail

# TypeScript 型別檢查
npm run typecheck
```

### 資料更新

```bash
# 手動更新排名資料
python scripts/fetch_data.py

# 手動更新活動資料
python scripts/update_events.py
```

## 環境變數

| 變數名稱 | 說明 |
|---------|------|
| `ENV_BOT_TOKEN` | Telegram Bot Token (從 BotFather 取得) |
| `ENV_BOT_SECRET` | Webhook 驗證密鑰 |
| `ADMIN_UID` | 超級管理員 User ID |
| `ADMIN_GROUP_UID` | 管理群組 ID (格式: `-100...`) |

## 核心架構

### 模組說明

| 模組 | 說明 |
|-----|------|
| `src/worker.ts` | 主入口，處理路由和 Webhook |
| `src/types.ts` | 所有 TypeScript 型別定義 |
| `src/constants.ts` | 聯盟設定、屬性表、正則表達式 |
| `src/handlers/search.ts` | 寶可夢搜尋邏輯 |
| `src/handlers/league.ts` | 聯盟排名和 Meta 分析 |
| `src/handlers/menu.ts` | 選單生成和屬性查詢 |
| `src/utils/cache.ts` | 快取管理 (全域 + HTTP) |
| `src/utils/telegram.ts` | Telegram API 封裝 |
| `src/utils/kv.ts` | KV 存儲操作 |

### 權限系統 (Gatekeeper)

預設拒絕所有用戶，需管理員審核：
1. 超級管理員 (`ADMIN_UID`) - 完全權限
2. 管理群組成員 - 可審核用戶
3. 白名單用戶 - 已授權使用
4. 黑名單用戶 - 永久封禁

### API 端點

- `POST /endpoint` - Telegram Webhook
- `GET /api/search?q=<query>` - 寶可夢搜尋 API
- `GET /api/names` - 取得所有寶可夢名稱 (自動完成用)
- `GET /registerWebhook` - 註冊 Webhook
- `GET /` - Web 介面

### 資料快取策略

快取定義在 `src/utils/cache.ts`：
- 全域記憶體快取: `GLOBAL_TRANS_CACHE`, `GLOBAL_MOVES_CACHE`, `GLOBAL_EVENTS_CACHE`
- 排名快取: `GLOBAL_RANKINGS_CACHE` (Map 結構)
- HTTP 快取: 24 小時 TTL

## 聯盟類型

| CP 上限 | 聯盟名稱 | 變體杯賽 |
|--------|---------|---------|
| 500 | 小聯盟 | - |
| 1500 | 超級聯盟 | 假日杯、陽光杯、復古杯、萬聖杯等 |
| 2500 | 高級聯盟 | 假日杯、菁英杯、夏日杯 |
| 10000 | 大師聯盟 | 菁英杯、元老杯 |

## 修改注意事項

### 新增聯盟/杯賽

1. 在 `src/constants.ts` 中找到 `leagues` 陣列
2. 新增對應的 `{ command, name, cp, path }` 物件
3. 確保 `data/` 目錄有對應的排名 JSON 檔案

### 修改權限邏輯

權限判斷在 `src/worker.ts` 的 `onMessage()` 函數中：
1. 檢查是否為超級管理員
2. 檢查是否在管理群組
3. 檢查黑名單 (使用 `src/utils/kv.ts`)
4. 檢查白名單
5. 若未授權，發送審核請求到管理群組

### 修改搜尋邏輯

搜尋邏輯在 `src/handlers/search.ts`：
- `handlePokemonSearch()` - Telegram 搜尋指令
- `getPokemonDataOnly()` - API 搜尋回應

### 新增型別

在 `src/types.ts` 中定義新型別，例如：
```typescript
export interface NewFeature {
  id: string;
  name: string;
}
```

## 資料檔案格式

### rankings_*.json

```json
[
  {
    "speciesId": "registeel",
    "speciesName": "Registeel",
    "rating": 726,
    "moveset": ["lock_on", "focus_blast", "flash_cannon"],
    "score": 99.1
  }
]
```

### chinese_translation.json

```json
[
  {
    "speciesId": "bulbasaur",
    "speciesName": "妙蛙種子",
    "types": ["grass", "poison"],
    "family": { "id": "1" },
    "eliteMoves": []
  }
]
```

## 常見問題排除

### Bot 無回應

1. 檢查 Webhook 是否正確註冊: 訪問 `/registerWebhook`
2. 檢查環境變數是否正確設定
3. 使用 `npx wrangler tail` 查看錯誤日誌

### TypeScript 編譯錯誤

1. 執行 `npm run typecheck` 檢查型別
2. 確認 `@cloudflare/workers-types` 已安裝
3. 檢查 `tsconfig.json` 設定

### 資料未更新

1. 檢查 GitHub Actions 是否正常執行
2. 手動執行 Python 腳本更新資料
3. 確認 PvPoke 網站是否可訪問

### 權限問題

1. 確認 `ADMIN_UID` 設定正確
2. 檢查 KV 中的白名單/黑名單資料
3. 使用 `/banlist` 指令管理封禁用戶
