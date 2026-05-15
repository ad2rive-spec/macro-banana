'use client'

import {
  CAMERA_PRESETS,
  LENS_PRESETS,
  FOCAL_LENGTHS,
  type CameraSettings,
} from '@/lib/cameraPresets'
import { DOFSlider } from './DOFSlider'
import { useT } from '@/lib/LanguageContext'

// ── Camera descriptions ───────────────────────────────────────────────────────

// Camera/lens descriptions are now translated via i18n — see CameraSettingsPanel component

// ── Focal Length Visualizer ───────────────────────────────────────────────────

function fovFromFocalLength(mm: number): number {
  return 2 * Math.atan(18 / mm) * (180 / Math.PI)
}

const FOCAL_COLORS: Record<number, string> = {
  8: '#f87171', 14: '#fb923c', 18: '#fbbf24', 24: '#a3e635', 28: '#34d399',
  35: '#22d3ee', 50: '#60a5fa', 85: '#818cf8', 100: '#a78bfa',
  135: '#c084fc', 200: '#e879f9',
}

const BASE_FL = 8

function FocalLengthVisualizer({ selected }: { selected: number | null }) {
  const t = useT()
  const isUnset = selected === null
  const active = selected ?? BASE_FL

  const scale = fovFromFocalLength(BASE_FL) / fovFromFocalLength(active)
  const focalColor = FOCAL_COLORS[active] ?? '#fff'
  const info = { label: t(`focal.${active}.label`), character: t(`focal.${active}.character`), color: focalColor }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}
    >
      {/* Image viewport */}
      <div className="relative overflow-hidden w-full" style={{ aspectRatio: '4 / 3' }}>
        <img
          src="/pic/guide/Focal-Length.jpg"
          alt="Focal length reference scene"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale.toFixed(3)})`,
            transformOrigin: 'center 20%',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease',
            filter: isUnset ? 'grayscale(1) brightness(0.6)' : 'none',
            userSelect: 'none',
          }}
        />

        {/* Focal length badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums"
          style={{
            background: 'rgba(0,0,0,0.65)',
            color: isUnset ? '#64748b' : info.color,
            backdropFilter: 'blur(4px)',
            transition: 'color 0.2s ease',
          }}
        >
          {isUnset ? '— mm' : `${active}mm · ${fovFromFocalLength(active).toFixed(0)}° FOV`}
        </div>

        {/* Zoom indicator bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: isUnset ? 'rgba(100,116,139,0.3)' : `${info.color}60` }}
        >
          <div
            className="h-full"
            style={{
              background: isUnset ? '#475569' : info.color,
              width: isUnset ? '0%' : `${Math.min(100, (1 / scale) * 100)}%`,
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Description strip */}
      <div
        className="px-3 py-2.5 border-t"
        style={{ borderColor: 'var(--color-border)', minHeight: '52px' }}
      >
        {isUnset ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-faint)' }}>
              {t('camera.focalUnset')}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-faint)' }}>
              {t('camera.focalUnsetHint')}
            </span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[12px] font-bold tabular-nums" style={{ color: info.color }}>
                {active}mm
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                {info.label}
              </span>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: 'var(--color-muted)' }}>
              {info.character}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CameraSettingsPanelProps {
  value: CameraSettings
  onChange: (settings: CameraSettings) => void
  dof: number
  onDofChange: (dof: number) => void
}

// ── Chip with tooltip ─────────────────────────────────────────────────────────

function ChipWithTooltip({
  label, sub, active, tooltip, onClick,
}: {
  label: string
  sub?: string
  active: boolean
  tooltip?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={[
        'flex flex-col items-start px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 border-none cursor-pointer flex-shrink-0',
        active
          ? 'bg-[var(--color-purple)] text-[#1a1a1a]'
          : 'bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
      ].join(' ')}
    >
      <span>{label}</span>
      {sub && (
        <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${active ? 'opacity-70' : 'opacity-50'}`}>
          {sub}
        </span>
      )}
    </button>
  )
}

// ── Plain chip ────────────────────────────────────────────────────────────────

function Chip({ label, active, disabled, onClick }: {
  label: string; active: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-3 py-1 rounded-full text-[12px] font-medium flex-shrink-0 transition-all duration-150 border-none',
        disabled
          ? 'opacity-25 cursor-not-allowed bg-[var(--color-raised)] text-[var(--color-muted)]'
          : active
            ? 'bg-[var(--color-purple)] text-[#1a1a1a] cursor-pointer'
            : 'bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-faint)]">
        {children}
      </div>
      {hint && (
        <span className="text-[10px] text-[var(--color-faint)] italic normal-case tracking-normal">
          {hint}
        </span>
      )}
    </div>
  )
}

function WrapRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row flex-wrap gap-1.5">{children}</div>
}

// ── Focal Length Slider (mirrors DOFSlider UI) ────────────────────────────────

// Ordered stops: index maps to slider value (0 = unset, 1 = 8mm, … 11 = 200mm)
const FL_STOPS: (number | null)[] = [null, 8, 14, 18, 24, 28, 35, 50, 85, 100, 135, 200]
const FL_LABELS: Record<number, string> = {
  [-1]: 'Unset', // won't be used but included for safety
  0: 'Unset', 1: '8mm', 2: '14mm', 3: '18mm', 4: '24mm', 5: '28mm',
  6: '35mm', 7: '50mm', 8: '85mm', 9: '100mm', 10: '135mm', 11: '200mm',
}

function FocalLengthSlider({
  value,
  disabled,
  onChange,
}: {
  value: number | null
  disabled?: boolean
  onChange: (fl: number | null) => void
}) {
  const t = useT()
  const idx = value === null ? 0 : FL_STOPS.indexOf(value)
  const isUnset = value === null
  const focalColor = value !== null ? (FOCAL_COLORS[value] ?? '#fff') : undefined
  const fov = value !== null ? fovFromFocalLength(value) : null

  const scale = value !== null
    ? fovFromFocalLength(BASE_FL) / fovFromFocalLength(value)
    : 1

  const label = t(`focal.${value}.label`)
  const character = t(`focal.${value}.character`)

  return (
    <div className="flex flex-col gap-5">
      {/* Image preview — same structure as DOF panel */}
      <div
        className="relative rounded-xl overflow-hidden w-full aspect-video sm:aspect-auto sm:h-[400px]"
        style={{}}
        aria-hidden="true"
      >
        <img
          src="/pic/guide/Focal-Length.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: `scale(${scale.toFixed(3)})`,
            transformOrigin: 'center 20%',
            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), filter 0.3s ease',
            filter: isUnset ? 'grayscale(1) brightness(0.5)' : 'none',
          }}
        />
        {isUnset && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[var(--color-muted)] text-sm font-medium">—</span>
          </div>
        )}
      </div>

      {/* Slider + labels */}
      <div className={`flex flex-col gap-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">Wide</span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: isUnset ? 'var(--color-muted)' : (focalColor ?? 'var(--color-text)'), transition: 'color 0.2s' }}
          >
            {isUnset ? 'Unset' : `${value}mm`}
          </span>
          <span className="text-xs text-[var(--color-muted)]">Tele</span>
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={FL_STOPS.length - 1}
          step={1}
          value={idx < 0 ? 0 : idx}
          onChange={e => {
            const i = Number(e.target.value)
            onChange(FL_STOPS[i])
          }}
          aria-label="Focal length"
          aria-valuetext={FL_LABELS[idx < 0 ? 0 : idx]}
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

        {/* Tick marks */}
        <div className="flex justify-between px-0.5">
          {FL_STOPS.map((_, i) => (
            <div
              key={i}
              className={`w-0.5 h-1 rounded-full transition-colors duration-150 ${
                i === (idx < 0 ? 0 : idx)
                  ? 'bg-[var(--color-purple)]'
                  : 'bg-[var(--color-faint)]'
              }`}
            />
          ))}
        </div>

        {/* Description — fixed height to prevent layout jump */}
        <p className="text-[11px] text-[var(--color-muted)] leading-snug h-[2.5em] overflow-hidden line-clamp-2">
          {isUnset
            ? t('camera.focalUnsetHint')
            : fov !== null
              ? `${fov.toFixed(0)}° FOV · ${label} · ${character}`
              : ''}
        </p>
      </div>
    </div>
  )
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row gap-1.5 overflow-x-auto pb-1 scrollbar-none">{children}</div>
}

export function CameraSettingsPanel({ value, onChange, dof, onDofChange }: CameraSettingsPanelProps) {
  const t = useT()
  const selectedLens = LENS_PRESETS.find(l => l.id === value.lens)
  const focalLengthLocked = selectedLens?.fixedFocalLength === true

  return (
    <div className="flex flex-col gap-5">

      {/* Camera Body */}
      <div>
        <SectionLabel hint={t('camera.hoverForDetails')}>{t('camera.body')}</SectionLabel>
        <WrapRow>
          {CAMERA_PRESETS.filter(c => c.id !== 'none').map(camera => (
            <ChipWithTooltip
              key={camera.id}
              label={camera.label}
              sub={camera.sub}
              active={value.camera === camera.id}
              tooltip={t(`camera.desc.${camera.id}`)}
              onClick={() => onChange({ ...value, camera: value.camera === camera.id ? 'none' : camera.id })}
            />
          ))}
        </WrapRow>
      </div>

      {/* Lens */}
      <div>
        <SectionLabel hint={t('camera.hoverForDetails')}>{t('camera.lensType')}</SectionLabel>
        <WrapRow>
          {LENS_PRESETS.filter(l => l.id !== 'none').map(lens => (
            <ChipWithTooltip
              key={lens.id}
              label={lens.label}
              sub={lens.sub}
              active={value.lens === lens.id}
              tooltip={t(`lens.desc.${lens.id}`)}
              onClick={() => {
                const newLensId = value.lens === lens.id ? 'none' : lens.id
                const newLens = LENS_PRESETS.find(l => l.id === newLensId)
                const focalLength = newLens?.fixedFocalLength ? null : value.focalLength
                onChange({ ...value, lens: newLensId, focalLength })
              }}
            />
          ))}
        </WrapRow>
      </div>

      {/* Focal Length */}
      <div>
        <SectionLabel hint={focalLengthLocked ? t('camera.focalLengthFixed') : t('camera.focalLengthAffects')}>
          {t('camera.focalLength')}
        </SectionLabel>
        {focalLengthLocked && (
          <p className="text-[11px] text-amber-400/80 mb-2 leading-snug">
            {t('camera.focalLengthConflictNote')}
          </p>
        )}
        <FocalLengthSlider
          value={value.focalLength}
          disabled={focalLengthLocked}
          onChange={fl => onChange({ ...value, focalLength: fl })}
        />
      </div>

      {/* Depth of Field */}
      <div>
        <SectionLabel>{t('camera.dof')}</SectionLabel>
        <DOFSlider value={dof} onChange={onDofChange} />
      </div>

    </div>
  )
}
