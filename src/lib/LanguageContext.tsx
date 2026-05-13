'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Lang } from './i18n'

// ── Context ───────────────────────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'zh-TW',
  setLang: () => {},
  t: (key) => key,
})

// ── Provider ──────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mb-language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh-TW')

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'zh-TW' || saved === 'en') {
        setLangState(saved)
      }
    } catch { /* silent */ }
  }, [])

  // Sync <html lang> attribute so CSS :lang() selectors work
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function setLang(newLang: Lang) {
    setLangState(newLang)
    try { localStorage.setItem(STORAGE_KEY, newLang) } catch { /* silent */ }
  }

  function t(key: string): string {
    return translations[lang][key] ?? translations['en'][key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ── Hooks ───────────────────────────────────────────────────────────────────────────────

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Convenience: returns just the translation function */
export function useT() {
  return useContext(LanguageContext).t
}
