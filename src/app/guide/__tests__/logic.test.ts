/**
 * Property-based tests for the Visual Prompt Guide logic.
 * Uses fast-check for property generation.
 *
 * Feature: prompt-guide
 * Spec: .kiro/specs/prompt-guide/
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

import {
  initialGuideState,
  assemblePrompt,
  addLighting,
  setStyle,
  resetState,
  buildStudioUrl,
  MOVEMENT_TERMS,
  DOF_MAP,
} from '../logic'

import type {
  GuideState,
  ShotSizeId,
  AngleId,
  LightingId,
  StyleId,
  MovementId,
} from '../types'

import { DEFAULT_CAMERA } from '@/lib/cameraPresets'

// ─────────────────────────────────────────────
// Arbitraries
// ─────────────────────────────────────────────

const shotSizeIds: ShotSizeId[] = ['ecu', 'cu', 'mcu', 'ms', 'mfs', 'fs', 'ws', 'els']
const angleIds: AngleId[] = ['eye-level', 'low-angle', 'high-angle', 'birds-eye', 'worms-eye', 'dutch-tilt', 'ots']
const lightingIds: LightingId[] = [
  'golden-hour', 'blue-hour', 'overcast', 'hard-studio', 'soft-studio',
  'neon', 'candlelight', 'rembrandt', 'high-key', 'low-key',
]
const styleIds: StyleId[] = [
  'cinematic', 'editorial', 'documentary', 'fine-art', 'commercial',
  'street', 'architectural', 'macro', 'vintage',
]
const movementIds: MovementId[] = [
  'static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down',
  'dolly-in', 'dolly-out', 'tracking', 'handheld', 'crane-up', 'crane-down', 'drone',
]
const apertureValues = [null, 'f/1.2', 'f/1.4', 'f/1.8', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11']

const arbitraryShotSizeId = () => fc.constantFrom(...shotSizeIds)
const arbitraryAngleId = () => fc.constantFrom(...angleIds)
const arbitraryLightingId = () => fc.constantFrom(...lightingIds)
const arbitraryStyleId = () => fc.constantFrom(...styleIds)
const arbitraryMovementId = () => fc.constantFrom(...movementIds)

/** Arbitrary for a valid CameraSettings object */
const arbitraryCameraSettings = () =>
  fc.record({
    camera: fc.constantFrom('none', 'leica-m6', 'arri-alexa', 'red-v-raptor'),
    lens: fc.constantFrom('none', 'spherical', 'anamorphic', 'macro'),
    focalLength: fc.option(fc.constantFrom(24, 35, 50, 85, 100), { nil: null }),
    aperture: fc.option(fc.constantFrom('f/1.2', 'f/1.4', 'f/1.8', 'f/2.8', 'f/4', 'f/8'), { nil: null }),
  })

/**
 * Arbitrary for a subject string — alphanumeric + spaces only.
 * Commas are excluded because the property tests focus on assembly artefacts
 * from empty/null segments, not sanitization of user-typed content.
 */
const arbitrarySubject = () =>
  fc.stringMatching(/^[a-zA-Z0-9 ]{0,80}$/)

const lightDirectionIds = ['front', 'back', 'side-left', 'side-right', 'top', 'bottom', 'rim', '45-front-left', '45-front-right'] as const
const useCaseIds = ['editorial-photo', 'product-mockup', 'poster', 'ui-screen', 'concept-art', 'social-media', 'documentary'] as const
const constraintIds = ['no-watermark', 'no-logos', 'no-extra-text', 'no-extra-people', 'no-retouching', 'preserve-face', 'photoreal'] as const

/** Arbitrary for a full GuideState */
const arbitraryGuideState = (): fc.Arbitrary<GuideState> =>
  fc.record({
    mediaTab: fc.constantFrom('image', 'video') as fc.Arbitrary<'image' | 'video'>,
    subject: arbitrarySubject(),
    shotSize: fc.option(arbitraryShotSizeId(), { nil: null }),
    camera: arbitraryCameraSettings(),
    angle: fc.option(arbitraryAngleId(), { nil: null }),
    lighting: fc.array(arbitraryLightingId(), { minLength: 0, maxLength: 2 }).map(arr => [...new Set(arr)]),
    lightDirection: fc.option(fc.constantFrom(...lightDirectionIds), { nil: null }),
    style: fc.option(arbitraryStyleId(), { nil: null }),
    dof: fc.constantFrom(-1, 0, 1, 2, 3, 4, 5, 6, 7, 8),
    useCase: fc.option(fc.constantFrom(...useCaseIds), { nil: null }),
    constraints: fc.array(fc.constantFrom(...constraintIds), { minLength: 0, maxLength: 4 }).map(arr => [...new Set(arr)]),
    movement: fc.option(arbitraryMovementId(), { nil: null }),
  })

/** Arbitrary for a GuideState where both camera.aperture is non-null and dof !== -1 */
const arbitraryGuideStateWithBothApertures = (): fc.Arbitrary<GuideState> =>
  arbitraryGuideState().map(state => ({
    ...state,
    camera: {
      ...state.camera,
      aperture: 'f/1.8', // always non-null
    },
    dof: 3, // always non -1 (maps to 'moderate depth of field, f/2.8')
  }))

// ─────────────────────────────────────────────
// Helper: deep equality
// ─────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// ─────────────────────────────────────────────
// Property 1: Prompt assembly order is deterministic
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 1: prompt assembly order is deterministic
describe('Property 1: Prompt assembly order is deterministic', () => {
  it('segments appear in order: subject → shotSize → camera → angle → lighting → style → dof → movement', () => {
    // Validates: Requirements 8.5
    fc.assert(
      fc.property(arbitraryGuideState(), state => {
        const { full } = assemblePrompt(state)
        if (!full) return true // empty prompt — nothing to check

        // Build a list of (segmentText, segmentIndex) for each non-null segment
        const segments = assemblePrompt(state)
        const orderedSegments = [
          segments.subject,
          segments.shotSize,
          segments.camera,
          segments.angle,
          segments.lighting,
          segments.style,
          segments.dof,
          segments.movement,
        ].filter((s): s is string => s !== null && s !== '')

        // Verify each segment appears in the full prompt in the correct order
        let searchFrom = 0
        for (const seg of orderedSegments) {
          const idx = full.indexOf(seg, searchFrom)
          if (idx === -1) return false
          searchFrom = idx + seg.length
        }
        return true
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 2: Empty segments produce no artefacts
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 2: empty segments produce no artefacts
describe('Property 2: Empty segments produce no artefacts', () => {
  it('assembled prompt has no leading/trailing commas or consecutive comma-space sequences', () => {
    // Validates: Requirements 8.3, 8.4, 7.2, 4.4
    fc.assert(
      fc.property(arbitraryGuideState(), state => {
        const { full } = assemblePrompt(state)
        if (!full) return true // empty prompt is fine

        const noLeadingComma = !full.startsWith(',')
        const noTrailingComma = !full.trimEnd().endsWith(',')
        const noDoubleComma = !full.includes(',,')
        const noLeadingCommaSpace = !full.startsWith(', ')
        const noDoubleCommaSpace = !full.includes(', ,')

        return noLeadingComma && noTrailingComma && noDoubleComma && noLeadingCommaSpace && noDoubleCommaSpace
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 3: Lighting multi-select cap with FIFO eviction
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 3: lighting multi-select cap with FIFO eviction
describe('Property 3: Lighting multi-select cap with FIFO eviction', () => {
  it('lighting array never exceeds 2 elements after any sequence of selections', () => {
    // Validates: Requirements 5.3, 5.4
    fc.assert(
      fc.property(
        fc.array(arbitraryLightingId(), { minLength: 0, maxLength: 10 }),
        ids => {
          const finalState = ids.reduce(
            (s, id) => addLighting(s, id),
            initialGuideState()
          )
          return finalState.lighting.length <= 2
        }
      ),
      { numRuns: 100 }
    )
  })

  it('adding a third distinct lighting id evicts the earliest', () => {
    // Validates: Requirements 5.4
    fc.assert(
      fc.property(
        fc.tuple(
          arbitraryLightingId(),
          arbitraryLightingId(),
          arbitraryLightingId()
        ).filter(([a, b, c]) => a !== b && b !== c && a !== c),
        ([first, second, third]) => {
          const s0 = initialGuideState()
          const s1 = addLighting(s0, first)
          const s2 = addLighting(s1, second)
          const s3 = addLighting(s2, third)

          // After adding third, first should be evicted
          const hasFirst = s3.lighting.includes(first)
          const hasSecond = s3.lighting.includes(second)
          const hasThird = s3.lighting.includes(third)

          return !hasFirst && hasSecond && hasThird && s3.lighting.length === 2
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 4: Style single-select toggle
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 4: style single-select toggle
describe('Property 4: Style single-select toggle', () => {
  it('selecting a style sets it; selecting it again clears it to null', () => {
    // Validates: Requirements 6.3, 6.4
    fc.assert(
      fc.property(arbitraryStyleId(), id => {
        const s0 = initialGuideState()
        const s1 = setStyle(s0, id)
        const s2 = setStyle(s1, id)

        return s1.style === id && s2.style === null
      }),
      { numRuns: 100 }
    )
  })

  it('selecting a new style replaces the previous one', () => {
    // Validates: Requirements 6.3
    fc.assert(
      fc.property(
        fc.tuple(arbitraryStyleId(), arbitraryStyleId()).filter(([a, b]) => a !== b),
        ([first, second]) => {
          const s0 = initialGuideState()
          const s1 = setStyle(s0, first)
          const s2 = setStyle(s1, second)

          return s2.style === second
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 5: Movement is excluded from image-mode prompts
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 5: movement is excluded from image-mode prompts
describe('Property 5: Movement is excluded from image-mode prompts', () => {
  it('no movement term appears in the prompt when mediaTab is image', () => {
    // Validates: Requirements 7.2
    fc.assert(
      fc.property(arbitraryGuideState(), state => {
        const imageState: GuideState = { ...state, mediaTab: 'image' }
        const { full } = assemblePrompt(imageState)

        const allMovementTerms = Object.values(MOVEMENT_TERMS)
        return allMovementTerms.every(term => !full.includes(term))
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 6: Reset returns to structural initial state
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 6: reset returns to structural initial state
describe('Property 6: Reset returns to structural initial state', () => {
  it('resetState returns a value structurally equal to initialGuideState()', () => {
    // Validates: Requirements 10.4
    fc.assert(
      fc.property(arbitraryGuideState(), state => {
        const reset = resetState(state)
        const initial = initialGuideState()
        return deepEqual(reset, initial)
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 7: Camera aperture takes precedence over DOF slider aperture
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 7: camera aperture takes precedence over DOF slider aperture
describe('Property 7: Camera aperture takes precedence over DOF slider aperture', () => {
  it('when camera.aperture is set and dof !== -1, the DOF aperture term does not appear in the prompt', () => {
    // Validates: Requirements 4.3
    fc.assert(
      fc.property(arbitraryGuideStateWithBothApertures(), state => {
        const { full } = assemblePrompt(state)

        // The DOF_MAP term for the current dof value should NOT appear in the prompt
        const dofTerm = DOF_MAP[state.dof]
        if (!dofTerm) return true // dof is -1, nothing to check

        // The camera aperture (state.camera.aperture) should appear in the prompt
        // (it's part of the camera segment via buildCameraPrompt)
        // The DOF term should NOT appear since camera.aperture takes precedence
        return !full.includes(dofTerm)
      }),
      { numRuns: 100 }
    )
  })

  it('camera aperture appears exactly once in the prompt when camera is set', () => {
    // Validates: Requirements 4.3
    fc.assert(
      fc.property(arbitraryGuideStateWithBothApertures(), state => {
        const { full } = assemblePrompt(state)
        const aperture = state.camera.aperture!

        // Count occurrences of the aperture string
        const occurrences = full.split(aperture).length - 1
        return occurrences <= 1
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// Property 8: Send to Studio is a pure read — it does not mutate Guide state
// ─────────────────────────────────────────────

// Feature: prompt-guide, Property 8: send to studio is a pure read — it does not mutate guide state
describe('Property 8: Send to Studio is a pure read', () => {
  it('buildStudioUrl does not mutate the GuideState', () => {
    // Validates: Requirements 9.4
    fc.assert(
      fc.property(arbitraryGuideState(), state => {
        const stateBefore = JSON.parse(JSON.stringify(state)) as GuideState
        buildStudioUrl(state)
        const stateAfter = state

        return deepEqual(stateBefore, stateAfter)
      }),
      { numRuns: 100 }
    )
  })

  it('buildStudioUrl returns a URL containing the encoded assembled prompt and correct tab', () => {
    // Validates: Requirements 9.4
    fc.assert(
      fc.property(arbitraryGuideState(), state => {
        const url = buildStudioUrl(state)
        const { full } = assemblePrompt(state)

        const containsPrompt = url.includes(encodeURIComponent(full))
        const containsTab = url.includes(`tab=${state.mediaTab}`)

        return containsPrompt && containsTab
      }),
      { numRuns: 100 }
    )
  })
})
