# 🍌 Macro Banana — 架構文件

> 最後更新：2026-04-30  
> 版本：2.0.0

---

## 目錄

1. [專案概述](#1-專案概述)
2. [技術棧](#2-技術棧)
3. [目錄結構](#3-目錄結構)
4. [設計系統](#4-設計系統)
5. [頁面詳解](#5-頁面詳解)
   - [Studio（主工作室）](#51-studio主工作室)
   - [Tasks（任務管理）](#52-tasks任務管理)
   - [Cost（成本追蹤）](#53-cost成本追蹤)
   - [Settings（設定）](#54-settings設定)
6. [元件](#6-元件)
7. [服務層 & Hooks](#7-服務層--hooks)
8. [API 路由](#8-api-路由)
9. [模型規格](#9-模型規格)
10. [資料流](#10-資料流)
11. [localStorage 結構](#11-localstorage-結構)
12. [靜態資源](#12-靜態資源)
13. [環境變數](#13-環境變數)
14. [啟動方式](#14-啟動方式)

---

## 1. 專案概述

**Macro Banana** 是一個 AI 圖像與影片生成工作室前端，透過後端代理呼叫多個 AI 模型 API，支援：

- 圖像生成（GPT Image 2、Nano Banana 系列）
- 影片生成（Seedance 2.0、Veo 3.1 Fast）
- 批量提交（最多 4 個任務同時）
- 任務狀態輪詢與管理
- 個人 / 群組工作區切換
- 收藏、篩選、排序
- 成本追蹤

---

## 2. 技術棧

| 項目 | 版本 |
|------|------|
| Next.js | 15.3.1（Turbopack） |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 3.4 |
| Axios | 1.7 |

---

## 3. 目錄結構

```
macro-banana/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根佈局（Navbar + ToastProvider）
│   │   ├── globals.css             # CSS 變數 + 全局樣式
│   │   ├── page.tsx                # 首頁（redirect → /studio）
│   │   ├── studio/page.tsx         # 主工作室（1000+ 行）
│   │   ├── tasks/page.tsx          # 任務列表 + 詳情面板
│   │   ├── cost/page.tsx           # 成本追蹤
│   │   ├── settings/page.tsx       # 設定頁面
│   │   └── api/
│   │       ├── generate/route.ts   # POST /api/generate
│   │       └── tasks/[id]/route.ts # GET /api/tasks/[id]
│   ├── components/
│   │   ├── Navbar.tsx              # 導航欄 + API 健康檢查
│   │   └── Toast.tsx               # 吐司通知系統
│   ├── services/
│   │   └── api.ts                  # API 客戶端 + localStorage 工具
│   └── hooks/
│       └── usePolling.ts           # 任務狀態輪詢 Hook
├── public/
│   └── pic/
│       ├── *.png                   # 個人圖像 mock 資料
│       ├── video/                  # 個人影片 mock 資料（.mp4）
│       └── group/
│           ├── *.png               # 群組圖像 mock 資料
│           └── video/              # 群組影片 mock 資料（.mp4）
├── pic/                            # 原始 mock 資源（不對外 serve）
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. 設計系統

### CSS 變數（`globals.css`）

```css
/* 主色 */
--color-purple:        #7132f5
--color-purple-dark:   #5a28c4
--color-purple-subtle: rgba(113, 50, 245, 0.18)
--color-green:         #4ade80

/* 背景層次（由深到淺） */
--color-base:    #0d0d12   /* 最底層背景 */
--color-surface: #111118   /* Navbar 背景 */
--color-panel:   #16161f   /* 卡片背景 */
--color-raised:  #1c1c28   /* 輸入框背景 */
--color-hover:   #22222f   /* hover 狀態 */

/* 文字層次 */
--color-text:    #f0f0f5   /* 主要文字 */
--color-muted:   #8888a0   /* 次要文字 */
--color-faint:   #55556a   /* 輔助文字 */
--color-border:  rgba(255,255,255,0.08)
```

### Tailwind 擴展

```typescript
colors.purple.DEFAULT → var(--color-purple)
textColor.text/muted/faint → CSS 變數
backgroundColor.base/surface/panel/raised/hover → CSS 變數
```

### 全局元件類

- `.chip` — 可點擊的參數標籤（Settings 頁面使用）
- `.chip.active` — 選中狀態（紫色邊框 + 背景）

---

## 5. 頁面詳解

### 5.1 Studio（主工作室）

**路徑**: `/studio`  
**檔案**: `src/app/studio/page.tsx`

#### 佈局結構

```
┌─────────────────────────────────────────────┐
│  Toolbar Row 1: [👤 Personal | 👥 Group]  [slider] │
│  Toolbar Row 2: [All|Images|Videos|♥] [↓Newest|↑Oldest] │
├─────────────────────────────────────────────┤
│                                             │
│   瀑布流 Gallery（columns CSS）              │
│   OutputCard × N                            │
│                                             │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │ [Image|Video] [+] [refs] [textarea] │[GEN]│
│  │ [Model][Ratio][Quality][Res][Dur][Mode][Audio] │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

#### State 完整列表

| State | 類型 | 說明 |
|-------|------|------|
| `tab` | `'image' \| 'video'` | 當前媒體類型 |
| `prompt` | `string` | 提示詞 |
| `model` | `string` | 選中的模型 ID |
| `ratio` | `string` | 比例（如 `'9:16'`） |
| `quality` | `string` | 品質（`'standard'` / `'high'`） |
| `resolution` | `string` | 解析度（如 `'1080p'`） |
| `duration` | `number` | 時長（秒） |
| `audio` | `boolean` | 是否生成音訊 |
| `thinking` | `string` | GPT Image 2 思考模式 |
| `background` | `string` | GPT Image 2 背景選項 |
| `seedanceMode` | `string` | Seedance 生成模式 |
| `count` | `number` | 批量數量（1-4） |
| `refs` | `File[]` | 參考圖像/影片（最多 9 個） |
| `loading` | `boolean` | 提交中 |
| `error` | `string` | 錯誤訊息 |
| `outputs` | `Task[]` | 輸出任務列表 |
| `selectedTask` | `Task \| null` | 詳情 modal 的任務 |
| `workspace` | `'personal' \| 'group'` | 工作區 |
| `favorites` | `Set<string>` | 個人收藏 task_id |
| `groupFavorites` | `Set<string>` | 群組收藏 task_id |
| `mediaFilter` | `'all' \| 'image' \| 'video' \| 'favorites'` | 媒體篩選 |
| `sortOrder` | `'newest' \| 'oldest'` | 個人排序 |
| `groupSortOrder` | `'newest' \| 'oldest'` | 群組排序 |
| `colWidth` | `number` | 卡片欄寬（120-360px） |
| `groupExtra` | `Task[]` | 從個人加入群組的任務 |

#### 主要函數

| 函數 | 說明 |
|------|------|
| `switchTab(t)` | 切換 Image/Video，重置模型和選項 |
| `handleModelChange(m)` | 切換模型，自動 clamp 不支援的選項 |
| `handleGenerate()` | 批量提交任務，保存到 localStorage |
| `toggleFavorite(id)` | 切換收藏，持久化到 localStorage |
| `autoResize(el)` | textarea 自動高度（最大 144px） |

#### 子元件

| 元件 | 說明 |
|------|------|
| `Popover` | 通用下拉容器，點擊外部關閉，位置夾緊視口 |
| `Pill` | 參數標籤（圖標 + 文字） |
| `Opt` | 下拉選項按鈕 |
| `RefThumb` | 參考圖縮圖（hover 顯示移除） |
| `OutputCard` | 輸出卡片（hover 播放影片、收藏按鈕） |
| `DetailModal` | 詳情 modal（媒體預覽 + 參數 + 操作） |

#### DetailModal 操作按鈕

| 按鈕 | 條件 | 說明 |
|------|------|------|
| ↺ Use Prompt in Studio | 有 video_url | 填入 prompt 到輸入框 |
| 🖼 Use as Reference Image | 圖像（非影片） | fetch blob → File → refs |
| 👥 Add to Group | 個人工作區 | 複製到 groupExtra |
| ↓ Download | 有 video_url | 直接下載 |

#### Mock 資料

- **個人圖像**：11 張（`/pic/*.png`）
- **個人影片**：5 個（`/pic/video/*.mp4`）
- **群組圖像**：5 張（`/pic/group/*.png`）
- **群組影片**：3 個（`/pic/group/video/*.mp4`）

---

### 5.2 Tasks（任務管理）

**路徑**: `/tasks`  
**檔案**: `src/app/tasks/page.tsx`

#### 佈局

```
┌──────────────┬──────────────────────────────┐
│  任務列表     │  詳情面板（選中時顯示）         │
│  (380px)     │                              │
│  ─────────── │  媒體預覽                     │
│  任務卡片 ×N  │  提示詞                       │
│              │  參數（模型/解析度/時長）        │
│              │  成本計算                     │
│              │  操作按鈕                     │
└──────────────┴──────────────────────────────┘
```

#### 任務狀態顏色

| 狀態 | 顏色 |
|------|------|
| queued | 灰色 |
| running | 紫色（動畫進度條） |
| succeeded | 綠色 |
| failed | 紅色 |
| expired | 灰色 |

#### 功能

- 每 30 秒更新時間顯示（`timeAgo`）
- 24 小時後任務過期（`expiresIn`）
- 清除過期任務按鈕
- 刪除單個任務
- 繼續上一幀（跳轉 Studio 並帶 `?ref=` 參數）
- 重新提交失敗任務

---

### 5.3 Cost（成本追蹤）

**路徑**: `/cost`  
**檔案**: `src/app/cost/page.tsx`

#### 功能

- 時間範圍篩選：7 天 / 30 天 / 全部
- 統計卡片：完成任務數、總 Token、總成本（USD）
- 費率參考表（5s/10s/15s 1080p）
- 任務明細列表

#### 費率

```
T2V / I2V：$6.40 / 1M tokens
V2V：       $3.90 / 1M tokens
```

---

### 5.4 Settings（設定）

**路徑**: `/settings`  
**檔案**: `src/app/settings/page.tsx`

#### 設定項目

| 項目 | 類型 | 預設值 |
|------|------|--------|
| `apiBaseUrl` | URL | `http://localhost:3001` |
| `webhookUrl` | URL | `''`（可選） |
| `defaultResolution` | string | `'1080p'` |
| `defaultRatio` | string | `'9:16'` |
| `defaultDuration` | number | `5` |
| `defaultImageModel` | string | `'gpt-image-2'` |
| `defaultVideoModel` | string | `'doubao-seedance-2-0-260128'` |

持久化到 `localStorage['seedance_settings']`

---

## 6. 元件

### Navbar（`src/components/Navbar.tsx`）

- 高度：48px
- 左側：🍌 Macro Banana logo + 導航連結
- 右側：API Proxy 狀態指示燈
- 每 30 秒 ping `/api/health`
  - 綠色發光 = 在線
  - 紅色 = 離線
  - 灰色 = 檢查中

### Toast（`src/components/Toast.tsx`）

- Context API 架構
- `useToast()` hook 返回 `add(message, type)` 函數
- 自動 3 秒後消失
- 位置：右下角固定
- 類型：`success`（綠）/ `error`（紅）/ `info`（灰）

---

## 7. 服務層 & Hooks

### `src/services/api.ts`

#### Axios 實例

```typescript
baseURL: '/api'
// 429 自動重試（指數退避，最多 3 次）
```

#### 介面

```typescript
interface TaskPayload {
  model: string
  content: unknown[]       // [{ type: 'text', text }, { type: 'image_url', ... }]
  resolution: string
  ratio: string
  duration: number
  generate_audio?: boolean
  watermark?: boolean
  return_last_frame?: boolean
  seed?: number
  quality?: string         // 圖像品質
  thinking?: string        // GPT Image 2 思考模式
  background?: string      // GPT Image 2 背景
  mode?: string            // Seedance 模式
}

interface Task {
  task_id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'cancelled'
  prompt?: string
  model?: string
  resolution?: string
  ratio?: string
  duration?: number
  created_at?: number
  video_url?: string | null
  last_frame_url?: string | null
  seed?: number | null
  error_message?: string
  usage?: { completion_tokens: number }
}
```

#### 函數

| 函數 | 說明 |
|------|------|
| `submitTask(payload)` | POST /api/generate |
| `getTaskStatus(taskId)` | GET /api/tasks/[id] |
| `loadTasks()` | 從 localStorage 讀取 |
| `saveTask(task)` | 新增或更新任務 |
| `deleteTask(taskId)` | 刪除任務 |
| `clearExpiredTasks()` | 清除過期任務 |
| `loadSettings()` | 讀取設定 |
| `saveSettings(settings)` | 保存設定 |
| `calcCost(tokens, isV2V)` | 計算成本字串 |

### `src/hooks/usePolling.ts`

```typescript
usePolling(taskIds, getStatus, onUpdate)
```

- 初始延遲：10 秒
- 指數退避：× 1.5（失敗時 × 2），上限 60 秒
- 終止條件：`succeeded | failed | expired | cancelled`
- 組件卸載時自動清除所有計時器

---

## 8. API 路由

### `POST /api/generate`

```
請求 → Next.js → POST ${BACKEND_URL}/api/generate
回應 → { task_id: string }
錯誤 → 502 (後端不可達)
```

### `GET /api/tasks/[id]`

```
請求 → Next.js → GET ${BACKEND_URL}/api/tasks/${id}
回應 → Task 物件
錯誤 → 502 (後端不可達)
```

### `GET /api/health`（由 Navbar 使用）

```
由後端提供，Next.js 透過 rewrites 代理
用於檢查後端連線狀態
```

---

## 9. 模型規格

### 圖像模型

| 模型 ID | 顯示名稱 | 解析度 | 比例 | 品質 | 特殊選項 |
|---------|---------|--------|------|------|---------|
| `gpt-image-2` | GPT Image 2 | 1K / 1.5K / 2K | 1:1, 3:2, 2:3, 2:1, 1:2 | standard / high | thinking (off/low/medium/high), background (auto/transparent/opaque) |
| `nano-banana-2` | Nano Banana 2 | 512 / 1K / 2K | 1:1, 4:3, 3:4, 16:9, 9:16 | standard / high | — |
| `nano-banana-pro` | Nano Banana Pro | 512 / 1K / 2K / 4K | 1:1, 4:3, 3:4, 16:9, 9:16 | standard / high | — |

### 影片模型

| 模型 ID | 顯示名稱 | 解析度 | 比例 | 時長 | 特殊選項 |
|---------|---------|--------|------|------|---------|
| `doubao-seedance-2-0-260128` | Seedance 2.0 | 480p / 720p / 1080p | 16:9, 9:16, 4:3, 3:4, 1:1, 21:9 | 4-15s（任意整數） | mode: text_to_video / first_last_frames / omni_reference |
| `doubao-seedance-2-0-fast-260128` | Seedance 2.0 Fast | 480p / 720p | 同上 | 4-15s | 同上 |
| `veo-3-1-fast` | Veo 3.1 Fast | 720p / 1080p | 16:9, 9:16 | 4 / 6 / 8s | — |

### 音訊支援

- Seedance：僅 `omni_reference` 模式
- Veo 3.1 Fast：原生支援

---

## 10. 資料流

```
用戶輸入 prompt + 選擇參數
        ↓
handleGenerate()
        ↓
submitTask() × count → POST /api/generate
        ↓
後端返回 task_id × count
        ↓
saveTask() → localStorage['seedance_tasks']
setOutputs([...newTasks, ...prev])
        ↓
usePolling 開始輪詢（10s 起，指數退避）
        ↓
GET /api/tasks/[id]
        ↓
handleUpdate(task)
  ├─ saveTask() 更新 localStorage
  ├─ setOutputs() 更新 UI
  ├─ toast('Generation complete') 若 succeeded
  └─ toast('Generation failed') 若 failed
        ↓
OutputCard 顯示結果
        ↓
點擊卡片 → DetailModal
  ├─ 重用 Prompt
  ├─ 用作參考圖
  ├─ 加入群組
  └─ 下載
```

---

## 11. localStorage 結構

| 鍵 | 類型 | 說明 |
|----|------|------|
| `seedance_tasks` | `Task[]` | 所有任務（最新在前） |
| `seedance_settings` | `Settings` | 用戶設定 |
| `seedance_favorites_personal` | `string[]` | 個人收藏的 task_id |
| `seedance_favorites_group` | `string[]` | 群組收藏的 task_id |

---

## 12. 靜態資源

```
public/pic/
├── *.png                    # 個人 mock 圖像（11 張）
├── video/
│   ├── ad2boy.mp4
│   ├── e1.mp4 ~ e4.mp4      # 個人 mock 影片（5 個）
└── group/
    ├── group-generated-*.png # 群組 mock 圖像（5 張）
    └── video/
        ├── g1.mp4 ~ g3.mp4  # 群組 mock 影片（3 個）
```

> **注意**：`pic/` 根目錄為原始資源，`public/pic/` 為對外 serve 的副本。

---

## 13. 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `BACKEND_URL` | 後端 API 基礎 URL | `http://localhost:3001` |

設定於 `.env.local`：

```env
BACKEND_URL=http://localhost:3001
```

---

## 14. 啟動方式

```bash
# 安裝依賴
npm install

# 開發模式（Turbopack）
npx next dev --turbopack
# → http://localhost:3000

# 生產構建
npm run build
npm start
```

> **注意**：需要後端服務在 `BACKEND_URL` 運行，否則 API 呼叫會返回 502。  
> 前端 UI 和 mock 資料在無後端情況下仍可正常瀏覽。
