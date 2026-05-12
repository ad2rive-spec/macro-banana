'use client'

import {
  CAMERA_PRESETS,
  LENS_PRESETS,
  FOCAL_LENGTHS,
  type CameraSettings,
} from '@/lib/cameraPresets'
import { DOFSlider } from './DOFSlider'

// ── Camera descriptions ───────────────────────────────────────────────────────

const CAMERA_DESCRIPTIONS: Record<string, string> = {
  'leica-m6':         'Classic 35mm rangefinder. Renders with sharp, contrasty, timeless look. Beloved by street photographers.',
  'hasselblad-500cm': 'Medium format film. Produces rich tones, fine grain, and a square format with incredible detail.',
  'rolleiflex-28f':   'Twin-lens reflex. Soft, dreamy rendering with a distinctive square format and waist-level perspective.',
  'nikon-f3':         'Workhorse 35mm SLR. Neutral, reliable rendering — the photojournalist\'s camera.',
  'canon-ae1':        'Iconic 35mm SLR. Slightly warm rendering, popular for its accessible, nostalgic film look.',
  'contax-t2':        'Premium compact 35mm. Razor-sharp Zeiss lens, slightly clinical and precise.',
  'arri-alexa':       'Professional cinema camera. Natural skin tones, wide dynamic range, the "film look" of Hollywood.',
  'red-v-raptor':     'High-resolution cinema camera. Ultra-sharp, clinical detail — used for sci-fi and commercial work.',
}

const LENS_DESCRIPTIONS: Record<string, string> = {
  'spherical':  'Standard lens optics. Clean, natural perspective with no distortion. The default "normal" look.',
  'anamorphic': 'Widescreen cinema lens. Creates horizontal lens flares, oval bokeh, and a cinematic 2.39:1 feel.',
  'vintage':    'Vintage Cooke S4. Warm, slightly soft rendering with character — used in period films.',
  'macro':      '100mm macro lens. Extreme close-up capability, flat perspective, isolates fine details.',
  'fisheye':    '8mm fisheye. Extreme barrel distortion, ultra-wide 180° field of view.',
  'tilt-shift': 'Tilt-shift lens. Creates miniature effect or selective focus planes — used in architecture.',
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
  label,
  sub,
  active,
  tooltip,
  onClick,
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

function Chip({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
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

// ── Wrap chip row (for camera body + lens — many items) ──────────────────────

function WrapRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row flex-wrap gap-1.5">
      {children}
    </div>
  )
}

// ── Scrollable chip row (for focal length + aperture) ────────────────────────

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CameraSettingsPanel({ value, onChange, dof, onDofChange }: CameraSettingsPanelProps) {
  const selectedLens = LENS_PRESETS.find(l => l.id === value.lens)
  const focalLengthLocked = selectedLens?.fixedFocalLength === true

  return (
    <div className="flex flex-col gap-5">

      {/* Camera Body */}
      <div>
        <SectionLabel hint="hover chip for details">Camera Body</SectionLabel>
        <WrapRow>
          {CAMERA_PRESETS.filter(c => c.id !== 'none').map(camera => (
            <ChipWithTooltip
              key={camera.id}
              label={camera.label}
              sub={camera.sub}
              active={value.camera === camera.id}
              tooltip={CAMERA_DESCRIPTIONS[camera.id]}
              onClick={() => onChange({ ...value, camera: value.camera === camera.id ? 'none' : camera.id })}
            />
          ))}
        </WrapRow>
      </div>

      {/* Lens */}
      <div>
        <SectionLabel hint="hover chip for details">Lens Type</SectionLabel>
        <WrapRow>
          {LENS_PRESETS.filter(l => l.id !== 'none').map(lens => (
            <ChipWithTooltip
              key={lens.id}
              label={lens.label}
              sub={lens.sub}
              active={value.lens === lens.id}
              tooltip={LENS_DESCRIPTIONS[lens.id]}
              onClick={() => {
                const newLensId = value.lens === lens.id ? 'none' : lens.id
                const newLens = LENS_PRESETS.find(l => l.id === newLensId)
                // Auto-clear focalLength when switching to a fixed-focal-length lens
                const focalLength = newLens?.fixedFocalLength ? null : value.focalLength
                onChange({ ...value, lens: newLensId, focalLength })
              }}
            />
          ))}
        </WrapRow>
      </div>

      {/* Focal Length */}
      <div>
        <SectionLabel hint={focalLengthLocked ? '⚠ fixed by selected lens' : 'affects field of view & perspective'}>
          Focal Length
        </SectionLabel>
        {focalLengthLocked && (
          <p className="text-[11px] text-amber-400/80 mb-2 leading-snug">
            The selected lens has a fixed focal length — choosing a separate value would conflict with the prompt.
          </p>
        )}
        <ChipRow>
          {FOCAL_LENGTHS.filter((fl): fl is number => fl !== null).map(fl => (
            <Chip
              key={fl}
              label={`${fl}mm`}
              active={!focalLengthLocked && value.focalLength === fl}
              disabled={focalLengthLocked}
              onClick={() => {
                if (focalLengthLocked) return
                onChange({ ...value, focalLength: value.focalLength === fl ? null : fl })
              }}
            />
          ))}
        </ChipRow>
      </div>

      {/* Depth of Field */}
      <div>
        <SectionLabel>Depth of Field</SectionLabel>
        <DOFSlider value={dof} onChange={onDofChange} />
      </div>

    </div>
  )
}
