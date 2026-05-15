'use client'

import Image from 'next/image'
import { useState } from 'react'
import { addLighting, initialGuideState } from '../logic'
import type { LightingId } from '../types'
import { useT } from '@/lib/LanguageContext'
import { Tooltip } from '@/components/Tooltip'

// ── Lighting card definitions ─────────────────────────────────────────────────

interface LightingCard {
  id: LightingId
  image: string   // path under /pic/guide/
  gradient: string
}

const LIGHTING_CARDS: LightingCard[] = [
  {
    id: 'golden-hour',
    image: '/pic/guide/golden-hour-lighting.jpg',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'blue-hour',
    image: '/pic/guide/blue-hour-lighting.jpg',
    gradient: 'from-blue-700 to-indigo-900',
  },
  {
    id: 'overcast',
    image: '/pic/guide/overcast-diffused-lighting.jpg',
    gradient: 'from-slate-400 to-slate-600',
  },
  {
    id: 'hard-studio',
    image: '/pic/guide/hard-studio-lighting.jpg',
    gradient: 'from-gray-100 to-gray-400',
  },
  {
    id: 'soft-studio',
    image: '/pic/guide/soft-studio-lighting.jpg',
    gradient: 'from-gray-200 to-gray-500',
  },
  {
    id: 'neon',
    image: '/pic/guide/neon-cyberpunk-lighting.jpg',
    gradient: 'from-purple-600 to-pink-500',
  },
  {
    id: 'candlelight',
    image: '/pic/guide/candlelight-practical-lighting.jpg',
    gradient: 'from-orange-400 to-red-700',
  },
  {
    id: 'rembrandt',
    image: '/pic/guide/rembrandt-lighting.jpg',
    gradient: 'from-amber-800 to-stone-900',
  },
  {
    id: 'high-key',
    image: '/pic/guide/high-key-lighting.jpg',
    gradient: 'from-white to-gray-200',
  },
  {
    id: 'low-key',
    image: '/pic/guide/low-key-lighting.jpg',
    gradient: 'from-gray-800 to-black',
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface LightingPickerProps {
  value: LightingId[]
  onChange: (newLighting: LightingId[]) => void
}

// ── Thumbnail sub-component ───────────────────────────────────────────────────

function LightingThumbnail({ card, isActive }: { card: LightingCard; isActive: boolean }) {
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

  // Fallback to gradient swatch
  return (
    <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`} />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LightingPicker({ value, onChange }: LightingPickerProps) {
  const t = useT()

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
      role="group"
      aria-label="Lighting style selector"
    >
      {LIGHTING_CARDS.map(card => {
        const isActive = value.includes(card.id)

        return (
          <Tooltip key={card.id} content={t(`lighting.${card.id}.description`)}>
            <button
              onClick={() => {
                const newState = addLighting(
                  { ...initialGuideState(), lighting: value },
                  card.id,
                )
                onChange(newState.lighting)
              }}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 cursor-pointer w-full ${
                isActive
                  ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)]'
                  : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]'
              }`}
              aria-pressed={isActive}
              aria-label={`${t(`lighting.${card.id}.label`)}: ${t(`lighting.${card.id}.description`)}`}
            >
              <LightingThumbnail card={card} isActive={isActive} />
              <span className="text-[11px] font-medium text-center leading-tight">
                {t(`lighting.${card.id}.label`)}
              </span>
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
