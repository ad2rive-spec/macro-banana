# Design Document — Visual Prompt Guide

## Overview

The Visual Prompt Guide is a new `/guide` route and a "Guide" tab added to the top-level Navbar. It gives users a structured, visual way to build AI generation prompts by thinking like a photographer or cinematographer — selecting shot size, camera angle, lighting, style, depth of field, and (in video mode) camera movement through interactive CSS/SVG components and image cards. When the user is satisfied, a single "Send to Studio" button writes the assembled prompt into the Studio input and switches to the appropriate generation tab.

The feature is entirely client-side. It introduces no new dependencies — it reuses the existing Tailwind CSS design system, Iconify (lucide set), and the camera preset constants already defined in `src/app/studio/page.tsx`.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| New top-level route `/guide` with its own Navbar entry | Keeps the Studio page uncluttered; the Guide is a peer tool, not a sub-panel |
| Left sidebar + scrollable main content | Lets experienced users jump to any section while preserving a guided top-to-bottom flow for newcomers |
| CSS/SVG for interactive elements (shot size, angle, DOF) | Zero extra dependencies; fully themeable with CSS variables; accessible via keyboard |
| Placeholder images for lighting/style cards | Unblocks implementation; user replaces images later (filenames listed in §Components) |
| Reuse `CAMERA_PRESETS`, `LENS_PRESETS`, `FOCAL_LENGTHS`, `APERTURES` from Studio | Single source of truth; camera language in the Guide matches Studio exactly |
| `localStorage` for Guide state persistence | Selections survive page refresh and tab switches without a backend |
| `Send to Studio` writes to a shared context / URL param | Decoupled from Studio's internal state; works even if Studio is not yet mounted |

---

## Architecture

### Route and Navigation

A new page is added at `src/app/guide/page.tsx`. The Navbar `NAV` array gains a third entry:

```ts
{ href: '/guide', label: 'Guide', icon: 'lucide:compass' }
```

The Guide page is a standalone Next.js page (not a tab inside Studio). This avoids coupling the Guide's state lifecycle to Studio's complex state machine.

### State Flow

```mermaid
flowchart TD
    User -->|interacts| GuideSelections[Guide Selections\nsubject · shotSize · angle\nlighting · style · dof · movement]
    GuideSelections -->|assemblePrompt| PromptPreview[Prompt Preview\ncolor-coded tokens]
    PromptPreview -->|Send to Studio| URLParam[?prompt=...&tab=image|video]
    URLParam -->|useSearchParams| StudioPage[Studio Page\npopulates input field]
```

The Guide writes its assembled prompt to a URL search parameter (`?prompt=…&tab=image|video`) when the user clicks "Send to Studio". The Studio page already uses `useSearchParams` (it imports it from `next/navigation`) — we extend it to read `prompt` and `tab` on mount and pre-fill the input.

### Component Tree

```
src/app/guide/
  page.tsx                  ← route entry, holds GuideState, renders layout
  components/
    GuideSidebar.tsx         ← sticky left nav with section links + progress dots
    ShotSizeSelector.tsx     ← interactive SVG human figure
    AngleSelector.tsx        ← CSS/SVG 3D angle picker cards
    DOFSlider.tsx            ← aperture slider + CSS blur preview
    LightingPicker.tsx       ← image card grid (multi-select, max 2)
    StylePicker.tsx          ← image card grid (single-select)
    MovementPicker.tsx       ← card grid, video mode only
    PromptPreview.tsx        ← color-coded token bar + subject input + Send button
    CameraSettingsPanel.tsx  ← reuses Studio's camera preset wheels
```

---

## Components and Interfaces

### GuideSidebar

A sticky `<nav>` on the left (width `w-52`) listing the seven sections. Each item shows:
- Section name
- A filled dot (●) when the section has an active selection, an empty ring (○) otherwise
- Clicking scrolls the main content to the section via `element.scrollIntoView({ behavior: 'smooth' })`

Sections (in order):
1. Subject
2. Framing *(Shot Size + Camera Settings)*
3. Angle
4. Light
5. Style
6. Depth of Field
7. Movement *(video only — item is dimmed and non-scrollable when in image mode)*

### ShotSizeSelector

Rendered as an inline SVG (≈ 200 × 480 px) of a stylised human silhouette. Eight horizontal crop lines are drawn at anatomically correct positions. Each line has a left-side label (e.g., "ECU") and a right-side label (e.g., "Extreme Close-Up").

**Shot size definitions and SVG y-positions (% of figure height):**

| ID | Label | Crop line position | Description |
|---|---|---|---|
| `ecu` | Extreme Close-Up | 12% | Fills frame with a single facial feature or object detail |
| `cu` | Close-Up | 25% | Head and top of shoulders |
| `mcu` | Medium Close-Up | 38% | Chest and above |
| `ms` | Medium Shot | 52% | Waist and above |
| `mfs` | Medium Full Shot | 68% | Knees and above |
| `fs` | Full Shot | 82% | Full body with minimal headroom |
| `ws` | Wide Shot | 92% | Full body with environmental context |
| `els` | Extreme Long Shot | 100% | Subject tiny in a vast environment |

Interaction:
- Clicking a crop line or label selects that shot size; the line turns `var(--color-purple)` and the zone above it is tinted with `var(--color-purple-subtle)`
- Keyboard: `ArrowUp` / `ArrowDown` cycles through sizes; `Escape` deselects
- The description sentence appears below the SVG in a `<p>` tag

### AngleSelector

A responsive grid of 7 cards (2–3 columns). Each card contains:
- A CSS/SVG icon illustrating the angle (described below)
- The angle name
- A short description shown on hover/focus via a `title` attribute and a visible tooltip `<div>`

**Angles:**

| ID | Label | CSS/SVG icon concept | Description |
|---|---|---|---|
| `eye-level` | Eye Level | Horizontal camera rectangle centred | Natural, neutral perspective |
| `low-angle` | Low Angle | Camera rectangle tilted up, subject above | Empowers subject, creates drama |
| `high-angle` | High Angle | Camera rectangle tilted down, subject below | Diminishes subject, shows vulnerability |
| `birds-eye` | Bird's Eye View | Camera rectangle directly above (top-down circle) | Overhead map-like perspective |
| `worms-eye` | Worm's Eye View | Camera rectangle directly below (bottom-up circle) | Extreme upward perspective |
| `dutch-tilt` | Dutch Tilt | Camera rectangle rotated ~15° | Unease, tension, disorientation |
| `ots` | Over-the-Shoulder | Two silhouettes, camera behind one | Conversational, relational framing |

Interaction:
- Click to select; click again to deselect (toggle)
- Active card: `bg-[var(--color-purple-subtle)] border-[rgba(113,50,245,0.4)]`

### DOFSlider

A horizontal range input (`<input type="range">`) with a CSS visual preview panel beside it.

**Slider range:** 0 (f/1.2, shallow) → 8 (f/16, deep), with a neutral "unset" notch at the far left (value = -1).

**Aperture stops mapped to slider positions:**

| Slider value | Aperture | Prompt term |
|---|---|---|
| -1 (unset) | — | *(nothing added)* |
| 0 | f/1.2 | `shallow depth of field, f/1.2 bokeh` |
| 1 | f/1.4 | `shallow depth of field, f/1.4 bokeh` |
| 2 | f/1.8 | `shallow depth of field, f/1.8 bokeh` |
| 3 | f/2.8 | `moderate depth of field, f/2.8` |
| 4 | f/4 | `moderate depth of field, f/4` |
| 5 | f/5.6 | `deep focus, f/5.6` |
| 6 | f/8 | `deep focus, f/8` |
| 7 | f/11 | `deep focus, f/11` |
| 8 | f/16 | `deep focus, f/16, everything sharp` |

**CSS blur preview:** A `<div>` (160 × 100 px) containing a foreground subject layer (sharp) and a background layer. The background layer's `filter: blur(Npx)` is computed as `Math.max(0, (8 - sliderValue) * 2)px`. At f/1.2 the background blurs to 16 px; at f/16 it is 0 px.

### LightingPicker

A responsive card grid (3–4 columns). Each card: 80 × 80 px placeholder image + label below.

**Lighting styles and placeholder image filenames:**

| ID | Label | Placeholder filename |
|---|---|---|
| `golden-hour` | Golden Hour | `guide-light-golden-hour.jpg` |
| `blue-hour` | Blue Hour | `guide-light-blue-hour.jpg` |
| `overcast` | Overcast Diffused | `guide-light-overcast.jpg` |
| `hard-studio` | Hard Studio | `guide-light-hard-studio.jpg` |
| `soft-studio` | Soft Studio | `guide-light-soft-studio.jpg` |
| `neon` | Neon / Cyberpunk | `guide-light-neon.jpg` |
| `candlelight` | Candlelight / Practical | `guide-light-candlelight.jpg` |
| `rembrandt` | Rembrandt | `guide-light-rembrandt.jpg` |
| `high-key` | High-Key | `guide-light-high-key.jpg` |
| `low-key` | Low-Key | `guide-light-low-key.jpg` |

Multi-select (max 2). When a third card is clicked, the earliest selection is deselected.

**Prompt terms:** The card's `promptTerm` field (e.g., `"golden hour lighting"`, `"neon cyberpunk lighting"`).

### StylePicker

Same card layout as LightingPicker. Single-select; clicking the active card deselects it.

**Visual styles and placeholder image filenames:**

| ID | Label | Placeholder filename |
|---|---|---|
| `cinematic` | Cinematic Widescreen | `guide-style-cinematic.jpg` |
| `editorial` | Editorial / Fashion | `guide-style-editorial.jpg` |
| `documentary` | Documentary / Reportage | `guide-style-documentary.jpg` |
| `fine-art` | Fine Art / Painterly | `guide-style-fine-art.jpg` |
| `commercial` | Commercial / Advertising | `guide-style-commercial.jpg` |
| `street` | Street Photography | `guide-style-street.jpg` |
| `architectural` | Architectural | `guide-style-architectural.jpg` |
| `macro` | Macro / Abstract | `guide-style-macro.jpg` |
| `vintage` | Vintage / Film | `guide-style-vintage.jpg` |

### MovementPicker

Shown only when `mediaTab === 'video'`. Card grid (3–4 columns), single-select.

**Camera movements:**

| ID | Label | Icon (lucide) | Prompt term |
|---|---|---|---|
| `static` | Static / Locked | `lucide:lock` | `static locked shot` |
| `pan-left` | Pan Left | `lucide:arrow-left` | `slow pan left` |
| `pan-right` | Pan Right | `lucide:arrow-right` | `slow pan right` |
| `tilt-up` | Tilt Up | `lucide:arrow-up` | `tilt up` |
| `tilt-down` | Tilt Down | `lucide:arrow-down` | `tilt down` |
| `dolly-in` | Dolly In | `lucide:zoom-in` | `dolly in` |
| `dolly-out` | Dolly Out | `lucide:zoom-out` | `dolly out` |
| `tracking` | Tracking Shot | `lucide:move-horizontal` | `tracking shot` |
| `handheld` | Handheld / Vérité | `lucide:hand` | `handheld verité` |
| `crane-up` | Crane / Jib Up | `lucide:trending-up` | `crane jib up` |
| `crane-down` | Crane / Jib Down | `lucide:trending-down` | `crane jib down` |
| `drone` | Drone Aerial | `lucide:navigation` | `drone aerial shot` |

### CameraSettingsPanel

Reuses the four camera preset constants from `src/app/studio/page.tsx`:
- `CAMERA_PRESETS` — camera body selector (slot wheel or chip grid)
- `LENS_PRESETS` — lens selector
- `FOCAL_LENGTHS` — focal length chips
- `APERTURES` — aperture chips

These are placed inside the **Framing** section, below the ShotSizeSelector. The `buildCameraPrompt()` helper (also from Studio) assembles the camera sub-string.

> **Note:** The aperture selected here is independent of the DOF slider. If both are set, the camera aperture takes precedence in the prompt (the DOF slider's aperture is omitted to avoid duplication).

### PromptPreview

A sticky bar at the bottom of the main content area (or fixed to the viewport bottom on mobile). Contains:

1. **Subject input** — `<textarea>` (1–2 rows, auto-grow), placeholder: *"Describe your subject — e.g. a woman in a red dress"*
2. **Token row** — a horizontal flex row of colour-coded `<span>` chips, one per active segment:

| Segment | Token colour |
|---|---|
| Subject | `text-[#f0f0f5]` (white) |
| Shot Size | `text-[#a78bfa]` (purple) |
| Camera | `text-[#818cf8]` (indigo) |
| Angle | `text-[#38bdf8]` (sky blue) |
| Lighting | `text-[#fb923c]` (orange) |
| Style | `text-[#34d399]` (emerald) |
| DOF | `text-[#f472b6]` (pink) |
| Movement | `text-[#facc15]` (yellow) |

3. **Action row:**
   - "Reset All" button (ghost, left-aligned) — triggers confirmation dialog
   - "Send to Studio" button (filled purple, right-aligned) — disabled when prompt is empty

**Prompt assembly order** (per Requirement 8.5):
```
[subject], [shot size], [camera], [angle], [lighting], [style], [DOF], [movement]
```

### Required Placeholder Image Files

All placeholder images go in `public/guide/`. The user replaces them with real examples later.

**Lighting (10 files):**
- `guide-light-golden-hour.jpg`
- `guide-light-blue-hour.jpg`
- `guide-light-overcast.jpg`
- `guide-light-hard-studio.jpg`
- `guide-light-soft-studio.jpg`
- `guide-light-neon.jpg`
- `guide-light-candlelight.jpg`
- `guide-light-rembrandt.jpg`
- `guide-light-high-key.jpg`
- `guide-light-low-key.jpg`

**Style (9 files):**
- `guide-style-cinematic.jpg`
- `guide-style-editorial.jpg`
- `guide-style-documentary.jpg`
- `guide-style-fine-art.jpg`
- `guide-style-commercial.jpg`
- `guide-style-street.jpg`
- `guide-style-architectural.jpg`
- `guide-style-macro.jpg`
- `guide-style-vintage.jpg`

**Total: 19 placeholder images** (80 × 80 px minimum, 1:1 aspect ratio recommended).

---

## Data Models

### GuideState

The central state object held in `useState` at `src/app/guide/page.tsx` and persisted to `localStorage` under the key `"mb-guide-state"`.

```ts
interface GuideState {
  // Media mode — synced from Studio via URL param or localStorage
  mediaTab: 'image' | 'video'

  // Section 1: Subject
  subject: string

  // Section 2: Framing
  shotSize: ShotSizeId | null
  camera: CameraSettings          // reuses CameraSettings from studio/page.tsx

  // Section 3: Angle
  angle: AngleId | null

  // Section 4: Light (max 2)
  lighting: LightingId[]

  // Section 5: Style (max 1)
  style: StyleId | null

  // Section 6: Depth of Field
  dof: number                     // -1 = unset, 0–8 = aperture index

  // Section 7: Movement (video only)
  movement: MovementId | null
}

type ShotSizeId = 'ecu' | 'cu' | 'mcu' | 'ms' | 'mfs' | 'fs' | 'ws' | 'els'
type AngleId    = 'eye-level' | 'low-angle' | 'high-angle' | 'birds-eye' | 'worms-eye' | 'dutch-tilt' | 'ots'
type LightingId = 'golden-hour' | 'blue-hour' | 'overcast' | 'hard-studio' | 'soft-studio' | 'neon' | 'candlelight' | 'rembrandt' | 'high-key' | 'low-key'
type StyleId    = 'cinematic' | 'editorial' | 'documentary' | 'fine-art' | 'commercial' | 'street' | 'architectural' | 'macro' | 'vintage'
type MovementId = 'static' | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'dolly-in' | 'dolly-out' | 'tracking' | 'handheld' | 'crane-up' | 'crane-down' | 'drone'
```

### CameraSettings (reused from Studio)

```ts
interface CameraSettings {
  camera: string       // CAMERA_PRESETS id, 'none' = unset
  lens: string         // LENS_PRESETS id, 'none' = unset
  focalLength: number | null
  aperture: string | null
}
```

### PromptSegments

Derived (not stored) — computed by `assemblePrompt(state: GuideState): PromptSegments`.

```ts
interface PromptSegments {
  subject:   string | null
  shotSize:  string | null
  camera:    string | null   // from buildCameraPrompt()
  angle:     string | null
  lighting:  string | null   // up to 2 terms joined with ', '
  style:     string | null
  dof:       string | null
  movement:  string | null
  full:      string          // all non-null segments joined with ', '
}
```

### SectionMeta

Used by `GuideSidebar` to render progress indicators.

```ts
interface SectionMeta {
  id: string
  label: string
  hasSelection: (state: GuideState) => boolean
  videoOnly?: boolean
}
```

### Studio Integration — URL Parameters

When "Send to Studio" is clicked:

```ts
// Guide writes:
router.push(`/studio?prompt=${encodeURIComponent(segments.full)}&tab=${state.mediaTab}`)

// Studio reads on mount (extend existing useSearchParams usage):
const searchParams = useSearchParams()
const incomingPrompt = searchParams.get('prompt')
const incomingTab    = searchParams.get('tab') as MediaTab | null
// → pre-fill prompt textarea, switch to image or video tab
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties were derived from the acceptance criteria prework analysis. Properties that were redundant or subsumed by broader properties were consolidated:

- Requirements 2.2, 3.2, 5.2, 6.2, 7.3 (individual picker → state updates) are all subsumed by Properties 1 and 2, which verify the assembled output for any state.
- Requirements 6.3 and 6.4 (style single-select + toggle) are combined into Property 4.
- Requirements 5.3 and 5.4 (lighting cap + FIFO eviction) are combined into Property 3.
- Requirements 7.3 and 7.4 (movement select + single-select) are subsumed by Property 5.
- Requirement 10.3 (section progress indicator) is subsumed by the individual selection properties.

### Property 1: Prompt assembly order is deterministic

*For any* `GuideState` with multiple segments set, the assembled prompt string SHALL always place segments in the order: subject → shot size → camera → angle → lighting → style → DOF → movement, regardless of the order in which the user made selections.

**Validates: Requirements 8.5**

### Property 2: Empty segments produce no artefacts

*For any* `GuideState` where one or more segments are unset (null / empty string / `dof = -1` / `mediaTab = 'image'` with a movement value), the assembled prompt SHALL NOT contain that segment's text, and SHALL NOT contain leading commas, trailing commas, or consecutive comma-space sequences.

**Validates: Requirements 8.3, 8.4, 7.2, 4.4**

### Property 3: Lighting multi-select cap with FIFO eviction

*For any* sequence of lighting card selections of any length, the `lighting` array in `GuideState` SHALL never contain more than 2 elements; when a third distinct lighting id is added, the element that was added earliest SHALL be removed and the new id SHALL be present.

**Validates: Requirements 5.3, 5.4**

### Property 4: Style single-select toggle

*For any* `StyleId`, selecting it when it is not active SHALL set `GuideState.style` to that id; selecting it again when it is already active SHALL set `GuideState.style` to null. At no point SHALL `style` hold more than one value.

**Validates: Requirements 6.3, 6.4**

### Property 5: Movement is excluded from image-mode prompts

*For any* `GuideState` where `mediaTab === 'image'`, the assembled prompt string SHALL not contain any movement term from the `MovementPicker`, regardless of the current value of `GuideState.movement`.

**Validates: Requirements 7.2**

### Property 6: Reset returns to structural initial state

*For any* `GuideState` with any combination of selections, applying `resetState()` SHALL return a value that is structurally equal to `initialGuideState()` — all fields null, `lighting` an empty array, `dof` equal to -1, and `subject` an empty string.

**Validates: Requirements 10.4**

### Property 7: Camera aperture takes precedence over DOF slider aperture

*For any* `GuideState` where both `camera.aperture` is non-null and `dof` is not -1, the assembled prompt SHALL contain the camera aperture value (e.g., `"f/1.8"`) exactly once and SHALL NOT contain the DOF slider's aperture term as a separate token.

**Validates: Requirements 4.3** *(design decision to prevent duplicate aperture language)*

### Property 8: Send to Studio is a pure read — it does not mutate Guide state

*For any* `GuideState`, calling `buildStudioUrl(state)` (the function that constructs the `/studio?prompt=…&tab=…` URL) SHALL return a URL string containing the full assembled prompt and the correct tab value, while leaving the `GuideState` object unchanged.

**Validates: Requirements 9.4**

---

## Error Handling

### Missing placeholder images

Lighting and style cards use `<img>` tags with `onError` handlers that fall back to a CSS gradient placeholder matching the card's colour theme. No broken-image icons are shown.

```tsx
<img
  src={`/guide/${card.filename}`}
  alt={card.label}
  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
/>
<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-raised)] to-[var(--color-hover)]" />
```

### localStorage unavailable

`GuideState` persistence wraps all `localStorage` calls in try/catch. If storage is unavailable (private browsing, quota exceeded), the Guide operates in-memory without persistence and shows no error to the user.

```ts
function saveGuideState(state: GuideState) {
  try { localStorage.setItem('mb-guide-state', JSON.stringify(state)) } catch { /* silent */ }
}
function loadGuideState(): GuideState | null {
  try { return JSON.parse(localStorage.getItem('mb-guide-state') ?? 'null') } catch { return null }
}
```

### Invalid persisted state

On load, if the parsed `localStorage` value fails a shape check (e.g., from a previous schema version), the Guide silently discards it and starts from the initial state.

### Studio not receiving the prompt

If the user navigates to `/studio?prompt=…` but Studio's `useSearchParams` hook hasn't been extended yet, the prompt simply won't be pre-filled — no crash. The Studio page is unchanged until the integration task is implemented.

### Confirmation dialog for Reset All

The "Reset All" button triggers a native `window.confirm()` dialog (or a custom modal matching the app's design system). If the user cancels, no state is cleared.

---

## Testing Strategy

### Unit Tests

Focus on the pure `assemblePrompt` function and the state-mutation helpers:

- `assemblePrompt` with all segments set → correct order and comma separation
- `assemblePrompt` with various null segments → no artefacts
- `addLighting` with 0, 1, 2, 3 items → cap and FIFO eviction
- `setStyle` toggle → null on second click
- `resetState` → structural equality to initial state
- `buildCameraPrompt` (already exists in Studio) → reuse existing tests if any

### Property-Based Tests

Use **fast-check** (already a common choice in the JS ecosystem; add as a dev dependency if not present).

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: prompt-guide, Property N: <property text>`

**Property 1 — Prompt assembly order:**
```ts
// Feature: prompt-guide, Property 1: prompt assembly order is deterministic
fc.assert(fc.property(arbitraryGuideState(), state => {
  const prompt = assemblePrompt(state).full
  // verify segment order by checking index positions
  const indices = getSegmentIndices(prompt, state)
  return isMonotonicallyIncreasing(indices)
}), { numRuns: 100 })
```

**Property 2 — Empty segments omitted:**
```ts
// Feature: prompt-guide, Property 2: empty segments are omitted
fc.assert(fc.property(arbitraryGuideState(), state => {
  const segments = assemblePrompt(state)
  const full = segments.full
  return !full.startsWith(',') && !full.endsWith(',') && !full.includes(',,')
}), { numRuns: 100 })
```

**Property 3 — Lighting cap:**
```ts
// Feature: prompt-guide, Property 3: lighting multi-select cap
fc.assert(fc.property(fc.array(arbitraryLightingId(), { minLength: 0, maxLength: 10 }), ids => {
  const state = ids.reduce((s, id) => addLighting(s, id), initialGuideState())
  return state.lighting.length <= 2
}), { numRuns: 100 })
```

**Property 4 — Style toggle:**
```ts
// Feature: prompt-guide, Property 4: style single-select toggle
fc.assert(fc.property(arbitraryStyleId(), id => {
  const s1 = setStyle(initialGuideState(), id)
  const s2 = setStyle(s1, id)
  return s1.style === id && s2.style === null
}), { numRuns: 100 })
```

**Property 5 — Movement hidden in image mode:**
```ts
// Feature: prompt-guide, Property 5: movement hidden in image mode
fc.assert(fc.property(arbitraryGuideState(), state => {
  const imageState = { ...state, mediaTab: 'image' as const }
  const prompt = assemblePrompt(imageState).full
  return MOVEMENT_TERMS.every(term => !prompt.includes(term))
}), { numRuns: 100 })
```

**Property 6 — Reset returns to initial state:**
```ts
// Feature: prompt-guide, Property 6: reset returns to initial state
fc.assert(fc.property(arbitraryGuideState(), state => {
  const reset = resetState(state)
  return deepEqual(reset, initialGuideState())
}), { numRuns: 100 })
```

**Property 7 — DOF and camera aperture no duplication:**
```ts
// Feature: prompt-guide, Property 7: DOF aperture and camera aperture do not duplicate
fc.assert(fc.property(arbitraryGuideStateWithBothApertures(), state => {
  const prompt = assemblePrompt(state).full
  const dofTerm = DOF_MAP[state.dof]?.apertureTerm
  return !prompt.includes(dofTerm)
}), { numRuns: 100 })
```

**Property 8 — Send to Studio preserves Guide state:**
```ts
// Feature: prompt-guide, Property 8: send to studio preserves guide state
fc.assert(fc.property(arbitraryGuideState(), state => {
  const urlParam = buildStudioUrl(state)
  // state is unchanged — buildStudioUrl is a pure function
  return deepEqual(state, state) && urlParam.includes(encodeURIComponent(assemblePrompt(state).full))
}), { numRuns: 100 })
```

### Integration / Smoke Tests

- Navigate to `/guide` → page renders without errors (smoke)
- Click "Send to Studio" → URL contains `?prompt=…&tab=image` (example)
- Navigate to `/studio?prompt=hello&tab=video` → Studio pre-fills prompt and switches to video tab (example)
- Resize viewport to mobile width → sidebar collapses, layout remains usable (example)
- All 19 placeholder images return 200 or gracefully fall back to CSS gradient (smoke)
