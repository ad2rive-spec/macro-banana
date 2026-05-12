'use client'

// ── DOFSlider ─────────────────────────────────────────────────────────────────
// Depth-of-field aperture slider with a CSS blur preview panel.
// Slider range: -1 (unset) to 8 (f/16).

import { DOF_MAP } from '../logic'

// ── Aperture label map ────────────────────────────────────────────────────────

const APERTURE_LABELS: Record<number, string> = {
  [-1]: 'Unset',
  0:    'f/1.2',
  1:    'f/1.4',
  2:    'f/1.8',
  3:    'f/2.8',
  4:    'f/4',
  5:    'f/5.6',
  6:    'f/8',
  7:    'f/11',
  8:    'f/16',
}

// ── DOF image map ─────────────────────────────────────────────────────────────

const DOF_IMAGES: Record<number, string> = {
  [-1]: '/pic/guide/f1p2.png',
  0:    '/pic/guide/f1p2.png',
  1:    '/pic/guide/f1p4.png',
  2:    '/pic/guide/f1p8.png',
  3:    '/pic/guide/f2p8.png',
  4:    '/pic/guide/f4.png',
  5:    '/pic/guide/f5p6.png',
  6:    '/pic/guide/f8.png',
  7:    '/pic/guide/f11.png',
  8:    '/pic/guide/f16.png',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DOFSliderProps {
  value: number   // -1 to 8
  onChange: (value: number) => void
  cameraApertureSet?: boolean  // when true, this slider is ignored
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

export function DOFSlider({ value, onChange, cameraApertureSet = false }: DOFSliderProps) {
  const apertureLabel = APERTURE_LABELS[value] ?? 'Unset'
  const promptTerm    = value === -1 ? null : (DOF_MAP[value] ?? null)
  const isUnset       = value === -1

  return (
    <div className="flex flex-col gap-5">
      {/* Conflict warning */}
      {cameraApertureSet && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-amber-400 text-[13px] flex-shrink-0 mt-0.5">⚠</span>
          <p className="text-[11px] text-amber-400/90 leading-snug">
            You&apos;ve selected an aperture in the Framing section. That value will be used in the prompt — this slider will be ignored to avoid duplicate aperture terms.
          </p>
        </div>
      )}
      {/* ── DOF preview panel ── */}
      <div
        className="relative rounded-xl overflow-hidden w-full"
        style={{ height: 170 }}
        aria-hidden="true"
      >
        {/* Background DOF image */}
        <img
          src={DOF_IMAGES[value]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
          style={isUnset ? { filter: 'grayscale(1) brightness(0.5)' } : undefined}
        />

        {/* Unset — dark overlay with label */}
        {isUnset && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[var(--color-muted)] text-sm font-medium">—</span>
          </div>
        )}
      </div>

      {/* ── Slider + labels ── */}
      <div className="flex flex-col gap-2">
        {/* Aperture label row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">Shallow</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              isUnset ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)]'
            }`}
          >
            {apertureLabel}
          </span>
          <span className="text-xs text-[var(--color-muted)]">Deep</span>
        </div>

        {/* Range input */}
        <input
          type="range"
          min={-1}
          max={8}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label="Depth of field"
          aria-valuetext={apertureLabel}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                     bg-[var(--color-raised)]
                     accent-[var(--color-purple)]
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-[var(--color-purple)]
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-white/20
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-[var(--color-purple)]
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-white/20
                     [&::-moz-range-thumb]:cursor-pointer"
        />

        {/* Tick marks for aperture stops */}
        <div className="flex justify-between px-0.5">
          {/* -1 (unset) + 0–8 = 10 positions */}
          {Array.from({ length: 10 }, (_, i) => i - 1).map(v => (
            <div
              key={v}
              className={`w-0.5 h-1 rounded-full transition-colors duration-150 ${
                v === value
                  ? 'bg-[var(--color-purple)]'
                  : 'bg-[var(--color-faint)]'
              }`}
            />
          ))}
        </div>

        {/* Prompt term */}
        <p className="text-[11px] text-[var(--color-muted)] leading-snug min-h-[1.5em] truncate">
          {promptTerm ?? (isUnset ? 'No depth of field term added' : '')}
        </p>
      </div>
    </div>
  )
}
