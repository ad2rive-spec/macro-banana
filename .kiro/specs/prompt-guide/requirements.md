# Requirements Document

## Introduction

The Visual Prompt Guide is a new tab in the Macro Banana Studio page that teaches users to think like photographers and cinematographers. Rather than typing prompts from scratch, users build a complete, professional-quality prompt by interacting with visual, tactile UI components — a human figure diagram for shot size, a 3D camera angle selector, a depth-of-field slider, style cards with example images, and more. When satisfied, the user sends the assembled prompt to the Studio's generation input with one click. The feature covers both image and video generation, with camera movement controls appearing only in video mode.

---

## Glossary

- **Prompt_Guide**: The Visual Prompt Guide tab component rendered inside the Studio page.
- **Prompt_Builder**: The internal state machine that assembles individual selections into a final prompt string.
- **Shot_Size_Selector**: The interactive human figure diagram used to select shot size (ECU through ELS).
- **Angle_Selector**: The 3D camera angle picker (eye level, low angle, high angle, bird's eye, Dutch tilt, etc.).
- **DOF_Slider**: The depth-of-field / aperture slider that controls bokeh and focus language in the prompt.
- **Lighting_Picker**: The grid of lighting style cards (golden hour, studio, neon, etc.) with visual examples.
- **Style_Picker**: The grid of visual style cards (cinematic, editorial, documentary, etc.) with example images.
- **Movement_Picker**: The camera movement selector shown only in video mode (pan, dolly, handheld, etc.).
- **Prompt_Preview**: The live-updating text area that shows the assembled prompt as the user makes selections.
- **Studio**: The existing `/studio` page and its prompt input field.
- **Media_Tab**: The image/video toggle already present in Studio (`image` | `video`).

---

## Requirements

### Requirement 1: Prompt Guide Tab Integration

**User Story:** As a Studio user, I want a dedicated Prompt Guide tab alongside the existing generation controls, so that I can access the visual prompt builder without leaving the Studio page.

#### Acceptance Criteria

1. THE Studio SHALL render a "Prompt Guide" tab in the existing tab bar alongside the Image and Video tabs.
2. WHEN the user selects the Prompt Guide tab, THE Studio SHALL display the Prompt_Guide component in the main content area.
3. WHILE the Prompt Guide tab is active, THE Studio SHALL preserve all existing generation settings (model, ratio, resolution) so they remain unchanged when the user returns to the generation tab.
4. THE Prompt_Guide SHALL inherit the current Media_Tab context (image or video) from Studio so that video-only controls are shown or hidden appropriately.

---

### Requirement 2: Shot Size Selection via Human Figure Diagram

**User Story:** As a user, I want to select a shot size by interacting with an annotated human figure diagram, so that I can understand framing intuitively rather than memorising abbreviations.

#### Acceptance Criteria

1. THE Shot_Size_Selector SHALL display a stylised human figure with labelled crop lines for each shot size: Extreme Close-Up (ECU), Close-Up (CU), Medium Close-Up (MCU), Medium Shot (MS), Medium Full Shot (MFS), Full Shot (FS), Wide Shot (WS), and Extreme Long Shot (ELS).
2. WHEN the user clicks or taps a crop line or its label, THE Shot_Size_Selector SHALL highlight the selected zone and update the Prompt_Builder with the corresponding shot-size term.
3. WHEN a shot size is selected, THE Shot_Size_Selector SHALL display a one-sentence description of that framing (e.g., "Extreme Close-Up — fills the frame with a single facial feature or object detail").
4. THE Shot_Size_Selector SHALL support keyboard navigation so that users can cycle through shot sizes using arrow keys.

---

### Requirement 3: Camera Angle Selection

**User Story:** As a user, I want to choose a camera angle from a visual 3D-style selector, so that I can set the perspective of my shot without guessing at terminology.

#### Acceptance Criteria

1. THE Angle_Selector SHALL present the following angles as selectable cards with illustrative icons or diagrams: Eye Level, Low Angle, High Angle, Bird's Eye View, Worm's Eye View, Dutch Tilt, and Over-the-Shoulder.
2. WHEN the user selects an angle card, THE Angle_Selector SHALL visually indicate the active selection and update the Prompt_Builder with the corresponding angle term.
3. WHEN the user hovers over or focuses an angle card, THE Angle_Selector SHALL display a brief description of the visual effect that angle produces.
4. THE Angle_Selector SHALL allow the user to deselect the current angle by clicking the active card again, removing the angle term from the Prompt_Builder.

---

### Requirement 4: Depth of Field and Aperture Control

**User Story:** As a user, I want a visual slider that shows me the relationship between aperture and depth of field, so that I can choose the right focus language for my prompt.

#### Acceptance Criteria

1. THE DOF_Slider SHALL render a continuous slider ranging from shallow depth of field (wide aperture, e.g., f/1.2) to deep depth of field (narrow aperture, e.g., f/16).
2. THE DOF_Slider SHALL display a real-time visual preview alongside the slider that illustrates the bokeh and focus effect at the current position (e.g., a blurred background at f/1.4, a sharp background at f/11).
3. WHEN the user moves the slider, THE DOF_Slider SHALL update the Prompt_Builder with the appropriate aperture and depth-of-field descriptor (e.g., "shallow depth of field, f/1.8 bokeh" or "deep focus, f/11").
4. THE DOF_Slider SHALL include a neutral/unset position that removes depth-of-field language from the Prompt_Builder.

---

### Requirement 5: Lighting Style Selection

**User Story:** As a user, I want to pick a lighting style from visual example cards, so that I can set the mood and atmosphere of my image or video.

#### Acceptance Criteria

1. THE Lighting_Picker SHALL display at minimum the following lighting styles as cards with a representative example image or illustration: Golden Hour, Blue Hour, Overcast Diffused, Hard Studio, Soft Studio, Neon/Cyberpunk, Candlelight/Practical, Rembrandt, High-Key, and Low-Key.
2. WHEN the user selects a lighting card, THE Lighting_Picker SHALL highlight the selection and update the Prompt_Builder with the lighting style term.
3. THE Lighting_Picker SHALL allow multi-select of up to 2 lighting styles simultaneously, combining their terms in the Prompt_Builder.
4. WHEN the user selects a third lighting style while 2 are already selected, THE Lighting_Picker SHALL deselect the earliest selection and select the new one.

---

### Requirement 6: Visual Style Selection

**User Story:** As a user, I want to choose an overall visual style from example image cards, so that I can communicate the aesthetic direction of my generation.

#### Acceptance Criteria

1. THE Style_Picker SHALL display at minimum the following visual styles as cards with a representative example image: Cinematic Widescreen, Editorial/Fashion, Documentary/Reportage, Fine Art/Painterly, Commercial/Advertising, Street Photography, Architectural, Macro/Abstract, and Vintage/Film.
2. WHEN the user selects a style card, THE Style_Picker SHALL highlight the selection and update the Prompt_Builder with the style descriptor.
3. THE Style_Picker SHALL allow exactly one style to be active at a time; selecting a new style replaces the previous selection.
4. THE Style_Picker SHALL allow the user to deselect the active style by clicking it again, removing the style term from the Prompt_Builder.

---

### Requirement 7: Camera Movement Selection (Video Mode Only)

**User Story:** As a video creator, I want to select camera movements from a visual menu, so that I can add cinematic motion language to my video prompt.

#### Acceptance Criteria

1. WHILE the Media_Tab is set to `video`, THE Movement_Picker SHALL be visible and display the following movements as selectable cards: Static/Locked, Pan Left, Pan Right, Tilt Up, Tilt Down, Dolly In, Dolly Out, Tracking Shot, Handheld/Verité, Crane/Jib Up, Crane/Jib Down, and Drone Aerial.
2. WHILE the Media_Tab is set to `image`, THE Movement_Picker SHALL be hidden and SHALL NOT contribute any terms to the Prompt_Builder.
3. WHEN the user selects a movement card, THE Movement_Picker SHALL update the Prompt_Builder with the corresponding camera movement term.
4. THE Movement_Picker SHALL allow exactly one movement to be active at a time.

---

### Requirement 8: Live Prompt Preview

**User Story:** As a user, I want to see the prompt being assembled in real time as I make selections, so that I understand exactly what will be sent to the AI model.

#### Acceptance Criteria

1. THE Prompt_Preview SHALL display the current assembled prompt string, updating within 100ms of any selection change in any picker or slider.
2. THE Prompt_Preview SHALL render each contributed segment (shot size, angle, DOF, lighting, style, movement) as a visually distinct, colour-coded token so the user can see which selection produced which text.
3. THE Prompt_Preview SHALL include an editable free-text field where the user can type a subject description (e.g., "a woman in a red dress") that is prepended to the assembled prompt.
4. WHEN the subject field is empty, THE Prompt_Preview SHALL display a placeholder that prompts the user to describe their subject.
5. THE Prompt_Builder SHALL assemble the final prompt in the following order: [subject], [shot size], [angle], [lighting], [style], [DOF], [movement (video only)].

---

### Requirement 9: Send Prompt to Studio

**User Story:** As a user, I want to send my assembled prompt to the Studio generation input with one click, so that I can immediately generate without copying and pasting.

#### Acceptance Criteria

1. THE Prompt_Guide SHALL display a prominent "Use in Studio" button that is always visible while the Prompt Guide tab is active.
2. WHEN the user clicks "Use in Studio", THE Prompt_Guide SHALL write the assembled prompt string into the Studio's prompt input field and switch the active tab back to the generation view.
3. WHEN the assembled prompt is empty (no subject and no selections made), THE "Use in Studio" button SHALL be disabled and display a tooltip explaining that a subject or at least one selection is required.
4. WHEN the user clicks "Use in Studio", THE Prompt_Guide SHALL preserve all current selections so the user can return to the Prompt Guide tab and refine without starting over.

---

### Requirement 10: Section Navigation and Progressive Disclosure

**User Story:** As a user, I want the guide to walk me through each decision in a logical sequence, so that the experience feels like thinking through a shot rather than filling out a form.

#### Acceptance Criteria

1. THE Prompt_Guide SHALL organise its controls into named sections presented in the following order: (1) Subject, (2) Framing, (3) Angle, (4) Light, (5) Style, (6) Depth of Field, (7) Movement (video only).
2. THE Prompt_Guide SHALL display all sections simultaneously on a single scrollable page so that experienced users can jump directly to any section.
3. WHEN a section has an active selection, THE Prompt_Guide SHALL display a visual indicator (e.g., a filled dot or checkmark) on that section's heading so the user can see their progress at a glance.
4. THE Prompt_Guide SHALL include a "Reset All" control that clears all selections and the subject field, returning the guide to its initial state.
5. WHEN the user clicks "Reset All", THE Prompt_Guide SHALL display a confirmation prompt before clearing, to prevent accidental loss of selections.
