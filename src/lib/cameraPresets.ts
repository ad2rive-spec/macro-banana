// ── Shared camera preset data ──
// Used by both Studio (src/app/studio/page.tsx) and Guide (src/app/guide/)

export interface CameraPreset {
  id: string
  label: string
  sub?: string
  emoji: string
}

export interface LensPreset {
  id: string
  label: string
  sub?: string
  emoji: string
  /** true when the lens name already includes a fixed focal length */
  fixedFocalLength?: boolean
}

export interface CameraSettings {
  camera: string
  lens: string
  focalLength: number | null
  aperture: string | null
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'none',              label: 'None',                emoji: '—'   },
  // Classic Film
  { id: 'leica-m6',          label: 'Leica M6',            sub: '35MM',        emoji: '📷' },
  { id: 'hasselblad-500cm',  label: 'Hasselblad 500C/M',   sub: 'MEDIUM FMT',  emoji: '📷' },
  { id: 'rolleiflex-28f',    label: 'Rolleiflex 2.8F',     sub: 'TLR',         emoji: '📷' },
  { id: 'nikon-f3',          label: 'Nikon F3',            sub: '35MM SLR',    emoji: '📷' },
  { id: 'canon-ae1',         label: 'Canon AE-1',          sub: '35MM SLR',    emoji: '📷' },
  { id: 'contax-t2',         label: 'Contax T2',           sub: 'COMPACT',     emoji: '📷' },
  // Digital Cinema
  { id: 'arri-alexa',        label: 'ARRI Alexa 35',       sub: 'DIGITAL',     emoji: '🎬' },
  { id: 'red-v-raptor',      label: 'RED V-RAPTOR',        sub: 'DIGITAL',     emoji: '🎬' },
]

export const LENS_PRESETS: LensPreset[] = [
  { id: 'none',         label: 'None',                emoji: '—'  },
  { id: 'spherical',    label: 'Spherical Prime',     sub: 'SPHERICAL',   emoji: '🔵' },
  { id: 'anamorphic',   label: 'Anamorphic 2x',       sub: 'ANAMORPHIC',  emoji: '🟣' },
  { id: 'vintage',      label: 'Vintage Cooke S4',    sub: 'VINTAGE',     emoji: '🟡' },
  { id: 'macro',        label: 'Macro 100mm',         sub: 'MACRO',       emoji: '🔬', fixedFocalLength: true },
  { id: 'fisheye',      label: 'Fisheye 8mm',         sub: 'FISHEYE',     emoji: '🐟', fixedFocalLength: true },
  { id: 'tilt-shift',   label: 'Tilt-Shift 45mm',     sub: 'TILT-SHIFT',  emoji: '🏙️', fixedFocalLength: true },
]

export const FOCAL_LENGTHS: (number | null)[] = [null, 8, 14, 18, 24, 28, 35, 50, 85, 100, 135, 200]

export const APERTURES: (string | null)[] = [null, 'f/1.2', 'f/1.4', 'f/1.8', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11']

export const DEFAULT_CAMERA: CameraSettings = {
  camera: 'none',
  lens: 'none',
  focalLength: null,
  aperture: null,
}

export function buildCameraPrompt(s: CameraSettings): string {
  const parts: string[] = []
  if (s.camera !== 'none') parts.push(CAMERA_PRESETS.find(c => c.id === s.camera)?.label || '')
  if (s.lens   !== 'none') parts.push(LENS_PRESETS.find(l => l.id === s.lens)?.label || '')
  if (s.focalLength !== null) parts.push(`${s.focalLength}mm`)
  if (s.aperture    !== null) parts.push(s.aperture)
  return parts.filter(Boolean).join(', ')
}

export function hasCameraSettings(s: CameraSettings): boolean {
  return s.camera !== 'none' || s.lens !== 'none' || s.focalLength !== null || s.aperture !== null
}
