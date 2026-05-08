'use client'

import type { MoodId } from '../types'

interface MoodDef {
  id: MoodId
  label: string
  description: string
  gradient: string
  textColor: string
}

const MOODS: MoodDef[] = [
  {
    id: 'warm',
    label: 'Warm',
    description: 'Golden, amber, inviting tones',
    gradient: 'from-amber-500/30 to-orange-600/20',
    textColor: '#fbbf24',
  },
  {
    id: 'cold',
    label: 'Cold',
    description: 'Cool blues, clinical, distant',
    gradient: 'from-blue-600/30 to-cyan-700/20',
    textColor: '#60a5fa',
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    description: 'High contrast, intense shadows',
    gradient: 'from-gray-900/60 to-purple-900/30',
    textColor: '#c084fc',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean, airy, generous whitespace',
    gradient: 'from-gray-200/20 to-gray-300/10',
    textColor: '#d1d5db',
  },
  {
    id: 'nostalgic',
    label: 'Nostalgic',
    description: 'Faded, vintage, film-like',
    gradient: 'from-yellow-700/30 to-amber-800/20',
    textColor: '#d97706',
  },
  {
    id: 'energetic',
    label: 'Energetic',
    description: 'Vibrant, saturated, dynamic',
    gradient: 'from-pink-500/30 to-violet-600/20',
    textColor: '#f472b6',
  },
  {
    id: 'melancholic',
    label: 'Melancholic',
    description: 'Muted, grey, introspective',
    gradient: 'from-slate-600/30 to-slate-800/20',
    textColor: '#94a3b8',
  },
  {
    id: 'ethereal',
    label: 'Ethereal',
    description: 'Soft, dreamy, otherworldly',
    gradient: 'from-violet-400/20 to-pink-300/15',
    textColor: '#a78bfa',
  },
]

interface MoodPickerProps {
  value: MoodId | null
  onChange: (id: MoodId | null) => void
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Mood selector">
      {MOODS.map(mood => {
        const isActive = value === mood.id
        return (
          <button
            key={mood.id}
            onClick={() => onChange(isActive ? null : mood.id)}
            className={[
              'relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer overflow-hidden',
              isActive
                ? 'border-[rgba(113,50,245,0.5)] ring-1 ring-[rgba(113,50,245,0.3)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-muted)]',
            ].join(' ')}
            aria-pressed={isActive}
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-60'}`} />

            {/* Content */}
            <span
              className="relative text-[13px] font-semibold"
              style={{ color: isActive ? mood.textColor : 'var(--color-text)' }}
            >
              {mood.label}
            </span>
            <span className="relative text-[10px] text-[var(--color-muted)] leading-snug">
              {mood.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
