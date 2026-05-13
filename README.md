# 🍌 Macro Banana — AI 圖像與影片生成工作室

> Next.js 16 前端，支援圖像生成（GPT Image 2、Nano Banana）與影片生成（Seedance 2.0）。  
> 採用深色設計系統（金黃品牌色 `#FFD700`）。

---

## 快速開始

```bash
cd seedance-ui
npm install
npm run dev
# → http://localhost:3000
```

---

## 頁面總覽

| 路徑 | 說明 |
|------|------|
| `/studio` | 主工作室：生成圖像 / 影片、管理輸出、個人 / 群組工作區 |
| `/guide` | 提示指南：Image Guide 與 Video Planner |
| `/grid` | 格線工具：組合圖像成網格版面 |
| `/settings` | 設定：API URL、模型預設值、語言 |

---

## 技術棧

| 項目 | 版本 |
|------|------|
| Next.js | 16.2.5（App Router + Turbopack） |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 3.4 |
| Axios | 1.7 |

---

## 環境變數

建立 `.env.local`：

```env
# 後端 API 基礎 URL（Next.js API Routes 代理目標）
BACKEND_URL=http://localhost:3001

# Firebase（若啟用 Firebase 後端，見 FIREBASE.md）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## 後端 API 端點

前端透過 `/api` 代理呼叫後端（由 `next.config.ts` rewrites 設定）：

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/api/generate` | 提交生成任務，回傳 `{ task_id }` |
| `GET` | `/api/tasks/:id` | 查詢任務狀態，回傳 `Task` 物件 |
| `GET` | `/api/health` | 後端健康檢查（Navbar 每 30 秒 ping） |

---

## 多語言支援

UI 支援繁體中文（zh-TW）與英文（en），透過右上角用戶頭像切換。  
語言偏好持久化至 `localStorage['mb-language']`。  
翻譯字串定義於 `src/lib/i18n.ts`。

---

## 詳細文件

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 完整架構、元件、資料流說明 |
| [FIREBASE.md](./FIREBASE.md) | Firebase 後端串接指南 |
| [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) | Google 帳號登入串接指南 |

---

## 指令總覽

```bash
npm run dev        # 開發模式（Turbopack）
npm run build      # 生產構建
npm start          # 生產模式啟動
npm run lint       # ESLint 檢查
npm run test       # Vitest 單元測試
```
