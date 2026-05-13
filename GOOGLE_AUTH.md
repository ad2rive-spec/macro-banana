# 🔐 Google 帳號登入串接指南

本文件說明如何在 Macro Banana 前端串接 Google OAuth 登入，使用 Firebase Authentication 作為身份驗證後端。

---

## 目錄

1. [前置準備](#1-前置準備)
2. [啟用 Google 登入](#2-啟用-google-登入)
3. [前端實作](#3-前端實作)
4. [AuthContext 全域狀態](#4-authcontext-全域狀態)
5. [整合至 Navbar](#5-整合至-navbar)
6. [保護 API Routes（Server-side）](#6-保護-api-routesserver-side)
7. [用戶資料結構](#7-用戶資料結構)
8. [登出](#8-登出)
9. [錯誤處理](#9-錯誤處理)
10. [開發環境測試](#10-開發環境測試)

---

## 1. 前置準備

- 已完成 [Firebase 專案建立](./FIREBASE.md#2-建立-firebase-專案)
- 已安裝 Firebase SDK：`npm install firebase`
- 已建立 `src/lib/firebase.ts`（見 [FIREBASE.md](./FIREBASE.md#4-初始化設定)）

---

## 2. 啟用 Google 登入

### Firebase Console 設定

1. Firebase Console → **Authentication** → **Sign-in method**
2. 點擊「Google」→ 啟用
3. 填入「專案的公開名稱」（例如 `Macro Banana`）
4. 選擇「專案支援電子郵件」
5. 儲存

### 授權網域

1. Firebase Console → Authentication → **Settings** → **Authorized domains**
2. 確認以下網域已列入（預設已有）：
   - `localhost`
   - `your-project.firebaseapp.com`
3. 若部署到自訂網域，新增該網域（例如 `macrobanana.ai`）

---

## 3. 前端實作

### 登入函數

**`src/lib/auth.ts`**

```typescript
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()

// 加入額外 scope（可選）
googleProvider.addScope('profile')
googleProvider.addScope('email')

/** 以彈窗方式登入 Google */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/** 登出 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

/** 取得目前登入用戶（同步，可能為 null） */
export function getCurrentUser(): User | null {
  return auth.currentUser
}

/** 取得 ID Token（供 API Routes 驗證用） */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * 從 Next.js API Request 取得用戶 ID
 * 用於 Server-side 驗證（需搭配 firebase-admin）
 */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return null
    const idToken = authorization.split('Bearer ')[1]
    // 使用 firebase-admin 驗證（見下方 Admin SDK 章節）
    const { adminAuth } = await import('./firebaseAdmin')
    const decoded = await adminAuth.verifyIdToken(idToken)
    return decoded.uid
  } catch {
    return null
  }
}
```

### Firebase Admin SDK（Server-side）

**`src/lib/firebaseAdmin.ts`**（僅在 Server 執行）

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const adminApp = getApps().find(a => a.name === 'admin') ||
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  }, 'admin')

export const adminAuth = getAuth(adminApp)
```

---

## 4. AuthContext 全域狀態

**`src/lib/AuthContext.tsx`**

```typescript
'use client'

import {
  createContext, useContext, useEffect, useState, type ReactNode
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'

interface AuthContextValue {
  user:    User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### 加入根佈局

**`src/app/layout.tsx`**

```typescript
import { AuthProvider } from '@/lib/AuthContext'
import { LanguageProvider } from '@/lib/LanguageContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              <Navbar />
              <main>{children}</main>
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

## 5. 整合至 Navbar

目前 Navbar 的 `MOCK_USER` 需替換為真實登入資訊：

**`src/components/Navbar.tsx`**（修改 `UserPopover`）

```typescript
import { useAuth }              from '@/lib/AuthContext'
import { signInWithGoogle, signOut } from '@/lib/auth'

function UserPopover() {
  const { user, loading } = useAuth()

  if (loading) return <div className="w-8 h-8 rounded-full bg-[var(--color-raised)] animate-pulse" />

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-raised)] text-[12px] text-[var(--color-text)] border border-white/10 cursor-pointer hover:bg-[var(--color-hover)] transition-all"
      >
        <iconify-icon icon="lucide:log-in" width="13" height="13" />
        Sign in with Google
      </button>
    )
  }

  const initial = user.displayName?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-[var(--color-purple)] flex items-center justify-center text-[#1a1a1a] text-[13px] font-bold cursor-pointer hover:opacity-90"
        title={user.displayName ?? user.email ?? ''}
      >
        {user.photoURL
          ? <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
          : initial
        }
      </button>

      {open && (
        <div className="...">
          {/* 用戶資訊 */}
          <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center gap-3">
            {user.photoURL
              ? <img src={user.photoURL} className="w-9 h-9 rounded-full" alt="" />
              : <div className="w-9 h-9 rounded-full bg-[var(--color-purple)] flex items-center justify-center font-bold">{initial}</div>
            }
            <div>
              <div className="text-[13px] font-semibold text-white">{user.displayName}</div>
              <div className="text-[11px] text-[#555]">{user.email}</div>
            </div>
          </div>

          {/* ... 設定項目 ... */}

          {/* 登出按鈕 */}
          <button onClick={signOut} className="...">
            <iconify-icon icon="lucide:log-out" width="13" height="13" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## 6. 保護 API Routes（Server-side）

在 API Routes 中驗證 Firebase ID Token：

```typescript
// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // 驗證用戶身份（選用：若要求必須登入才能生成）
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... 原有邏輯
}
```

### 前端在請求時附帶 Token

**`src/services/api.ts`**（修改 Axios interceptor）

```typescript
import { getIdToken } from '@/lib/auth'

// 在每個請求的 Authorization header 附帶 ID Token
api.interceptors.request.use(async (config) => {
  const token = await getIdToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## 7. 用戶資料結構

Firebase `User` 物件的常用欄位：

| 欄位 | 類型 | 說明 |
|------|------|------|
| `uid` | `string` | 唯一用戶 ID（用作 Firestore 路徑） |
| `displayName` | `string \| null` | Google 帳號顯示名稱 |
| `email` | `string \| null` | Google 信箱 |
| `photoURL` | `string \| null` | Google 頭像 URL |
| `emailVerified` | `boolean` | 信箱是否已驗證（Google 登入預設為 true） |

### 初次登入建立用戶資料

```typescript
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { User } from 'firebase/auth'

export async function ensureUserDocument(user: User) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      displayName: user.displayName,
      email:       user.email,
      photoURL:    user.photoURL,
      createdAt:   serverTimestamp(),
      plan:        'free',
    })
  }
}

// 在 AuthContext 的 onAuthStateChanged 中呼叫：
onAuthStateChanged(auth, async (u) => {
  if (u) await ensureUserDocument(u)
  setUser(u)
  setLoading(false)
})
```

---

## 8. 登出

```typescript
import { signOut } from '@/lib/auth'

// 在 UserPopover 登出按鈕的 onClick：
async function handleSignOut() {
  await signOut()
  // Firebase onAuthStateChanged 會自動觸發，user 變為 null
  // 視需要導向首頁
  router.push('/')
}
```

---

## 9. 錯誤處理

| 錯誤代碼 | 說明 | 處理方式 |
|---------|------|---------|
| `auth/popup-closed-by-user` | 用戶關閉登入彈窗 | 靜默忽略 |
| `auth/popup-blocked` | 瀏覽器封鎖彈窗 | 改用 `signInWithRedirect` |
| `auth/network-request-failed` | 網路問題 | 提示用戶檢查網路 |
| `auth/too-many-requests` | 登入嘗試過多 | 提示用戶稍後再試 |

```typescript
import { signInWithGoogle } from '@/lib/auth'
import { FirebaseError } from 'firebase/app'

async function handleGoogleLogin() {
  try {
    await signInWithGoogle()
  } catch (err) {
    if (err instanceof FirebaseError) {
      if (err.code === 'auth/popup-closed-by-user') return
      if (err.code === 'auth/popup-blocked') {
        // 改用 redirect 流程
        const { GoogleAuthProvider, signInWithRedirect } = await import('firebase/auth')
        await signInWithRedirect(auth, new GoogleAuthProvider())
        return
      }
      console.error('Login failed:', err.message)
    }
  }
}
```

---

## 10. 開發環境測試

### 使用 Firebase Emulator（本機測試，不消耗配額）

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 初始化 emulator
firebase init emulators
# 選擇 Authentication 和 Firestore emulators

# 啟動
firebase emulators:start
```

**`src/lib/firebase.ts`**（開發環境連接 emulator）

```typescript
import { connectAuthEmulator }      from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'

if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099')
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

**.env.local（開發環境）**

```env
NEXT_PUBLIC_USE_EMULATOR=true
```

> **注意**：Emulator 中的 Google 登入不會真正驗證 Google 帳號，而是顯示一個選擇測試帳號的 UI。
