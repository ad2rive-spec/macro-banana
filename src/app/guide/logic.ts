// Guide Logic
// Pure helper functions for the Visual Prompt Guide.
// None of these functions mutate their inputs.

import { DEFAULT_CAMERA, buildCameraPrompt } from '@/lib/cameraPresets'
import type {
  GuideState,
  PromptSegments,
  ShotSizeId,
  AngleId,
  LightingId,
  LightDirectionId,
  StyleId,
  UseCaseId,
  MovementId,
  VideoStyleId,
} from './types'

// ──────────────────────────────────────────────
// Lookup maps (exported for property tests)
// ──────────────────────────────────────────────

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
  '45-front-left':  '45-degree front-left angle',
  '45-front-right': '45-degree front-right angle',
  '45-rear-left':   '45-degree rear-left angle',
  '45-rear-right':  '45-degree rear-right angle',
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

export const LIGHT_DIRECTION_TERMS: Record<LightDirectionId, string> = {
  'front':          'front lighting',
  'back':           'backlit, rim-lit from behind',
  'side-left':      'side lighting from the left',
  'side-right':     'side lighting from the right',
  'top':            'top-down overhead lighting',
  'bottom':         'underlighting from below',
  'rim':            'rim lighting',
  '45-front-left':  '45 front-left key light',
  '45-front-right': '45 front-right key light',
}

export const STYLE_TERMS: Record<StyleId, string> = {
  'cinematic':     'cinematic',
  'editorial':     'editorial fashion style',
  'documentary':   'documentary reportage style',
  'fine-art':      'fine art painterly style',
  'commercial':    'commercial advertising style',
  'street':        'street photography style',
  'architectural': 'architectural photography style',
  'macro':         'macro abstract style',
  'vintage':       'vintage film style',
  'minimal':       'clean minimal aesthetic',
}

export const VIDEO_STYLE_TERMS: Record<VideoStyleId, string> = {
  'action':      'action film style',
  'documentary': 'documentary style',
  'commercial':  'commercial polished look',
  'music-video': 'music video aesthetic',
  'short-film':  'short film narrative style',
  'news':        'broadcast news style',
  'vlog':        'vlog casual style',
  'comedy':      'comedy lighthearted style',
  'horror':      'horror atmospheric style',
}

export const USE_CASE_TERMS: Record<UseCaseId, string> = {
  'portrait':        'portrait photograph',
  'fashion':         'fashion photography',
  'editorial-photo': 'editorial photograph',
  'product-mockup':  'product mockup photograph',
  'social-media':    'social media content',
  'poster':          'poster design',
  'album-cover':     'album cover artwork',
  'concept-art':     'concept art illustration',
  'fantasy-scifi':   'fantasy sci-fi illustration',
  'anime-manga':     'anime illustration',
  'architecture':    'architectural photograph',
  'food':            'food photography',
  'ui-screen':       'UI screenshot mockup',
  'wallpaper':       'wallpaper artwork',
  'documentary':     'documentary photograph',
}

/** All constraint prompt terms — user picks from these */
export const CONSTRAINT_OPTIONS = [
  { id: 'no-watermark',    label: 'No watermark',        term: 'no watermark' },
  { id: 'no-logos',        label: 'No logos',            term: 'no logos' },
  { id: 'no-extra-text',   label: 'No extra text',       term: 'no extra text' },
  { id: 'no-extra-people', label: 'No extra people',     term: 'no extra people in foreground' },
  { id: 'no-retouching',   label: 'No heavy retouching', term: 'no heavy retouching' },
  { id: 'preserve-face',   label: 'Preserve face',       term: 'preserve the face exactly' },
  { id: 'photoreal',       label: 'Photoreal',           term: 'photorealistic, believable' },
  { id: 'no-camera-shake', label: 'No camera shake',     term: 'no camera shake' },
  { id: 'smooth-motion',   label: 'Smooth motion',       term: 'smooth continuous motion' },
] as const

export type ConstraintId = typeof CONSTRAINT_OPTIONS[number]['id']

/**
 * DOF_MAP: slider value (-1 to 8) prompt term (null when unset).
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
  'static':      'static locked shot',
  'handheld':    'handheld camera shot',
  'zoom-out':    'zoom out',
  'zoom-in':     'zoom in',
  'cam-follows': 'camera follows subject',
  'pan-left':    'camera pan left shot',
  'pan-right':   'camera pan right shot',
  'tilt-up':     'camera tilt up shot',
  'tilt-down':   'camera tilt down shot',
  'orbit':       'camera orbit around subject',
  'dolly-in':    'camera dolly in shot',
  'dolly-out':   'camera dolly out shot',
  'jib-up':      'camera jib up shot',
  'jib-down':    'camera jib down shot',
  'drone':       'drone aerial shot',
  'dolly-left':  'camera dolly left shot',
  'dolly-right': 'camera dolly right shot',
}

/** Action presets for video Subject + Action section */
export const ACTION_PRESETS = [
  { id: 'walking',    label: 'Walking',     term: 'walking forward' },
  { id: 'turning',    label: 'Turning',     term: 'slowly turning to face camera' },
  { id: 'talking',    label: 'Talking',     term: 'speaking, mouth moving naturally' },
  { id: 'running',    label: 'Running',     term: 'running' },
  { id: 'sitting',    label: 'Sitting',     term: 'sitting still' },
  { id: 'standing',   label: 'Standing',    term: 'standing still' },
  { id: 'gesturing',  label: 'Gesturing',   term: 'gesturing with hands' },
  { id: 'looking-up', label: 'Looking up',  term: 'slowly looking up' },
  { id: 'dancing',    label: 'Dancing',     term: 'dancing' },
  { id: 'idle',       label: 'Subtle idle', term: 'subtle natural idle movement' },
] as const

export type ActionPresetId = typeof ACTION_PRESETS[number]['id']

// ──────────────────────────────────────────────
// State factory
// ──────────────────────────────────────────────

/** Returns a fresh initial GuideState. Never mutates anything. */
export function initialGuideState(): GuideState {
  return {
    mediaTab:       'image',
    subject:        '',
    shotSize:       null,
    camera:         { ...DEFAULT_CAMERA },
    angle:          null,
    lighting:       [],
    lightDirection: null,
    style:          null,
    dof:            -1,
    useCase:        null,
    constraints:    [],
    // video-specific
    movement:       null,
    action:         '',
    setting:        '',
    videoStyle:     null,
  }
}

// ──────────────────────────────────────────────
// Pure state helpers
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Prompt assembly
// ──────────────────────────────────────────────

/**
 * assemblePrompt — derives PromptSegments from GuideState.
 *
 * IMAGE order:
 *   Subject -> Shot/Camera/Angle -> Lighting/Direction -> Style/DOF -> UseCase -> Constraints
 *
 * VIDEO order:
 *   Movement -> Subject + Action -> Shot Size -> Setting -> Video Style -> Constraints
 *
 * Rules:
 * - video-specific fields (movement, action, setting, videoStyle) are omitted in image mode
 * - image-specific fields (camera, angle, lighting, lightDirection, style, dof, useCase) are omitted in video mode
 * - constraints are shared
 */
export function assemblePrompt(state: GuideState): PromptSegments {
  const constraintsStr =
    state.constraints.length > 0
      ? state.constraints
          .map(id => CONSTRAINT_OPTIONS.find(c => c.id === id)?.term ?? id)
          .join(', ')
      : null

  if (state.mediaTab === 'video') {
    // Video prompt
    const movement   = state.movement ? MOVEMENT_TERMS[state.movement] : null
    const subject    = state.subject.trim() || null
    const action     = state.action.trim() || null
    const shotSize   = state.shotSize ? SHOT_SIZE_TERMS[state.shotSize] : null
    const setting    = state.setting.trim() || null
    const videoStyle = state.videoStyle ? VIDEO_STYLE_TERMS[state.videoStyle] : null

    // Combine subject + action into one token for the full prompt
    const subjectAction =
      subject && action ? `${subject}, ${action}` : subject ?? action

    const full = [movement, subjectAction, shotSize, setting, videoStyle, constraintsStr]
      .filter((s): s is string => s !== null && s !== '')
      .join(', ')

    return {
      subject,
      shotSize,
      camera:         null,
      angle:          null,
      lighting:       null,
      lightDirection: null,
      style:          null,
      dof:            null,
      useCase:        null,
      constraints:    constraintsStr,
      movement,
      action,
      setting,
      videoStyle,
      full,
    }
  }

  // Image prompt
  const subject  = state.subject.trim() || null
  const shotSize = state.shotSize ? SHOT_SIZE_TERMS[state.shotSize] : null
  const cameraStr = buildCameraPrompt(state.camera) || null
  const angle    = state.angle ? ANGLE_TERMS[state.angle] : null

  const lightingStr =
    state.lighting.length > 0
      ? state.lighting.map(id => LIGHTING_TERMS[id]).join(', ')
      : null

  const lightDirection = state.lightDirection
    ? LIGHT_DIRECTION_TERMS[state.lightDirection]
    : null

  const style  = state.style ? STYLE_TERMS[state.style] : null
  const dof    = DOF_MAP[state.dof] ?? null
  const useCase = state.useCase ? USE_CASE_TERMS[state.useCase] : null

  const full = [
    subject,
    shotSize,
    cameraStr,
    angle,
    lightingStr,
    lightDirection,
    style,
    dof,
    useCase,
    constraintsStr,
  ]
    .filter((s): s is string => s !== null && s !== '')
    .join(', ')

  return {
    subject,
    shotSize,
    camera:         cameraStr,
    angle,
    lighting:       lightingStr,
    lightDirection,
    style,
    dof,
    useCase,
    constraints:    constraintsStr,
    movement:       null,
    action:         null,
    setting:        null,
    videoStyle:     null,
    full,
  }
}

// ──────────────────────────────────────────────
// Studio URL builder
// ──────────────────────────────────────────────

/**
 * buildStudioUrl — pure function; does not mutate state.
 * Returns the URL to navigate to Studio with the assembled prompt pre-filled.
 */
export function buildStudioUrl(state: GuideState): string {
  const segments = assemblePrompt(state)
  return `/studio?prompt=${encodeURIComponent(segments.full)}&tab=${state.mediaTab}`
}
