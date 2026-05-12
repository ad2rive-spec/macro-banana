'use client'

import { useState } from 'react'
import Image from 'next/image'
import { setStyle, initialGuideState } from '../logic'
import type { StyleId } from '../types'

// ── Style card definitions ────────────────────────────────────────────────────

interface StyleCard {
  id: StyleId
  label: string
  description: string
  image: string   // path under /pic/guide/
  gradient: string
}

const STYLE_CARDS: StyleCard[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Film-like look with dramatic contrast and letterbox feel',
    image: '/pic/guide/cinematic.png',
    gradient: 'from-slate-900 to-gray-700',
  },
  {
    id: 'editorial',
    label: 'Editorial / Fashion',
    description: 'High-fashion magazine aesthetic with bold, styled compositions',
    image: '/pic/guide/editorial-fashion-style.png',
    gradient: 'from-rose-100 to-pink-300',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    description: 'Raw, candid reportage style with natural light and authenticity',
    image: '/pic/guide/documentary-reportage-style.png',
    gradient: 'from-stone-500 to-stone-800',
  },
  {
    id: 'fine-art',
    label: 'Fine Art',
    description: 'Painterly, gallery-quality aesthetic with artistic intent',
    image: '/pic/guide/fine-art-painterly-style.png',
    gradient: 'from-amber-200 to-orange-400',
  },
  {
    id: 'commercial',
    label: 'Commercial',
    description: 'Clean, polished advertising look optimised for product appeal',
    image: '/pic/guide/commercial-advertising-style.png',
    gradient: 'from-sky-400 to-blue-600',
  },
  {
    id: 'street',
    label: 'Street Photography',
    description: 'Gritty urban moments captured with an unposed, spontaneous feel',
    image: '/pic/guide/street-photography-style.png',
    gradient: 'from-zinc-600 to-zinc-900',
  },
  {
    id: 'architectural',
    label: 'Architectural',
    description: 'Precise geometry and spatial composition of built environments',
    image: '/pic/guide/architectural-photography-style.png',
    gradient: 'from-slate-300 to-slate-600',
  },
  {
    id: 'macro',
    label: 'Macro / Abstract',
    description: 'Extreme close-up detail revealing texture, pattern and form',
    image: '/pic/guide/macro-abstract-style.png',
    gradient: 'from-emerald-400 to-teal-600',
  },
  {
    id: 'vintage',
    label: 'Vintage / Film',
    description: 'Nostalgic film grain, faded tones and analogue imperfections',
    image: '/pic/guide/vintage-film-style.png',
    gradient: 'from-yellow-200 to-amber-500',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean, uncluttered composition with generous negative space and restrained palette',
    image: '/pic/guide/clean-minimal-aesthetic.png',
    gradient: 'from-gray-100 to-gray-300',
  },
]

// ── Thumbnail sub-component ───────────────────────────────────────────────────

function StyleThumbnail({ card, isActive }: { card: StyleCard; isActive: boolean }) {
  const [imgError, setImgError] = useState(false)

  if (!imgError) {
    return (
      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
        <Image
          src={card.image}
          alt={card.label}
          fill
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 160px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
        {isActive && (
          <div className="absolute inset-0 bg-[var(--color-purple)] opacity-20 pointer-events-none" />
        )}
      </div>
    )
  }

  // Fallback gradient swatch
  return (
    <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`} />
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StylePickerProps {
  value: StyleId | null
  onChange: (id: StyleId | null) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StylePicker({ value, onChange }: StylePickerProps) {
  const [hoveredId, setHoveredId] = useState<StyleId | null>(null)

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
      role="group"
      aria-label="Visual style selector"
    >
      {STYLE_CARDS.map(card => {
        const isActive  = value === card.id
        const isHovered = hoveredId === card.id

        return (
          <div key={card.id} className="relative">
            <button
              onClick={() => {
                const newState = setStyle(
                  { ...initialGuideState(), style: value },
                  card.id,
                )
                onChange(newState.style)
              }}
              onMouseEnter={() => setHoveredId(card.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(card.id)}
              onBlur={() => setHoveredId(null)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 cursor-pointer w-full ${
                isActive
                  ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)]'
                  : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
              }`}
              aria-pressed={isActive}
              aria-label={`${card.label}: ${card.description}`}
            >
              <StyleThumbnail card={card} isActive={isActive} />
              {/* Label */}
              <span className="text-[11px] font-medium text-center leading-tight">
                {card.label}
              </span>
            </button>

            {/* Tooltip */}
            {isHovered && (
              <div
                className="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
                  px-2 py-1 rounded-md text-[11px] leading-snug text-center
                  bg-[var(--color-hover)] border border-[var(--color-border)]
                  text-[var(--color-text)] pointer-events-none shadow-lg
                "
                style={{ minWidth: '140px', maxWidth: '180px', whiteSpace: 'normal' }}
                role="tooltip"
              >
                {card.description}
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-hover)]"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
