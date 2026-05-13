# 🍌 Macro Banana — 架構文件

> 最後更新：2026-05-13  
> 版本：2.1.0

---

## 目錄

1. [專案概述](#1-專案概述)
2. [技術棧](#2-技術棧)
3. [目錄結構](#3-目錄結構)
4. [設計系統](#4-設計系統)
5. [頁面詳解](#5-頁面詳解)
   - [Studio（主工作室）](#51-studio主工作室)
   - [Guide（提示指南）](#52-guide提示指南)
   - [Grid（格線工具）](#53-grid格線工具)
   - [Settings（設定）](#54-settings設定)
6. [元件](#6-元件)
7. [服務層 & Hooks](#7-服務層--hooks)
8. [API 路由](#8-api-路由)
9. [模型規格](#9-模型規格)
10. [資料流](#10-資料流)
11. [localStorage 結構](#11-localstorage-結構)
12. [多語言（i18n）](#12-多語言i18n)
13. [靜態資源](#13-靜態資源)
14. [環境變數](#14-環境變數)
15. [啟動方式](#15-啟動方式)

---

## 1. 專案概述

**Macro Banana** 是一個 AI 圖像與影片生成工作室前端，透過後端代理呼叫多個 AI 模型 API，支援：

- 圖像生成（GPT Image 2、Nano Banana 系列）
- 影片生成（Seedance 2.0）
- 批量提交（最多 4 個任務同時）
- 任務狀態輪詢與管理
- 個人 / 群組工作區切換
- 收藏、篩選、排序
- 提示詞指南（Image Guide + Video Planner）
- 格線排版工具（Grid Tool）
- 繁體中文 / 英文多語言支援

---

## 2. 技術棧

| 項目 | 版本 |
|------|------|
| Next.js | 16.2.5（Turbopack） |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 3.4 |
| Axios | 1.7 |
| Vitest | 4.x（單元測試） |

---

## 3. 目錄結構

```
seedance-ui/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 根佈局（Navbar + ToastProvider + LanguageProvider）
│   │   ├── globals.css                 # CSS 變數 + 全局樣式 + zh-TW 可讀性
│   │   ├── page.tsx                    # 首頁（redirect → /studio）
│   │   ├── studio/
│   │   │   └── page.tsx                # 主工作室（生成 + gallery）
│   │   ├── guide/
│   │   │   ├── page.tsx                # 提示指南容器
│   │   │   ├── types.ts                # GuideState / ShotMode / MovementId 等型別
│   │   │   ├── logic.ts                # 提示詞組裝邏輯
│   │   │   ├── planTransfer.ts         # Video Plan → Studio 參數轉換
│   │   │   ├── assetDB.ts              # IndexedDB 資產管理
│   │   │   └── components/
│   │   │       ├── GuideSidebar.tsx    # 導覽錨點 + 進度條
│   │   │       ├── AngleSelector.tsx   # 角度選擇器
│   │   │       ├── LightDirectionPicker.tsx  # 光線方向選擇器
│   │   │       └── VideoPlanner.tsx    # 影片分鏡規劃器
│   │   ├── grid/
│   │   │   ├── page.tsx                # 格線工具主頁
│   │   │   ├── GridCanvas.tsx          # Canvas 繪圖元件
│   │   │   ├── GridSidebar.tsx         # 格線參數側欄
│   │   │   └── types.ts                # Grid 型別
│   │   ├── settings/
│   │   │   └── page.tsx                # 設定頁面
│   │   └── api/
│   │       ├── generate/route.ts       # POST /api/generate（代理到後端）
│   │       └── tasks/[id]/route.ts     # GET /api/tasks/[id]（代理到後端）
│   ├── components/
│   │   ├── Navbar.tsx                  # 導航欄 + UserPopover + API 健康檢查
│   │   └── Toast.tsx                   # 吐司通知系統
│   ├── lib/
│   │   ├── i18n.ts                     # 翻譯字典（en + zh-TW，約 494 個 key）
│   │   ├── LanguageContext.tsx         # React Context + localStorage 持久化
│   │   └── cameraPresets.ts            # 相機 / 鏡頭預設資料
│   └── services/
│       └── api.ts                      # Axios 客戶端 + localStorage 工具函數
├── public/
│   └── pic/
│       ├── guide/                      # Guide GIF 動畫
│       ├── *.png                       # 個人 mock 圖像
│       ├── video/                      # 個人 mock 影片
│       └── group/                      # 群組 mock 資源
├── next.config.ts                      # rewrites + devIndicators
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. 設計系統

### CSS 變數（`globals.css`）

```css
/* 品牌色（金黃） */
--color-purple:        #FFD700
--color-purple-dark:   #CC9900
--color-purple-subtle: rgba(255, 215, 0, 0.15)
--color-green:         #4ade80

/* 背景層次（由深到淺） */
--color-base:    #0d0d12   /* 最底層 */
--color-surface: #111118   /* Navbar */
--color-panel:   #16161f   /* 卡片 */
--color-raised:  #1c1c28   /* 輸入框 */
--color-hover:   #22222f   /* hover */

/* 文字 */
--color-text:    #f0f0f5
--color-muted:   #8888a0
--color-faint:   #55556a
--color-border:  rgba(255, 255, 255, 0.08)
```

### zh-TW 可讀性規則

```css
:lang(zh-TW) {
  font-family: 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', system-ui, sans-serif;
}
:lang(zh-TW) [class*="text-[10px]"],
:lang(zh-TW) [class*="text-[11px]"] {
  font-size: 12px !important;
}
:lang(zh-TW) [class*="tracking-widest"] {
  letter-spacing: 0.04em;
}
```

### 全局元件類

| 類名 | 用途 |
|------|------|
| `.chip` | 可點擊參數標籤（淺色邊框） |
| `.chip.active` | 選中狀態（金黃邊框 + 背景） |
| `.skeleton-shimmer` | 載入骨架動畫 |
| `.media-fade-in` | 媒體載入淡入 |
| `.scrollbar-none` | 隱藏捲軸 |

---

## 5. 頁面詳解

### 5.1 Studio（主工作室）

**路徑**：`/studio`  
**檔案**：`src/app/studio/page.tsx`

#### 佈局

```
┌──────────────────────────────────────────────────────┐
│  Toolbar: [Personal|Group]  [slider]  [filter] [sort] │
├──────────────────────────────────────────────────────┤
│                                                      │
│   瀑布流 Gallery（CSS columns）                        │
│   OutputCard × N                                     │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐    │
│  │ [Image|Video tab] [refs] [textarea]          │[↑] │
│  │ [Model][Ratio][Quality][Res][Dur][Mode]      │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

#### 主要 State

| State | 說明 |
|-------|------|
| `tab` | `'image' \| 'video'` |
| `prompt` | 提示詞文字 |
| `model` | 選中模型 ID |
| `ratio` | 比例（`'9:16'` 等） |
| `quality` | 品質（`'fastest'` / `'balanced'` / `'best'` / `'auto'`） |
| `resolution` | 解析度（`'1080p'` 等） |
| `duration` | 時長（秒） |
| `seedanceMode` | `'text_to_video'` / `'first_last_frames'` / `'omni_reference'` / `'image_to_image'` |
| `count` | 批量數量（1-4） |
| `refs` | 參考圖像 / 影片（最多 12） |
| `outputs` | 輸出任務列表 |
| `workspace` | `'personal' \| 'group'` |
| `mediaFilter` | `'all'` / `'image'` / `'video'` / `'favorites'` |
| `sortOrder` | `'newest' \| 'oldest'` |

#### 子元件

| 元件 | 說明 |
|------|------|
| `OutputCard` | 輸出卡片（hover 播放影片、收藏） |
| `DetailModal` | 詳情 modal（媒體預覽 + 參數 + 操作） |
| `Popover` | 通用下拉容器 |
| `Pill` | 參數標籤（圖標 + 文字） |

---

### 5.2 Guide（提示指南）

**路徑**：`/guide`  
**檔案**：`src/app/guide/`

#### 子模式

**Image Guide**（圖像模式）
- 選擇 Use Case、Subject、Framing、Angle、Lighting、Style、Constraints
- 即時組裝提示詞，一鍵送至 Studio

**Video Planner**（影片模式）
- 選擇 Plan Mode（Text to Video / Omni Reference / First+Last）
- 逐鏡設定：Movement、Shot Size、Angle、Lighting、Camera Body、Lens
- 整體設定：Style、Framing、Lighting、Camera、DOF
- 首／尾圖上傳（first_last_frames 模式）
- 多鏡頭排程（text_to_video 模式）
- 轉場描述
- 輸出設定（模型、比例、解析度）
- 一鍵送至 Studio

#### 資產管理（IndexedDB）

影片規劃器中的媒體資產存放於 IndexedDB（`assetDB.ts`），避免大型 File 物件存入 localStorage。

---

### 5.3 Grid（格線工具）

**路徑**：`/grid`  
**檔案**：`src/app/grid/`

#### 功能

- Canvas 繪圖（拖曳選取、畫筆工具）
- 自訂畫布尺寸、邊距、欄列設定
- 上傳參考圖像並自動 fit
- 選取區塊送至 Studio 生成
- 支援 Undo / Redo

---

### 5.4 Settings（設定）

**路徑**：`/settings`  
**檔案**：`src/app/settings/page.tsx`

持久化至 `localStorage['seedance_settings']`

| 設定項 | 預設值 |
|--------|--------|
| `apiBaseUrl` | `http://localhost:3001` |
| `webhookUrl` | `''` |
| `defaultResolution` | `'1080p'` |
| `defaultRatio` | `'9:16'` |
| `defaultDuration` | `5` |
| `defaultImageModel` | `'gpt-image-2'` |
| `defaultVideoModel` | `'doubao-seedance-2-0-260128'` |

---

## 6. 元件

### Navbar（`src/components/Navbar.tsx`）

- 高度：48px
- 左側：🍌 logo + 導航（Studio / Guide / Grid）
- 右側：API 狀態指示燈 + UserPopover
- 每 30 秒 ping `/api/health`

#### UserPopover

- 顯示用戶名稱 / 信箱 / 群組數（目前為 mock）
- 語言切換（英文 / 繁中）
- 快速設定（Backend URL、Webhook、模型、比例、時長）

### Toast（`src/components/Toast.tsx`）

- Context API 架構，`useToast()` hook
- 類型：`success`（綠）/ `error`（紅）/ `info`（灰）
- 自動 3 秒消失，右下角固定

---

## 7. 服務層 & Hooks

### `src/services/api.ts`

#### Axios 實例

```typescript
baseURL: '/api'
// 429 自動重試（指數退避，最多 3 次）
```

#### 主要型別

```typescript
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
| `submitTask(payload)` | `POST /api/generate` |
| `getTaskStatus(id)` | `GET /api/tasks/:id` |
| `loadTasks()` | 從 localStorage 讀取所有任務 |
| `saveTask(task)` | 新增或更新任務 |
| `loadSettings()` | 讀取設定 |
| `saveSettings(s)` | 保存設定 |

---

## 8. API 路由

### `POST /api/generate`

```
前端 → Next.js Route → POST ${BACKEND_URL}/api/generate
回傳：{ task_id: string }
失敗：502（後端不可達）
```

### `GET /api/tasks/[id]`

```
前端 → Next.js Route → GET ${BACKEND_URL}/api/tasks/${id}
回傳：Task 物件
失敗：502
```

### `GET /api/health`

```
由後端提供，透過 next.config.ts rewrites 代理
用於 Navbar 健康檢查
```

---

## 9. 模型規格

### 圖像模型

| 模型 ID | 顯示名稱 | 解析度選項 | 支援比例 |
|---------|---------|-----------|---------|
| `gpt-image-2` | GPT Image 2 | 1K / 1.5K / 2K | 1:1, 3:2, 2:3, 2:1, 1:2 |
| `nano-banana-2` | Nano Banana 2 | 512 / 1K / 2K | 1:1, 4:3, 3:4, 16:9, 9:16 |
| `nano-banana-pro` | Nano Banana Pro | 512 / 1K / 2K / 4K | 1:1, 4:3, 3:4, 16:9, 9:16 |

### 影片模型

| 模型 ID | 顯示名稱 | 解析度 | 時長 |
|---------|---------|--------|------|
| `doubao-seedance-2-0-260128` | Seedance 2.0 | 480p / 720p / 1080p | 4–15s |
| `doubao-seedance-2-0-fast-260128` | Seedance 2.0 Fast | 480p / 720p | 4–15s |

### Seedance 模式（`seedanceMode`）

| 模式 | 說明 |
|------|------|
| `text_to_video` | 純文字生成影片 |
| `omni_reference` | 多模態參考（圖像 + 影片 + 音訊，最多 12 個） |
| `first_last_frames` | 首圖 + 尾圖控制影片首尾 |
| `image_to_image` | 圖像轉圖像（GPT Image 2） |

---

## 10. 資料流

```
用戶輸入 prompt + 選擇參數
        ↓
handleGenerate()
        ↓
submitTask() × count → POST /api/generate
        ↓
後端返回 task_id
        ↓
saveTask() → localStorage
setOutputs([...newTasks, ...prev])
        ↓
任務狀態輪詢（10s 起，指數退避，上限 60s）
        ↓
GET /api/tasks/[id]
        ↓
handleUpdate(task)
  ├─ saveTask()
  ├─ setOutputs()
  ├─ toast('Generation complete') 若 succeeded
  └─ toast('Generation failed') 若 failed
        ↓
OutputCard 顯示結果
        ↓
點擊卡片 → DetailModal
```

---

## 11. localStorage 結構

| 鍵 | 類型 | 說明 |
|----|------|------|
| `seedance_tasks` | `Task[]` | 所有任務（最新在前） |
| `seedance_settings` | `Settings` | 用戶設定 |
| `seedance_favorites_personal` | `string[]` | 個人收藏 task_id |
| `seedance_favorites_group` | `string[]` | 群組收藏 task_id |
| `mb-language` | `'en' \| 'zh-TW'` | 語言偏好 |

---

## 12. 多語言（i18n）

**系統**：自製輕量 i18n，無外部依賴

**檔案**：`src/lib/i18n.ts`

```typescript
type Dict = Record<string, string>
const en: Dict = { ... }    // 約 494 個 key
const zhTW: Dict = { ... }  // 約 494 個 key

export const translations = { en, 'zh-TW': zhTW }
```

**Context**：`src/lib/LanguageContext.tsx`

```typescript
// 用法
const t = useT()
t('studio.generate')  // → 'Generate' | '生成'

// 語言切換
const { lang, setLang } = useLanguage()
setLang('zh-TW')
// → 自動同步 document.documentElement.lang（讓 CSS :lang() 生效）
// → 持久化至 localStorage['mb-language']
```

**Key 命名慣例**

| 前綴 | 說明 |
|------|------|
| `nav.*` | Navbar 連結 |
| `settings.*` | 設定頁面 |
| `studio.*` | Studio 頁面 |
| `guide.*` | Guide 共用 |
| `video.*` | Video Planner |
| `movement.*.label` | 鏡頭運動名稱 |
| `vp.shotSize.*.label/tip` | 景別名稱與提示 |
| `vp.angle.*.label/tip` | 角度名稱與提示 |
| `vp.lighting.*.label/tip` | 燈光名稱與提示 |
| `grid.*` | Grid 工具 |

---

## 13. 靜態資源

```
public/pic/
├── guide/                   # Guide GIF 動畫（攝影動作示範）
├── *.png                    # 個人 mock 圖像（11 張）
├── video/
│   └── *.mp4                # 個人 mock 影片
└── group/
    ├── *.png                # 群組 mock 圖像
    └── video/
        └── *.mp4            # 群組 mock 影片
```

---

## 14. 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `BACKEND_URL` | 後端 API 基礎 URL | `http://localhost:3001` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key（選用） | — |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | — |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | — |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | — |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID | — |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | — |

---

## 15. 啟動方式

```bash
# 安裝依賴
npm install

# 開發模式（Turbopack）
npx next dev --turbopack
# → http://localhost:3000

# 生產構建
npm run build
npm start

# 單元測試
npm run test
```

> **注意**：需要後端服務在 `BACKEND_URL` 運行，否則 API 呼叫返回 502。  
> 前端 UI 與 mock 資料在無後端情況下仍可正常瀏覽。
