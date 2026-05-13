'use client'

import type { UseCaseId } from '../types'
import { useT } from '@/lib/LanguageContext'

interface UseCaseDef {
  id: UseCaseId
  icon: string
}

const USE_CASES: UseCaseDef[] = [
  {
    id: 'portrait',
    icon: '🧑',
  },
  {
    id: 'fashion',
    icon: '👗',
  },
  {
    id: 'editorial-photo',
    icon: '📰',
  },
  {
    id: 'product-mockup',
    icon: '📦',
  },
  {
    id: 'social-media',
    icon: '📸',
  },
  {
    id: 'poster',
    icon: '🎨',
  },
  {
    id: 'album-cover',
    icon: '💿',
  },
  {
    id: 'concept-art',
    icon: '🖼️',
  },
  {
    id: 'fantasy-scifi',
    icon: '🔮',
  },
  {
    id: 'anime-manga',
    icon: '⛩️',
  },
  {
    id: 'architecture',
    icon: '🏛️',
  },
  {
    id: 'food',
    icon: '🍽️',
  },
  {
    id: 'ui-screen',
    icon: '📱',
  },
  {
    id: 'wallpaper',
    icon: '🖥️',
  },
  {
    id: 'documentary',
    icon: '🎞️',
  },
]

interface UseCasePickerProps {
  value: UseCaseId | null
  onChange: (id: UseCaseId | null) => void
}

export function UseCasePicker({ value, onChange }: UseCasePickerProps) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2" role="group" aria-label="Use case selector">
      {USE_CASES.map(uc => {
        const isActive = value === uc.id
        return (
          <button
            key={uc.id}
            onClick={() => onChange(isActive ? null : uc.id)}
            className={[
              'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer',
              isActive
                ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)]'
                : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]',
            ].join(' ')}
            aria-pressed={isActive}
          >
            <span className="text-xl leading-none">{uc.icon}</span>
            <span className="text-[12px] font-semibold leading-tight text-[var(--color-text)]">
              {t(`useCase.${uc.id}.label`)}
            </span>
            <span className="text-[10px] text-[var(--color-muted)] leading-snug">
              {t(`useCase.${uc.id}.example`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
