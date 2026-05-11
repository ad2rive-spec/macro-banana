'use client'

import type { UseCaseId } from '../types'

interface UseCaseDef {
  id: UseCaseId
  label: string
  description: string
  icon: string  // emoji
  example: string
}

const USE_CASES: UseCaseDef[] = [
  {
    id: 'editorial-photo',
    label: 'Editorial Photo',
    description: 'Magazine or newspaper photography',
    icon: '📰',
    example: 'e.g. lifestyle, portrait, reportage',
  },
  {
    id: 'product-mockup',
    label: 'Product Shot',
    description: 'Clean product photography or mockup',
    icon: '📦',
    example: 'e.g. packaging, e-commerce, hero shot',
  },
  {
    id: 'poster',
    label: 'Poster / Print',
    description: 'Graphic poster, flyer, or print design',
    icon: '🎨',
    example: 'e.g. movie poster, event flyer',
  },
  {
    id: 'ui-screen',
    label: 'UI Screenshot',
    description: 'App or website interface mockup',
    icon: '📱',
    example: 'e.g. mobile app, dashboard, landing page',
  },
  {
    id: 'concept-art',
    label: 'Concept Art',
    description: 'Illustration or concept visualization',
    icon: '🖼️',
    example: 'e.g. character design, environment art',
  },
  {
    id: 'social-media',
    label: 'Social Media',
    description: 'Content optimized for social platforms',
    icon: '📸',
    example: 'e.g. Instagram post, story, thumbnail',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    description: 'Candid, journalistic, real-world feel',
    icon: '🎞️',
    example: 'e.g. street photography, reportage',
  },
]

interface UseCasePickerProps {
  value: UseCaseId | null
  onChange: (id: UseCaseId | null) => void
}

export function UseCasePicker({ value, onChange }: UseCasePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" role="group" aria-label="Use case selector">
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
            <span className={`text-[12px] font-semibold leading-tight ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
              {uc.label}
            </span>
            <span className="text-[10px] text-[var(--color-muted)] leading-snug">
              {uc.example}
            </span>
          </button>
        )
      })}
    </div>
  )
}
