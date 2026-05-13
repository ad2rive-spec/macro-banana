'use client'

import { assemblePrompt } from '../logic'
import type { GuideState } from '../types'
import { useT } from '@/lib/LanguageContext'

//  Token colour map 

const TOKEN_COLORS: Record<string, string> = {
  // image tokens
  subject:        '#f0f0f5',
  shotSize:       '#FFD700',
  camera:         '#818cf8',
  angle:          '#38bdf8',
  lighting:       '#fb923c',
  lightDirection: '#fbbf24',
  style:          '#34d399',
  dof:            '#f472b6',
  useCase:        '#22d3ee',
  constraints:    '#94a3b8',
  // video tokens
  movement:       '#facc15',
  action:         '#f0f0f5',
  setting:        '#38bdf8',
  videoStyle:     '#a78bfa',
}

interface PromptPreviewProps {
  state: GuideState
  onSubjectChange: (subject: string) => void
  onReset: () => void
  /** Called instead of default navigation when provided */
  onSend?: () => void
}

export function PromptPreview({ state, onReset, onSend }: PromptPreviewProps) {
  const t = useT()
  const segments = assemblePrompt(state)
  const warnings: string[] = []

  const isVideo = state.mediaTab === 'video'

  const tokens = isVideo
    ? [
        { key: 'movement',    text: segments.movement,    color: TOKEN_COLORS.movement },
        { key: 'subject',     text: segments.subject,     color: TOKEN_COLORS.subject },
        { key: 'action',      text: segments.action,      color: TOKEN_COLORS.action },
        { key: 'shotSize',    text: segments.shotSize,     color: TOKEN_COLORS.shotSize },
        { key: 'setting',     text: segments.setting,     color: TOKEN_COLORS.setting },
        { key: 'videoStyle',  text: segments.videoStyle,  color: TOKEN_COLORS.videoStyle },
        { key: 'constraints', text: segments.constraints, color: TOKEN_COLORS.constraints },
      ]
    : [
        { key: 'subject',        text: segments.subject,        color: TOKEN_COLORS.subject },
        { key: 'shotSize',       text: segments.shotSize,       color: TOKEN_COLORS.shotSize },
        { key: 'camera',         text: segments.camera,         color: TOKEN_COLORS.camera },
        { key: 'angle',          text: segments.angle,          color: TOKEN_COLORS.angle },
        { key: 'lighting',       text: segments.lighting,       color: TOKEN_COLORS.lighting },
        { key: 'lightDirection', text: segments.lightDirection, color: TOKEN_COLORS.lightDirection },
        { key: 'style',          text: segments.style,          color: TOKEN_COLORS.style },
        { key: 'dof',            text: segments.dof,            color: TOKEN_COLORS.dof },
        { key: 'useCase',        text: segments.useCase,        color: TOKEN_COLORS.useCase },
        { key: 'constraints',    text: segments.constraints,    color: TOKEN_COLORS.constraints },
      ]

  const visibleTokens = tokens.filter(tok => tok.text !== null && tok.text !== '')
  const isEmpty = !segments.full

  return (
    <div
      className="flex-shrink-0 border-t border-[var(--color-border)]"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="px-4 sm:px-6 lg:px-10 py-3 max-w-4xl mx-auto flex flex-col gap-2">

        {/* Token chips */}
        {visibleTokens.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-1.5 pb-1">
            {visibleTokens.map(token => (
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
            {isVideo
              ? (t('video.section.cameraMovement') + '…')
              : 'Make selections above to build your prompt'}
          </p>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-1 pb-1">
            {warnings.map((msg, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-400/80 leading-snug">
                <span className="flex-shrink-0"></span>
                <span>{msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--color-border)]">
          <button
            onClick={() => {
              if (window.confirm('Reset all selections? This cannot be undone.')) {
                onReset()
                  }
            }}
            className="text-[12px] text-[var(--color-faint)] hover:text-[var(--color-muted)] transition-colors bg-transparent border-none cursor-pointer flex-shrink-0"
          >
            {t('prompt.reset')}
          </button>

          <button
            onClick={() => { if (onSend) onSend() }}
            disabled={isEmpty}
            className={[
              'px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex-shrink-0',
              'bg-[var(--color-purple)] text-[#1a1a1a] border-none cursor-pointer',
              isEmpty ? 'opacity-35 cursor-not-allowed' : 'hover:opacity-90',
            ].join(' ')}
          >
            {t('prompt.sendToStudio')} →
          </button>
        </div>

      </div>
    </div>
  )
}
