'use client'

import { useRouter } from 'next/navigation'
import { assemblePrompt, buildStudioUrl } from '../logic'
import type { GuideState } from '../types'

// ── Token colour map ──────────────────────────────────────────────────────────

const TOKEN_COLORS: Record<string, string> = {
  subject:     '#f0f0f5',
  shotSize:    '#a78bfa',
  camera:      '#818cf8',
  angle:       '#38bdf8',
  lighting:    '#fb923c',
  style:       '#34d399',
  dof:         '#f472b6',
  mood:        '#e879f9',
  useCase:     '#22d3ee',
  constraints: '#94a3b8',
  movement:    '#facc15',
}

interface PromptPreviewProps {
  state: GuideState
  onSubjectChange: (subject: string) => void
  onReset: () => void
}

export function PromptPreview({ state, onReset }: PromptPreviewProps) {
  const router = useRouter()
  const segments = assemblePrompt(state)

  const tokens = [
    { key: 'subject',     text: segments.subject,     color: TOKEN_COLORS.subject },
    { key: 'shotSize',    text: segments.shotSize,     color: TOKEN_COLORS.shotSize },
    { key: 'camera',      text: segments.camera,       color: TOKEN_COLORS.camera },
    { key: 'angle',       text: segments.angle,        color: TOKEN_COLORS.angle },
    { key: 'lighting',    text: segments.lighting,     color: TOKEN_COLORS.lighting },
    { key: 'style',       text: segments.style,        color: TOKEN_COLORS.style },
    { key: 'dof',         text: segments.dof,          color: TOKEN_COLORS.dof },
    { key: 'mood',        text: segments.mood,         color: TOKEN_COLORS.mood },
    { key: 'useCase',     text: segments.useCase,      color: TOKEN_COLORS.useCase },
    { key: 'constraints', text: segments.constraints,  color: TOKEN_COLORS.constraints },
    { key: 'movement',    text: segments.movement,     color: TOKEN_COLORS.movement },
  ].filter(t => t.text !== null && t.text !== '')

  const isEmpty = !segments.full

  return (
    <div
      className="flex-shrink-0 border-t border-[var(--color-border)]"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="px-4 sm:px-6 lg:px-10 py-3 max-w-4xl mx-auto flex flex-col gap-2">

        {/* Token chips — only shown when there's content */}
        {tokens.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-1.5 pb-1">
            {tokens.map(token => (
              <span
                key={token.key}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md leading-snug whitespace-nowrap"
                style={{
                  color: token.color,
                  backgroundColor: `${token.color}15`,
                  border: `1px solid ${token.color}28`,
                }}
              >
                {token.text}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--color-faint)] italic pb-1">
            Make selections above to build your prompt
          </p>
        )}

        {/* Action row — always on its own line */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--color-border)]">
          <button
            onClick={() => {
              if (window.confirm('Reset all selections? This cannot be undone.')) {
                onReset()
              }
            }}
            className="text-[12px] text-[var(--color-faint)] hover:text-[var(--color-muted)] transition-colors bg-transparent border-none cursor-pointer flex-shrink-0"
          >
            Reset All
          </button>

          <button
            onClick={() => router.push(buildStudioUrl(state))}
            disabled={isEmpty}
            className={[
              'px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex-shrink-0',
              'bg-[var(--color-purple)] text-white border-none cursor-pointer',
              isEmpty ? 'opacity-35 cursor-not-allowed' : 'hover:opacity-90',
            ].join(' ')}
          >
            Send to Studio →
          </button>
        </div>

      </div>
    </div>
  )
}
