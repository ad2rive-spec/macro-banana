'use client'

import Image from 'next/image'
import { useState } from 'react'
import { setStyle, initialGuideState } from '../logic'
import type { StyleId } from '../types'
import { useT } from '@/lib/LanguageContext'
import { Tooltip } from '@/components/Tooltip'

// ── Style card definitions ────────────────────────────────────────────────────

interface StyleCard {
  id: StyleId
  image: string   // path under /pic/guide/
  gradient: string
}

const STYLE_CARDS: StyleCard[] = [
  {
    id: 'cinematic',
    image: '/pic/guide/cinematic.jpg',
    gradient: 'from-slate-900 to-gray-700',
  },
  {
    id: 'editorial',
    image: '/pic/guide/editorial-fashion-style.jpg',
    gradient: 'from-rose-100 to-pink-300',
  },
  {
    id: 'documentary',
    image: '/pic/guide/documentary-reportage-style.jpg',
    gradient: 'from-stone-500 to-stone-800',
  },
  {
    id: 'fine-art',
    image: '/pic/guide/fine-art-painterly-style.jpg',
    gradient: 'from-amber-200 to-orange-400',
  },
  {
    id: 'commercial',
    image: '/pic/guide/commercial-advertising-style.jpg',
    gradient: 'from-sky-400 to-blue-600',
  },
  {
    id: 'street',
    image: '/pic/guide/street-photography-style.jpg',
    gradient: 'from-zinc-600 to-zinc-900',
  },
  {
    id: 'architectural',
    image: '/pic/guide/architectural-photography-style.jpg',
    gradient: 'from-slate-300 to-slate-600',
  },
  {
    id: 'macro',
    image: '/pic/guide/macro-abstract-style.jpg',
    gradient: 'from-emerald-400 to-teal-600',
  },
  {
    id: 'vintage',
    image: '/pic/guide/vintage-film-style.jpg',
    gradient: 'from-yellow-200 to-amber-500',
  },
  {
    id: 'minimal',
    image: '/pic/guide/clean-minimal-aesthetic.jpg',
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
          alt=""
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
  const t = useT()

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
      role="group"
      aria-label="Visual style selector"
    >
      {STYLE_CARDS.map(card => {
        const isActive = value === card.id

        return (
          <Tooltip key={card.id} content={t(`style.${card.id}.description`)}>
            <button
              onClick={() => {
                const newState = setStyle(
                  { ...initialGuideState(), style: value },
                  card.id,
                )
                onChange(newState.style)
              }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 cursor-pointer w-full ${
                isActive
                  ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)]'
                  : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
              }`}
              aria-pressed={isActive}
              aria-label={`${t(`style.${card.id}.label`)}: ${t(`style.${card.id}.description`)}`}
            >
              <StyleThumbnail card={card} isActive={isActive} />
              {/* Label */}
              <span className="text-[11px] font-medium text-center leading-tight">
                {t(`style.${card.id}.label`)}
              </span>
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
