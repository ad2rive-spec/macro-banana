'use client'
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {})

export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const add = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])

  const COLOR: Record<ToastType, string> = {
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    error:   'border-red-500/30 bg-red-500/10 text-red-300',
    info:    'border-white/10 bg-[#1c1c26] text-[#ccc]',
  }

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`px-4 py-2.5 rounded-xl border text-[13px] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-2 duration-200 ${COLOR[t.type]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
