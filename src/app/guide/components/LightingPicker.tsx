'use client'

import { addLighting, initialGuideState } from '../logic'
import type { LightingId } from '../types'

// ── Lighting card definitions ─────────────────────────────────────────────────

interface LightingCard {
  id: LightingId
  label: string
  filename: string
  gradient: string
}

const LIGHTING_CARDS: LightingCard[] = [
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    filename: 'guide-light-golden-hour.jpg',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'blue-hour',
    label: 'Blue Hour',
    filename: 'guide-light-blue-hour.jpg',
    gradient: 'from-blue-700 to-indigo-900',
  },
  {
    id: 'overcast',
    label: 'Overcast',
    filename: 'guide-light-overcast.jpg',
    gradient: 'from-slate-400 to-slate-600',
  },
  {
    id: 'hard-studio',
    label: 'Hard Studio',
    filename: 'guide-light-hard-studio.jpg',
    gradient: 'from-gray-100 to-gray-400',
  },
  {
    id: 'soft-studio',
    label: 'Soft Studio',
    filename: 'guide-light-soft-studio.jpg',
    gradient: 'from-gray-200 to-gray-500',
  },
  {
    id: 'neon',
    label: 'Neon',
    filename: 'guide-light-neon.jpg',
    gradient: 'from-purple-600 to-pink-500',
  },
  {
    id: 'candlelight',
    label: 'Candlelight',
    filename: 'guide-light-candlelight.jpg',
    gradient: 'from-orange-400 to-red-700',
  },
  {
    id: 'rembrandt',
    label: 'Rembrandt',
    filename: 'guide-light-rembrandt.jpg',
    gradient: 'from-amber-800 to-stone-900',
  },
  {
    id: 'high-key',
    label: 'High-Key',
    filename: 'guide-light-high-key.jpg',
    gradient: 'from-white to-gray-200',
  },
  {
    id: 'low-key',
    label: 'Low-Key',
    filename: 'guide-light-low-key.jpg',
    gradient: 'from-gray-800 to-black',
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface LightingPickerProps {
  value: LightingId[]
  onChange: (newLighting: LightingId[]) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LightingPicker({ value, onChange }: LightingPickerProps) {
  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2"
      role="group"
      aria-label="Lighting style selector"
    >
      {LIGHTING_CARDS.map(card => {
        const isActive = value.includes(card.id)

        return (
          <button
            key={card.id}
            onClick={() => {
              const newState = addLighting(
                { ...initialGuideState(), lighting: value },
                card.id,
              )
              onChange(newState.lighting)
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)]'
                : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
            }`}
            aria-pressed={isActive}
            aria-label={card.label}
          >
            {/* Gradient swatch — always visible (placeholder images are tiny, so gradient shows) */}
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
