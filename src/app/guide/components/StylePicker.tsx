'use client'

import { setStyle, initialGuideState } from '../logic'
import type { StyleId } from '../types'

// ── Style card definitions ────────────────────────────────────────────────────

interface StyleCard {
  id: StyleId
  label: string
  filename: string
  gradient: string
}

const STYLE_CARDS: StyleCard[] = [
  {
    id: 'cinematic',
    label: 'Cinematic Widescreen',
    filename: 'guide-style-cinematic.jpg',
    gradient: 'from-slate-900 to-gray-700',
  },
  {
    id: 'editorial',
    label: 'Editorial / Fashion',
    filename: 'guide-style-editorial.jpg',
    gradient: 'from-rose-100 to-pink-300',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    filename: 'guide-style-documentary.jpg',
    gradient: 'from-stone-500 to-stone-800',
  },
  {
    id: 'fine-art',
    label: 'Fine Art',
    filename: 'guide-style-fine-art.jpg',
    gradient: 'from-amber-200 to-orange-400',
  },
  {
    id: 'commercial',
    label: 'Commercial',
    filename: 'guide-style-commercial.jpg',
    gradient: 'from-sky-400 to-blue-600',
  },
  {
    id: 'street',
    label: 'Street Photography',
    filename: 'guide-style-street.jpg',
    gradient: 'from-zinc-600 to-zinc-900',
  },
  {
    id: 'architectural',
    label: 'Architectural',
    filename: 'guide-style-architectural.jpg',
    gradient: 'from-slate-300 to-slate-600',
  },
  {
    id: 'macro',
    label: 'Macro / Abstract',
    filename: 'guide-style-macro.jpg',
    gradient: 'from-emerald-400 to-teal-600',
  },
  {
    id: 'vintage',
    label: 'Vintage / Film',
    filename: 'guide-style-vintage.jpg',
    gradient: 'from-yellow-200 to-amber-500',
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface StylePickerProps {
  value: StyleId | null
  onChange: (id: StyleId | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StylePicker({ value, onChange }: StylePickerProps) {
  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2"
      role="group"
      aria-label="Visual style selector"
    >
      {STYLE_CARDS.map(card => {
        const isActive = value === card.id

        return (
          <button
            key={card.id}
            onClick={() => {
              const newState = setStyle(
                { ...initialGuideState(), style: value },
                card.id,
              )
              onChange(newState.style)
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)]'
                : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
            }`}
            aria-pressed={isActive}
            aria-label={card.label}
          >
            {/* Gradient swatch */}
            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`} />
            {/* Label */}
            <span className="text-[11px] font-medium text-center leading-tight">
              {card.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
