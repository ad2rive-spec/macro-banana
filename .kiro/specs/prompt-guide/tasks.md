# Implementation Plan: Visual Prompt Guide

## Overview

Build the `/guide` route as a standalone Next.js page with a sticky sidebar, seven interactive sections, a live prompt preview bar, and a "Send to Studio" integration. The implementation proceeds in layers: shared data extraction first, then the route scaffold, then each interactive section component, then the prompt assembly logic and property tests, and finally the Studio integration.

## Tasks

- [x] 1. Extract shared camera presets to a shared module
  - Create `src/lib/cameraPresets.ts` and move `CAMERA_PRESETS`, `LENS_PRESETS`, `FOCAL_LENGTHS`, `APERTURES`, `CameraPreset`, `LensPreset`, `CameraSettings`, `DEFAULT_CAMERA`, `buildCameraPrompt`, and `hasCameraSettings` out of `src/app/studio/page.tsx`
  - Update `src/app/studio/page.tsx` to import these from `src/lib/cameraPresets.ts` so Studio behaviour is unchanged
  - _Requirements: 2.2 (camera settings reuse in Framing section)_

- [x] 2. Define Guide types, state model, and pure logic helpers
  - Create `src/app/guide/types.ts` with `GuideState`, `ShotSizeId`, `AngleId`, `LightingId`, `StyleId`, `MovementId`, `PromptSegments`, `SectionMeta` interfaces and type aliases (as specified in the design Data Models section)
  - Create `src/app/guide/logic.ts` with pure functions: `initialGuideState()`, `addLighting(state, id)`, `setStyle(state, id)`, `resetState(state)`, `assemblePrompt(state): PromptSegments`, `buildStudioUrl(state): string`
  - `assemblePrompt` must produce segments in the order: subject → shot size → camera → angle → lighting → style → DOF → movement; movement is omitted when `mediaTab === 'image'`
  - `buildStudioUrl` must be a pure function that does not mutate state
  - _Requirements: 8.5, 9.4, 10.4_

  - [x] 2.1 Write property test for prompt assembly order (Property 1)
    - **Property 1: Prompt assembly order is deterministic**
    - For any `GuideState` with multiple segments set, the assembled prompt SHALL always place segments in the order: subject → shot size → camera → angle → lighting → style → DOF → movement
    - **Validates: Requirements 8.5**

  - [x] 2.2 Write property test for empty segment omission (Property 2)
    - **Property 2: Empty segments produce no artefacts**
    - For any `GuideState` where one or more segments are unset, the assembled prompt SHALL NOT contain leading commas, trailing commas, or consecutive comma-space sequences
    - **Validates: Requirements 8.3, 8.4, 7.2, 4.4**

  - [x] 2.3 Write property test for lighting FIFO cap (Property 3)
    - **Property 3: Lighting multi-select cap with FIFO eviction**
    - For any sequence of lighting card selections, `lighting` array SHALL never exceed 2 elements; adding a third SHALL evict the earliest
    - **Validates: Requirements 5.3, 5.4**

  - [x] 2.4 Write property test for style toggle (Property 4)
    - **Property 4: Style single-select toggle**
    - Selecting a `StyleId` when inactive sets `style` to that id; selecting it again sets `style` to null
    - **Validates: Requirements 6.3, 6.4**

  - [x] 2.5 Write property test for movement exclusion in image mode (Property 5)
    - **Property 5: Movement is excluded from image-mode prompts**
    - For any `GuideState` where `mediaTab === 'image'`, the assembled prompt SHALL not contain any movement term
    - **Validates: Requirements 7.2**

  - [x] 2.6 Write property test for reset (Property 6)
    - **Property 6: Reset returns to structural initial state**
    - `resetState()` applied to any `GuideState` SHALL return a value structurally equal to `initialGuideState()`
    - **Validates: Requirements 10.4**

  - [x] 2.7 Write property test for aperture precedence (Property 7)
    - **Property 7: Camera aperture takes precedence over DOF slider aperture**
    - When both `camera.aperture` is non-null and `dof` is not -1, the assembled prompt SHALL contain the camera aperture exactly once and SHALL NOT contain the DOF slider's aperture term as a separate token
    - **Validates: Requirements 4.3**

  - [x] 2.8 Write property test for Send to Studio purity (Property 8)
    - **Property 8: Send to Studio is a pure read — it does not mutate Guide state**
    - `buildStudioUrl(state)` SHALL return a URL containing the full assembled prompt and correct tab value while leaving `GuideState` unchanged
    - **Validates: Requirements 9.4**

- [x] 3. Checkpoint — Ensure all logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create the Guide route scaffold and sidebar
  - Create `src/app/guide/page.tsx` as a `'use client'` page that holds `GuideState` in `useState`, loads/saves to `localStorage` via `saveGuideState`/`loadGuideState` (with try/catch), and renders the two-column layout: `GuideSidebar` on the left + scrollable main content on the right
  - Create `src/app/guide/components/GuideSidebar.tsx` — sticky `<nav>` (width `w-52`) listing the seven sections with filled dot (●) / empty ring (○) progress indicators; clicking a section calls `element.scrollIntoView({ behavior: 'smooth' })`; the Movement item is dimmed and non-scrollable when `mediaTab === 'image'`
  - Add the Guide entry to the `NAV` array in `src/components/Navbar.tsx`: `{ href: '/guide', label: 'Guide', icon: 'lucide:compass' }`
  - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3_

- [x] 5. Implement ShotSizeSelector
  - Create `src/app/guide/components/ShotSizeSelector.tsx` as an inline SVG (≈200 × 480 px) of a stylised human silhouette with 8 horizontal crop lines at the y-positions defined in the design (ECU 12% through ELS 100%)
  - Each crop line has a left-side abbreviation label and a right-side full-name label; clicking a line or label selects that shot size
  - Active selection: crop line turns `var(--color-purple)`, zone above is tinted `var(--color-purple-subtle)`
  - Keyboard: `ArrowUp` / `ArrowDown` cycles through sizes; `Escape` deselects
  - Display the one-sentence description below the SVG in a `<p>` tag when a size is selected
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Implement AngleSelector
  - Create `src/app/guide/components/AngleSelector.tsx` as a responsive grid of 7 cards (2–3 columns)
  - Each card contains a CSS/SVG icon illustrating the angle, the angle name, and a tooltip description shown on hover/focus
  - Active card style: `bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)]`
  - Click to select; click active card again to deselect (toggle)
  - Implement all 7 angles: Eye Level, Low Angle, High Angle, Bird's Eye View, Worm's Eye View, Dutch Tilt, Over-the-Shoulder
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Implement DOFSlider
  - Create `src/app/guide/components/DOFSlider.tsx` with a horizontal `<input type="range">` (values -1 to 8) and a CSS blur preview panel (160 × 100 px)
  - The preview panel has a foreground subject layer (always sharp) and a background layer with `filter: blur(Npx)` computed as `Math.max(0, (8 - sliderValue) * 2)px`
  - Map slider positions to aperture stops and prompt terms per the design table (f/1.2 → `shallow depth of field, f/1.2 bokeh` … f/16 → `deep focus, f/16, everything sharp`); value -1 = unset (no DOF term added)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Implement LightingPicker
  - Create `src/app/guide/components/LightingPicker.tsx` as a responsive card grid (3–4 columns)
  - Each card: 80 × 80 px `<img>` loading from `/guide/{filename}` with `onError` fallback that hides the `<img>` and reveals an underlying CSS gradient `<div>`; label below the image
  - Multi-select up to 2; adding a third deselects the earliest (FIFO) — delegate to `addLighting` from `logic.ts`
  - Implement all 10 lighting styles with filenames as listed in the design
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Implement StylePicker
  - Create `src/app/guide/components/StylePicker.tsx` with the same card layout as LightingPicker
  - Single-select; clicking the active card deselects it — delegate to `setStyle` from `logic.ts`
  - Same `onError` image fallback pattern as LightingPicker
  - Implement all 9 visual styles with filenames as listed in the design
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Implement MovementPicker
  - Create `src/app/guide/components/MovementPicker.tsx` as a card grid (3–4 columns) using Iconify lucide icons (no images)
  - Single-select; shown only when `mediaTab === 'video'` (parent passes this prop)
  - Implement all 12 movements with their lucide icons and prompt terms as listed in the design
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 11. Implement CameraSettingsPanel
  - Create `src/app/guide/components/CameraSettingsPanel.tsx` that imports `CAMERA_PRESETS`, `LENS_PRESETS`, `FOCAL_LENGTHS`, `APERTURES` from `src/lib/cameraPresets.ts`
  - Render camera body selector, lens selector, focal length chips, and aperture chips — reuse the same chip/wheel UI pattern from Studio
  - Place this panel inside the Framing section of the Guide page, below `ShotSizeSelector`
  - _Requirements: 2.2 (Framing section)_

- [x] 12. Implement PromptPreview bar
  - Create `src/app/guide/components/PromptPreview.tsx` as a sticky bar at the bottom of the main content area
  - Contains: (1) auto-growing `<textarea>` for subject input with placeholder "Describe your subject — e.g. a woman in a red dress"; (2) a horizontal flex row of colour-coded `<span>` chips per active segment using the colours defined in the design; (3) an action row with "Reset All" (ghost, left) and "Send to Studio" (filled purple, right)
  - "Send to Studio" is disabled when `assemblePrompt(state).full` is empty; calls `router.push(buildStudioUrl(state))`
  - "Reset All" triggers `window.confirm()` before calling `resetState`
  - Token colours: subject `#f0f0f5`, shot size `#a78bfa`, camera `#818cf8`, angle `#38bdf8`, lighting `#fb923c`, style `#34d399`, DOF `#f472b6`, movement `#facc15`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.4, 10.5_

- [x] 13. Wire all sections into the Guide page
  - In `src/app/guide/page.tsx`, render all section components in order: Subject (textarea), Framing (ShotSizeSelector + CameraSettingsPanel), Angle (AngleSelector), Light (LightingPicker), Style (StylePicker), Depth of Field (DOFSlider), Movement (MovementPicker, video only)
  - Each section has an `id` attribute matching the sidebar scroll targets and a section heading with the progress dot indicator
  - Pass `GuideState` slices and updater callbacks down to each component; persist state to `localStorage` on every change
  - Add `mediaTab` toggle (image / video) at the top of the page so users can switch modes
  - _Requirements: 1.4, 10.1, 10.2, 10.3_

- [x] 14. Checkpoint — Ensure all tests pass and Guide page renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Extend Studio page to read incoming prompt and tab from URL params
  - In `src/app/studio/page.tsx`, extend the existing `useSearchParams` usage to read `?prompt` and `?tab` on mount
  - If `incomingPrompt` is present, pre-fill the prompt textarea; if `incomingTab` is `'image'` or `'video'`, switch to that tab
  - Apply these values only once on mount (use a `useEffect` with an empty dependency array or a `hasApplied` ref) so they don't override user edits on subsequent renders
  - _Requirements: 9.2_

- [x] 16. Create placeholder images in public/guide/
  - Create the `public/guide/` directory and add 19 placeholder image files (1 × 1 px or minimal valid JPEG/PNG) so the `<img>` tags resolve without 404 errors during development; the user will replace these with real examples later
  - Lighting files (10): `guide-light-golden-hour.jpg`, `guide-light-blue-hour.jpg`, `guide-light-overcast.jpg`, `guide-light-hard-studio.jpg`, `guide-light-soft-studio.jpg`, `guide-light-neon.jpg`, `guide-light-candlelight.jpg`, `guide-light-rembrandt.jpg`, `guide-light-high-key.jpg`, `guide-light-low-key.jpg`
  - Style files (9): `guide-style-cinematic.jpg`, `guide-style-editorial.jpg`, `guide-style-documentary.jpg`, `guide-style-fine-art.jpg`, `guide-style-commercial.jpg`, `guide-style-street.jpg`, `guide-style-architectural.jpg`, `guide-style-macro.jpg`, `guide-style-vintage.jpg`
  - _Requirements: 5.1, 6.1_

- [x] 17. Final checkpoint — Ensure all tests pass and end-to-end flow works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests (tasks 2.1–2.8) require `fast-check` as a dev dependency — install it before running those tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The `assemblePrompt` and state-mutation helpers in `logic.ts` are pure functions — they are the primary targets for property-based testing
- Camera aperture (from CameraSettingsPanel) takes precedence over DOF slider aperture in the assembled prompt to avoid duplication (Property 7)
- The `public/guide/` placeholder images use the `onError` fallback pattern — broken images degrade gracefully to CSS gradients
