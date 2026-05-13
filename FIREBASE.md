# 🔥 Firebase 後端串接指南

本文件說明如何將 Macro Banana 前端與 Firebase 後端整合，包含 Firestore 任務儲存、Firebase Storage 媒體存放，以及與現有 Next.js API Routes 的銜接方式。

---

## 目錄

1. [前置準備](#1-前置準備)
2. [建立 Firebase 專案](#2-建立-firebase-專案)
3. [安裝 Firebase SDK](#3-安裝-firebase-sdk)
4. [初始化設定](#4-初始化設定)
5. [Firestore — 任務資料](#5-firestore--任務資料)
6. [Firebase Storage — 媒體檔案](#6-firebase-storage--媒體檔案)
7. [整合至現有 API Routes](#7-整合至現有-api-routes)
8. [即時任務狀態更新（onSnapshot）](#8-即時任務狀態更新onsnapshot)
9. [安全規則](#9-安全規則)
10. [環境變數設定](#10-環境變數設定)
11. [部署到 Vercel / Cloud Run](#11-部署到-vercel--cloud-run)

---

## 1. 前置準備

- Google 帳號
- Node.js 18+
- 已完成 Google 帳號登入串接（見 [GOOGLE_AUTH.md](./GOOGLE_AUTH.md)）

---

## 2. 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」→ 輸入專案名稱（例如 `macro-banana`）
3. 可選擇關閉 Google Analytics
4. 進入專案後，點擊左側「Firestore Database」→「建立資料庫」
   - 選擇「以生產模式啟動」（之後設定安全規則）
   - 選擇離用戶最近的地區（如 `asia-east1`）
5. 點擊「Storage」→「開始使用」，同樣選擇地區

---

## 3. 安裝 Firebase SDK

```bash
npm install firebase
# 若用於後端（API Routes / Server Actions）
npm install firebase-admin
```

---

## 4. 初始化設定

### 建立 Firebase 設定檔

**`src/lib/firebase.ts`**（前端，Client SDK）

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

// 避免 Next.js hot reload 重複初始化
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db      = getFirestore(app)
export const storage = getStorage(app)
export const auth    = getAuth(app)
export default app
```

### 取得設定值

1. Firebase Console → 專案設定（齒輪圖示）→「一般」
2. 往下捲動至「您的應用程式」→「</> Web」
3. 複製 `firebaseConfig` 物件中的各欄位
4. 填入 `.env.local`（見第 10 節）

---

## 5. Firestore — 任務資料

### 資料結構

```
Firestore
└── users/
    └── {userId}/
        └── tasks/
            └── {task_id}/
                ├── task_id:       string
                ├── status:        'queued' | 'running' | 'succeeded' | 'failed'
                ├── prompt:        string
                ├── model:         string
                ├── resolution:    string
                ├── ratio:         string
                ├── duration:      number
                ├── created_at:    Timestamp
                ├── video_url:     string | null
                ├── last_frame_url: string | null
                ├── seed:          number | null
                ├── error_message: string | null
                └── usage:         { completion_tokens: number } | null
```

### 操作函數

**`src/services/firestore.ts`**

```typescript
import {
  collection, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, orderBy, getDocs, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Task } from './api'

const tasksCol = (userId: string) =>
  collection(db, 'users', userId, 'tasks')

/** 新增或更新任務 */
export async function saveTaskToFirestore(userId: string, task: Task) {
  const ref = doc(tasksCol(userId), task.task_id)
  await setDoc(ref, {
    ...task,
    created_at: task.created_at
      ? Timestamp.fromMillis(task.created_at)
      : Timestamp.now(),
  }, { merge: true })
}

/** 讀取單一任務 */
export async function getTaskFromFirestore(userId: string, taskId: string): Promise<Task | null> {
  const snap = await getDoc(doc(tasksCol(userId), taskId))
  if (!snap.exists()) return null
  const d = snap.data()
  return { ...d, created_at: d.created_at?.toMillis() } as Task
}

/** 讀取所有任務（最新在前） */
export async function loadTasksFromFirestore(userId: string): Promise<Task[]> {
  const q = query(tasksCol(userId), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return { ...data, created_at: data.created_at?.toMillis() } as Task
  })
}
```

---

## 6. Firebase Storage — 媒體檔案

若後端將生成結果上傳至 Firebase Storage，可用以下方式取得下載 URL：

```typescript
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage'
import { storage } from '@/lib/firebase'

/** 上傳媒體（後端呼叫） */
export async function uploadMedia(userId: string, taskId: string, blob: Blob, ext: 'mp4' | 'png') {
  const storageRef = ref(storage, `users/${userId}/tasks/${taskId}/output.${ext}`)
  await uploadBytes(storageRef, blob)
  return getDownloadURL(storageRef)
}

/** 取得下載 URL */
export async function getMediaUrl(userId: string, taskId: string, ext: 'mp4' | 'png') {
  const storageRef = ref(storage, `users/${userId}/tasks/${taskId}/output.${ext}`)
  return getDownloadURL(storageRef)
}
```

**Storage 路徑規範**

```
gs://{bucket}/
└── users/
    └── {userId}/
        └── tasks/
            └── {task_id}/
                ├── output.mp4     # 影片
                ├── output.png     # 圖像
                └── last_frame.png # 最後一幀
```

---

## 7. 整合至現有 API Routes

修改 `src/app/api/generate/route.ts`，在任務提交後同步至 Firestore：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { saveTaskToFirestore } from '@/services/firestore'
import { getUserIdFromRequest } from '@/lib/auth'   // 見 GOOGLE_AUTH.md

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    // 若成功取得 task_id，寫入 Firestore
    if (res.ok && data.task_id) {
      const userId = await getUserIdFromRequest(req)  // 取得登入用戶 ID
      if (userId) {
        await saveTaskToFirestore(userId, {
          task_id:    data.task_id,
          status:     'queued',
          prompt:     body.content?.find((c: { type: string }) => c.type === 'text')?.text,
          model:      body.model,
          resolution: body.resolution,
          ratio:      body.ratio,
          duration:   body.duration,
          created_at: Date.now(),
        })
      }
    }

    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
```

---

## 8. 即時任務狀態更新（onSnapshot）

用 Firestore 的即時監聽取代輪詢，可節省 API 呼叫次數：

```typescript
// src/hooks/useFirestoreTasks.ts
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Task } from '@/services/api'

export function useFirestoreTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!userId) return

    const q = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('created_at', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => {
        const data = d.data()
        return {
          ...data,
          created_at: (data.created_at as Timestamp)?.toMillis(),
        } as Task
      }))
    })

    return () => unsubscribe()
  }, [userId])

  return tasks
}
```

> **注意**：若後端在任務完成後更新 Firestore，前端即時收到更新，無須額外輪詢。

---

## 9. 安全規則

### Firestore 規則

在 Firebase Console → Firestore → 規則，貼上以下內容：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用戶只能讀寫自己的資料
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage 規則

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 10. 環境變數設定

在 `.env.local` 填入以下變數（從 Firebase Console 取得）：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# 後端也需要 Firebase Admin SDK（若後端寫入 Firestore）
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

> **安全提醒**：`NEXT_PUBLIC_*` 前綴的變數會曝露給瀏覽器，確保 Firestore / Storage 安全規則已正確設定。  
> `FIREBASE_ADMIN_*` 變數僅用於後端（API Routes / Server Actions），絕不使用 `NEXT_PUBLIC_` 前綴。

---

## 11. 部署到 Vercel / Cloud Run

### Vercel

1. 前往 Vercel Dashboard → 專案設定 → Environment Variables
2. 新增所有 `NEXT_PUBLIC_FIREBASE_*` 與 `BACKEND_URL` 變數
3. 推送程式碼，Vercel 自動部署

### Firebase Hosting（選用）

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# 選擇 out/ 作為 public 目錄（Next.js static export）
firebase deploy
```

> **建議**：Vercel 對 Next.js App Router 支援最佳，推薦使用 Vercel 部署。
