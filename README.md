# Google Trends 每日摘要與 LINE Bot

這是一個基於 Next.js 開發的自動化工具，每天定時抓取台灣 Google Trends，利用 AI 進行摘要整理，並透過 LINE 自動推送給使用者。

## 🚀 目前開發進度 (2026-01-28)

- [x] **AI 核心**：整合 OpenAI 並建立 Gemini 備援機制 (當 OpenAI 額度不足時自動切換)。
- [x] **定時任務**：完成 Vercel Cron Job 配置，預設台灣時間每天 **08:00 AM** 執行。
- [x] **看板 UI**：完成首頁摘要看板，直接顯示 Supabase 資料庫中的歷史摘要。
- [x] **LINE 整合**：完成 Webhook 實作，機器人可回覆 User ID 供設定使用。
- [x] **安全機制**：實作 `CRON_SECRET` 驗證，防止 API 被非法濫用。

---

## 🛠️ 環境變數設定 (.env.local)

請參考 `env.example` 並在本地建立 `.env.local`：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=你的_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=你的_SERVICE_ROLE_KEY

# AI Keys
OPENAI_API_KEY=你的_OPENAI_KEY
GEMINI_API_KEY=你的_GEMINI_KEY

# LINE
LINE_CHANNEL_ACCESS_TOKEN=你的_TOKEN
LINE_CHANNEL_SECRET=你的_SECRET
LINE_USER_ID=你的_USER_ID (需透過 Webhook 取得)

# Security
CRON_SECRET=自定義隨機字串
```

---

## 📦 部署至 Vercel 指南

1.  **資料庫準備**：進入 Supabase Dashboard，在 SQL Editor 執行專案目錄下的 `supabase_schema.sql`。
2.  **上傳程式碼**：將專案推送到 GitHub 並匯入 Vercel。
3.  **設定環境變數**：在 Vercel 專案設定中手動加入上方所有環境變數。
4.  **驗證定時任務**：
    - 在 Vercel 控制台進入 **Settings -> Cron Jobs**。
    - 確認路徑為 `/api/cron/daily-digest` 並可手動點擊 "Run" 測試。

---

## 🔒 安全性說明

- `.env.local` 檔案已列入 `.gitignore`，不會被推送到 GitHub。
- 正式環境請務必使用 Vercel 的環境變數設定功能，不要將檔案上傳。
