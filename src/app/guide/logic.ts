// ── Guide Logic ──
// Pure helper functions for the Visual Prompt Guide.
// None of these functions mutate their inputs.

import { DEFAULT_CAMERA, buildCameraPrompt } from '@/lib/cameraPresets'
import type {
  GuideState,
  PromptSegments,
  ShotSizeId,
  AngleId,
  LightingId,
  StyleId,
  UseCaseId,
  MoodId,
  MovementId,
} from './types'

// ─────────────────────────────────────────────
// Lookup maps (exported for property tests)
// ─────────────────────────────────────────────

export const SHOT_SIZE_TERMS: Record<ShotSizeId, string> = {
  ecu: 'extreme close-up',
  cu:  'close-up',
  mcu: 'medium close-up',
  ms:  'medium shot',
  mfs: 'medium full shot',
  fs:  'full shot',
  ws:  'wide shot',
  els: 'extreme long shot',
}

export const ANGLE_TERMS: Record<AngleId, string> = {
  'eye-level':  'eye level',
  'low-angle':  'low angle',
  'high-angle': 'high angle',
  'birds-eye':  "bird's eye view",
  'worms-eye':  "worm's eye view",
  'dutch-tilt': 'dutch tilt',
  'ots':        'over-the-shoulder',
}

export const LIGHTING_TERMS: Record<LightingId, string> = {
  'golden-hour':  'golden hour lighting',
  'blue-hour':    'blue hour lighting',
  'overcast':     'overcast diffused lighting',
  'hard-studio':  'hard studio lighting',
  'soft-studio':  'soft studio lighting',
  'neon':         'neon cyberpunk lighting',
  'candlelight':  'candlelight practical lighting',
  'rembrandt':    'rembrandt lighting',
  'high-key':     'high-key lighting',
  'low-key':      'low-key lighting',
}

export const STYLE_TERMS: Record<StyleId, string> = {
  'cinematic':     'cinematic widescreen',
  'editorial':     'editorial fashion style',
  'documentary':   'documentary reportage style',
  'fine-art':      'fine art painterly style',
  'commercial':    'commercial advertising style',
  'street':        'street photography style',
  'architectural': 'architectural photography style',
  'macro':         'macro abstract style',
  'vintage':       'vintage film style',
}

export const USE_CASE_TERMS: Record<UseCaseId, string> = {
  'editorial-photo': 'editorial photograph',
  'product-mockup':  'product mockup photograph',
  'poster':          'poster design',
  'ui-screen':       'UI screenshot',
  'concept-art':     'concept art illustration',
  'social-media':    'social media content',
  'documentary':     'documentary photograph',
}

export const MOOD_TERMS: Record<MoodId, string> = {
  'warm':        'warm golden tones',
  'cold':        'cool blue tones',
  'dramatic':    'dramatic high contrast',
  'minimal':     'clean minimal aesthetic',
  'nostalgic':   'nostalgic film look',
  'energetic':   'vibrant energetic',
  'melancholic': 'melancholic moody atmosphere',
  'ethereal':    'soft ethereal dreamlike',
}

/** All constraint prompt terms — user picks from these */
export const CONSTRAINT_OPTIONS = [
  { id: 'no-watermark',    label: 'No watermark',     term: 'no watermark' },
  { id: 'no-logos',        label: 'No logos',         term: 'no logos' },
  { id: 'no-extra-text',   label: 'No extra text',    term: 'no extra text' },
  { id: 'no-extra-people', label: 'No extra people',  term: 'no extra people in foreground' },
  { id: 'no-retouching',   label: 'No heavy retouching', term: 'no heavy retouching' },
  { id: 'preserve-face',   label: 'Preserve face',    term: 'preserve the face exactly' },
  { id: 'photoreal',       label: 'Photoreal',        term: 'photorealistic, believable' },
] as const

export type ConstraintId = typeof CONSTRAINT_OPTIONS[number]['id']

/**
 * DOF_MAP: slider value (-1 to 8) → prompt term (null when unset).
 * Exported so property tests can import it directly.
 */
export const DOF_MAP: Record<number, string | null> = {
  [-1]: null,
  0:    'shallow depth of field, f/1.2 bokeh',
  1:    'shallow depth of field, f/1.4 bokeh',
  2:    'shallow depth of field, f/1.8 bokeh',
  3:    'moderate depth of field, f/2.8',
  4:    'moderate depth of field, f/4',
  5:    'deep focus, f/5.6',
  6:    'deep focus, f/8',
  7:    'deep focus, f/11',
  8:    'deep focus, f/16, everything sharp',
}

/**
 * MOVEMENT_TERMS: all possible movement prompt strings.
 * Exported so property tests can verify none appear in image-mode prompts.
 */
export const MOVEMENT_TERMS: Record<MovementId, string> = {
  'static':     'static locked shot',
  'pan-left':   'slow pan left',
  'pan-right':  'slow pan right',
  'tilt-up':    'tilt up',
  'tilt-down':  'tilt down',
  'dolly-in':   'dolly in',
  'dolly-out':  'dolly out',
  'tracking':   'tracking shot',
  'handheld':   'handheld verité',
  'crane-up':   'crane jib up',
  'crane-down': 'crane jib down',
  'drone':      'drone aerial shot',
}

// ─────────────────────────────────────────────
// State factory
// ─────────────────────────────────────────────

/** Returns a fresh initial GuideState. Never mutates anything. */
export function initialGuideState(): GuideState {
  return {
    mediaTab:    'image',
    subject:     '',
    shotSize:    null,
    camera:      { ...DEFAULT_CAMERA },
    angle:       null,
    lighting:    [],
    style:       null,
    dof:         -1,
    mood:        null,
    useCase:     null,
    constraints: [],
    movement:    null,
  }
}

// ─────────────────────────────────────────────
// Pure state helpers
// ─────────────────────────────────────────────

/**
 * addLighting — FIFO cap at 2.
 * - If `id` is already in the array, returns state unchanged (no-op / toggle-off).
 * - If the array already has 2 items, removes the first (oldest) and appends the new id.
 * - Otherwise appends the new id.
 */
export function addLighting(state: GuideState, id: LightingId): GuideState {
  const current = state.lighting

  // Toggle off if already selected
  if (current.includes(id)) {
    return { ...state, lighting: current.filter(l => l !== id) }
  }

  // FIFO eviction when at cap
  const next =
    current.length >= 2
      ? [...current.slice(1), id]
      : [...current, id]

  return { ...state, lighting: next }
}

/**
 * setStyle — single-select toggle.
 * Selecting the active style sets it to null; selecting a new style replaces the old one.
 */
export function setStyle(state: GuideState, id: StyleId): GuideState {
  return { ...state, style: state.style === id ? null : id }
}

/**
 * resetState — returns a fresh initialGuideState(), leaving the input unchanged.
 */
export function resetState(_state: GuideState): GuideState {
  return initialGuideState()
}

// ─────────────────────────────────────────────
// Prompt assembly
// ─────────────────────────────────────────────

/**
 * assemblePrompt — derives PromptSegments from GuideState.
 *
 * Follows fal.ai structured prompt format:
 * Subject → Shot/Camera/Angle → Lighting/Style/DOF/Mood → Use Case → Constraints → Movement
 *
 * Rules:
 * - movement is omitted when mediaTab === 'image'
 * - dof is omitted when camera.aperture is non-null (camera aperture takes precedence)
 * - constraints are appended as a comma-separated list
 */
export function assemblePrompt(state: GuideState): PromptSegments {
  const subject  = state.subject.trim() || null
  const shotSize = state.shotSize ? SHOT_SIZE_TERMS[state.shotSize] : null
  const cameraStr = buildCameraPrompt(state.camera) || null
  const angle    = state.angle ? ANGLE_TERMS[state.angle] : null

  const lightingStr =
    state.lighting.length > 0
      ? state.lighting.map(id => LIGHTING_TERMS[id]).join(', ')
      : null

  const style = state.style ? STYLE_TERMS[state.style] : null

  // DOF is omitted when camera.aperture is already set (prevents duplicate aperture language)
  const dof =
    state.camera.aperture !== null
      ? null
      : (DOF_MAP[state.dof] ?? null)

  const mood    = state.mood    ? MOOD_TERMS[state.mood]       : null
  const useCase = state.useCase ? USE_CASE_TERMS[state.useCase] : null

  const constraintsStr =
    state.constraints.length > 0
      ? state.constraints
          .map(id => CONSTRAINT_OPTIONS.find(c => c.id === id)?.term ?? id)
          .join(', ')
      : null

  // Movement is omitted entirely in image mode
  const movement =
    state.mediaTab === 'video' && state.movement
      ? MOVEMENT_TERMS[state.movement]
      : null

  // Join in the canonical order, skipping nulls
  const full = [
    subject,
    shotSize,
    cameraStr,
    angle,
    lightingStr,
    style,
    dof,
    mood,
    useCase,
    constraintsStr,
    movement,
  ]
    .filter((s): s is string => s !== null && s !== '')
    .join(', ')

  return {
    subject,
    shotSize,
    camera:      cameraStr,
    angle,
    lighting:    lightingStr,
    style,
    dof,
    mood,
    useCase,
    constraints: constraintsStr,
    movement,
    full,
  }
}

// ─────────────────────────────────────────────
// Studio URL builder
// ─────────────────────────────────────────────

/**
 * buildStudioUrl — pure function; does not mutate state.
 * Returns the URL to navigate to Studio with the assembled prompt pre-filled.
 */
export function buildStudioUrl(state: GuideState): string {
  const segments = assemblePrompt(state)
  return `/studio?prompt=${encodeURIComponent(segments.full)}&tab=${state.mediaTab}`
}
