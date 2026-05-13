'use client'

import { CONSTRAINT_OPTIONS } from '../logic'
import { useT } from '@/lib/LanguageContext'

interface ConstraintsPickerProps {
  value: string[]
  onChange: (constraints: string[]) => void
}

export function ConstraintsPicker({ value, onChange }: ConstraintsPickerProps) {
  const t = useT()
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter(c => c !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[var(--color-muted)] leading-relaxed">
        {t('constraints.description')}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Constraints">
        {CONSTRAINT_OPTIONS.map(opt => {
          const isActive = value.includes(opt.id)
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium',
                'transition-all duration-150 border cursor-pointer',
                isActive
                  ? 'bg-[var(--color-purple-subtle)] border-[rgba(255,215,0,0.4)] text-[var(--color-text)]'
                  : 'bg-[var(--color-raised)] border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-muted)]',
              ].join(' ')}
              aria-pressed={isActive}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple)] flex-shrink-0" aria-hidden="true" />
              )}
              {t(`constraint.${opt.id}.label`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
