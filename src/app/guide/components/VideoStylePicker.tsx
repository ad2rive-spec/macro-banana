'use client'

import type { VideoStyleId } from '../types'

interface VideoStyleCard {
  id: VideoStyleId
  label: string
  description: string
  icon: string
  accent: string
}

const VIDEO_STYLE_CARDS: VideoStyleCard[] = [
  {
    id: 'action',
    label: 'Action',
    description: 'High energy, fast cuts, dynamic camera movement, intense pacing',
    icon: 'lucide:zap',
    accent: '#f87171',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    description: 'Raw, observational, natural light, reportage feel',
    icon: 'lucide:camera',
    accent: '#94a3b8',
  },
  {
    id: 'commercial',
    label: 'Commercial',
    description: 'Clean, polished, high production value advertising look',
    icon: 'lucide:sparkles',
    accent: '#34d399',
  },
  {
    id: 'music-video',
    label: 'Music Video',
    description: 'High contrast, stylised, energetic cuts and bold visual language',
    icon: 'lucide:music',
    accent: '#f472b6',
  },
  {
    id: 'short-film',
    label: 'Short Film',
    description: 'Narrative-driven, deliberate pacing, intentional mise-en-scène',
    icon: 'lucide:clapperboard',
    accent: '#fbbf24',
  },
  {
    id: 'news',
    label: 'Broadcast / News',
    description: 'Neutral, factual, static or subtle movement, professional',
    icon: 'lucide:tv-2',
    accent: '#38bdf8',
  },
  {
    id: 'vlog',
    label: 'Vlog',
    description: 'Casual, personal, natural light, conversational and immediate',
    icon: 'lucide:video',
    accent: '#a78bfa',
  },
  {
    id: 'comedy',
    label: 'Comedy',
    description: 'Light and playful, bright tones, warm colour grade',
    icon: 'lucide:smile',
    accent: '#facc15',
  },
  {
    id: 'horror',
    label: 'Horror',
    description: 'Dark, atmospheric, low-key lighting, unsettling composition',
    icon: 'lucide:moon',
    accent: '#818cf8',
  },
]

interface VideoStylePickerProps {
  value: VideoStyleId | null
  onChange: (id: VideoStyleId | null) => void
}

export function VideoStylePicker({ value, onChange }: VideoStylePickerProps) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      role="group"
      aria-label="Video style selector"
    >
      {VIDEO_STYLE_CARDS.map(card => {
        const isActive = value === card.id
        return (
          <button
            key={card.id}
            onClick={() => onChange(isActive ? null : card.id)}
            className={[
              'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer',
              isActive
                ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)]'
                : 'bg-[var(--color-raised)] border-[var(--color-border)] hover:border-[var(--color-muted)]',
            ].join(' ')}
            aria-pressed={isActive}
          >
            {/* Icon */}
            <span style={{ color: isActive ? card.accent : 'var(--color-faint)' }}>
              <iconify-icon icon={card.icon} width="18" height="18" />
            </span>
            {/* Label */}
            <span
              className="text-[12px] font-semibold leading-tight"
              style={{ color: isActive ? card.accent : 'var(--color-text)' }}
            >
              {card.label}
            </span>
            {/* Description */}
            <span className="text-[10px] leading-snug text-[var(--color-faint)]">
              {card.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
