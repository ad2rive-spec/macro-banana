# Seedance 2.0 UI

React 前端，使用 Kraken 設計系統（紫色品牌色、白底、12px 圓角按鈕）。

## 快速開始

```bash
cd seedance-ui
npm install
npm run dev
```

開啟 http://localhost:5173

## 後端需求

前端透過 `/api` 代理呼叫後端，需自行建立後端服務（API Key 放後端）：

| 端點 | 說明 |
|------|------|
| `POST /api/generate` | 提交生成任務，回傳 `{ task_id }` |
| `GET /api/tasks/:id` | 查詢任務狀態 |

## 頁面

- `/generate` — 生成影片（T2V / I2V / First+Last / Multimodal）
- `/tasks` — 任務狀態與影片下載
- `/cost` — 費用追蹤
- `/settings` — API 設定
