# ⚡ PokeMaster PRO - Telegram PvP 戰術分析機器人

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat&logo=cloudflare)
![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-blue?style=flat&logo=telegram)
![Status](https://img.shields.io/badge/Status-Active-success)

**PokeMaster PRO** 是一個基於 Cloudflare Workers 的無伺服器 Telegram 機器人，專為 Pokemon GO PvP 玩家設計。它提供即時的 PvPoke 排名查詢、屬性剋制分析、招式數據以及活動通知。

本專案內建嚴格的**權限控管系統 (Gatekeeper)**，採用「申請 -> 審核」制，並配備可視化的後台管理面板。

---

## 🚀 主要功能 (Features)

### 🔍 玩家查詢功能
* **PvP 排名查詢**：支援超級 (1500)、高級 (2500)、大師 (無上限) 及特殊盃賽排名。
* **詳細數據**：顯示寶可夢的最佳招式（包含厲害招式標記）、評分與排名。
* **屬性分析**：互動式選單查詢攻擊與防禦屬性剋制表。
* **活動偵測**：自動偵測並提示相關的社群日或活動資訊。
* **垃圾清單**：個人化的 `/trash` 清單，標記不感興趣的寶可夢。

### 🛡️ 管理員後台系統 (v2.0 新增)
* **嚴格權限控管**：預設封鎖所有陌生用戶，需經管理員核准才可使用。
* **群組審核通知**：陌生人嘗試使用時，通知會發送至指定的管理群組 (`ADMIN_GROUP_UID`)，並附帶「✅ 批准 / 🚫 封禁」按鈕。
* **黑名單管理面板**：
    * 透過指令 `/banlist` 呼叫互動式面板。
    * **可視化管理**：列出被封禁用戶的 UID 與名稱 (Username)。
    * **一鍵解封**：點擊按鈕即可立即移除黑名單。
    * *安全鎖定：僅限超級管理員 (`ADMIN_UID`) 可操作此面板。*

---

## 🛠️ 技術架構

* **Runtime**: Cloudflare Workers (Serverless)
* **Database**: Cloudflare KV (儲存排名快取、白名單、黑名單、垃圾清單)
* **Data Source**: GitHub Raw Data (PvPoke 排名數據)
* **Language**: JavaScript (ES Modules)

---

## ⚙️ 環境變數設定 (Environment Variables)

部署至 Cloudflare Workers 前，請務必在後台設定以下變數：

| 變數名稱 | 說明 | 範例值 |
| :--- | :--- | :--- |
| `ENV_BOT_TOKEN` | Telegram Bot Token (從 BotFather 取得) | `123456:ABC-def...` |
| `ENV_BOT_SECRET` | Webhook Secret Token (自訂，用於驗證請求) | `my-secret-token` |
| `ADMIN_UID` | **超級管理員 UID** (個人)<br>擁有最高權限，可操作 `/banlist` 與解封。 | `123456789` (請填入您的 UID) |
| `ADMIN_GROUP_UID` | **管理群組 ID**<br>用於接收審核通知與操作一般審核按鈕。 | `-100xxxxxxxx` |
| `POKEMON_KV` | **KV Namespace Binding**<br>綁定您的 KV 儲存空間。 | (在 wrangler.toml 或後台綁定) |

> **注意**：`ADMIN_UID` 必須是個人的正數 ID，`ADMIN_GROUP_UID` 通常是 `-100` 開頭的群組 ID。

---

## 📦 部署指南 (Deployment)

1.  **安裝依賴**
    ```bash
    npm install
    ```

2.  **設定 Wrangler**
    確保 `wrangler.toml` 已配置正確的 KV namespace binding。

3.  **部署至 Cloudflare**
    ```bash
    npx wrangler deploy
    ```

4.  **設定 Webhook**
    部署完成後，執行一次 `registerWebhook` 或是使用瀏覽器訪問：
    `https://<YOUR_WORKER_URL>/registerWebhook` (需配合程式碼中的路由實作，或手動使用 curl 設定)。

---

## 📝 指令列表 (Commands)

建議在 BotFather 中設定以下指令提示：

```text
start - 🚀 啟動機器人 / 顯示主選單
menu - 📱 呼叫功能面板
help - ℹ️ 使用說明與範例
trash - 🗑️ 查看或加入垃圾清單
great_league_top - 🏆 超級聯盟排名 (1500)
ultra_league_top - 🌙 高級聯盟排名 (2500)
master_league_top - 👑 大師聯盟排名 (Max)
banlist - 💀 [管理員] 黑名單控制台
