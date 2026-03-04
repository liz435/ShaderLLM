# ShaderLLM Frontend — Interactivity TODO

Organized by priority. Each section lists self-contained features that can be implemented independently.

---

## P0 — Canvas Interactivity (the shader preview is a dead rectangle)

### Pause / Play / Reset Time
- [ ] Add a floating control bar on the canvas (bottom-right, semi-transparent)
- [ ] Pause button freezes `iTime` — the shader stops animating but stays visible
- [ ] Play resumes from where it paused
- [ ] Reset Time button resets `iTime` back to 0
- [ ] Show elapsed time as `00:00.0` next to controls
- [ ] Space bar toggles pause/play when canvas is focused
- **Files:** `ShaderCanvas.tsx`, `renderer.ts`

### FPS Counter
- [ ] Calculate FPS from `requestAnimationFrame` delta
- [ ] Display in top-left corner of canvas as small overlay (e.g. `60 fps`)
- [ ] Toggle visibility from toolbar or keyboard shortcut
- **Files:** `ShaderCanvas.tsx`, `renderer.ts`

### Screenshot & Record
- [ ] Screenshot button captures current frame as PNG via `canvas.toBlob()`
- [ ] Auto-downloads as `shader-YYYY-MM-DD.png`
- [ ] (Stretch) Record button captures N seconds as WebM using `MediaRecorder` + `canvas.captureStream()`
- **Files:** `ShaderCanvas.tsx`, new `CanvasControls.tsx`

### Fullscreen Toggle
- [ ] Button to toggle the canvas to fullscreen (`element.requestFullscreen()`)
- [ ] Escape exits fullscreen (browser handles this natively)
- [ ] Double-click canvas to toggle fullscreen
- **Files:** `ShaderCanvas.tsx`

### Mouse Interaction Indicator
- [ ] Show `iMouse` coordinates in a small tooltip when mouse is over canvas
- [ ] Visual indicator that the shader is receiving mouse input (cursor changes)
- **Files:** `ShaderCanvas.tsx`

---

## P0 — Live Editor → Canvas (edits do nothing right now)

### Manual Compile Button
- [ ] When editor is unlocked, show a "Compile" button in the editor header
- [ ] Clicking it recompiles the edited GLSL and pushes it to the canvas
- [ ] Keyboard shortcut: `Cmd/Ctrl+S` compiles when editor is focused
- [ ] Show compile result (success/fail) via the existing status dot
- **Files:** `App.tsx`, `ShaderEditor.tsx`

### Auto-Compile on Edit (debounced)
- [ ] Option to auto-compile after 500ms of no typing (toggle in editor header)
- [ ] Default: off (manual compile only)
- **Files:** `App.tsx`, `ShaderEditor.tsx`

### Undo/Redo for Shader Code
- [ ] Track shader code history (stack of previous shader strings)
- [ ] Undo: revert to previous shader code + recompile
- [ ] Redo: go forward in history
- [ ] Buttons in editor header + `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z`
- **Files:** `App.tsx` or new `useShaderHistory.ts` hook

---

## P1 — Chat UX Improvements

### Streaming Text Display
- [ ] Instead of showing "Generating..." then a one-line result, stream the LLM's thinking text into the chat as it arrives
- [ ] Show SSE `thinking` events as a live-updating assistant message (typewriter effect)
- [ ] When done, replace the streaming text with the final result message
- **Files:** `ChatPanel.tsx`, `ChatMessage.tsx`

### Markdown Rendering in Messages
- [ ] Render assistant messages as markdown (bold, italic, code blocks, lists)
- [ ] Syntax-highlight code blocks in GLSL/C
- [ ] Requires: add `react-markdown` + `rehype-highlight` or similar lightweight renderer
- **Files:** `ChatMessage.tsx`, `package.json`

### Copy Code Blocks
- [ ] Add a "Copy" button on any code block in assistant messages
- [ ] Add a "Copy Shader" button on the shader editor header
- [ ] Show brief "Copied!" tooltip feedback
- **Files:** `ChatMessage.tsx`, `App.tsx`

### Retry / Regenerate
- [ ] Add a "Regenerate" button on the last assistant message
- [ ] Re-sends the previous user prompt to get a different result
- [ ] Only shown on the most recent assistant message
- **Files:** `ChatMessage.tsx`, `ChatPanel.tsx`, `SessionContext.tsx`

### Edit & Resend
- [ ] Click on a previous user message to edit it
- [ ] Submitting the edit re-sends from that point, discarding messages after it
- **Files:** `ChatMessage.tsx`, `ChatPanel.tsx`, `SessionContext.tsx`

---

## P1 — Session Management

### Rename Sessions
- [ ] Double-click or pencil icon on session title to rename
- [ ] Inline text input that saves on Enter/blur
- [ ] API: `PATCH /api/sessions/:id` with `{ title: string }`
- **Files:** `SessionSidebar.tsx`, new API endpoint

### Delete Sessions
- [ ] Trash icon on each session item (visible on hover)
- [ ] Confirm dialog before deleting
- [ ] API: `DELETE /api/sessions/:id`
- **Files:** `SessionSidebar.tsx`, new API endpoint

### Search / Filter Sessions
- [ ] Search input at top of sidebar
- [ ] Filters session list by title (client-side for now)
- **Files:** `SessionSidebar.tsx`

---

## P1 — Toast Notifications

### Toast System
- [ ] Create a `ToastProvider` / `useToast()` hook
- [ ] Toasts stack in bottom-right corner, auto-dismiss after 3s
- [ ] Types: success (green), error (red), info (blue)
- [ ] Use for: export success, compile success, session loaded, copy confirmation
- [ ] Replace the inline error banner in App.tsx with a toast
- **Files:** New `contexts/ToastContext.tsx`, new `components/Toast.tsx`

---

## P2 — Keyboard Shortcuts

### Global Shortcut System
- [ ] Create a `useHotkeys()` hook that registers global keyboard handlers
- [ ] Shortcuts should be discoverable (show in a `?` help modal)
- [ ] Shortcuts:

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+Enter` | Send message (alternative to Enter) |
| `Space` | Pause/play shader (when canvas focused) |
| `Cmd/Ctrl+S` | Compile shader (when editor focused) |
| `Cmd/Ctrl+E` | Toggle editor lock |
| `Cmd/Ctrl+Shift+E` | Export shader |
| `Cmd/Ctrl+K` | Focus chat input |
| `F` or `F11` | Toggle canvas fullscreen |
| `?` | Show keyboard shortcuts modal |
| `Escape` | Close sidebar / cancel generation |

- **Files:** New `hooks/useHotkeys.ts`, new `components/ShortcutsModal.tsx`, `App.tsx`

---

## P2 — Canvas HUD / Overlay Controls

### Shader Info Overlay
- [ ] Show shader name/title, resolution, uniform values in a toggleable HUD
- [ ] Display current `iTime`, `iResolution`, `iMouse`, `iFrame` values live
- [ ] Toggleable with a keyboard shortcut or button
- **Files:** New `components/CanvasHUD.tsx`, `ShaderCanvas.tsx`

### Resolution Controls
- [ ] Dropdown or buttons to switch canvas resolution scale (0.5x, 1x, 2x)
- [ ] Lower resolution = better performance for complex shaders
- [ ] Default: 1x (native DPR)
- **Files:** `ShaderCanvas.tsx`, `renderer.ts`

---

## P2 — Responsive / Mobile Layout

### Collapse to Single Column
- [ ] Below 768px viewport width, stack panels vertically instead of side-by-side
- [ ] Chat panel fills screen with canvas collapsed to a small preview strip
- [ ] Tap the preview strip to expand canvas fullscreen
- [ ] Hide drag handle on mobile
- **Files:** `App.tsx`, `ShaderCanvas.tsx`, responsive Tailwind classes

### Touch Support for Drag Handle
- [ ] Add `onTouchStart`/`onTouchMove`/`onTouchEnd` to the drag handle
- [ ] Same behavior as mouse drag but with touch events
- **Files:** `App.tsx`

---

## P2 — Onboarding / Empty State

### Interactive Tutorial
- [ ] On first visit (localStorage flag), show a step-by-step tooltip tour
- [ ] Steps: "Type a prompt" → "Watch it generate" → "Edit the code" → "Use the canvas"
- [ ] Dismissable, remembers completion
- **Files:** New `components/OnboardingTour.tsx`, `App.tsx`

### Shader Gallery / Starter Templates
- [ ] Replace or supplement example prompts with visual shader thumbnails
- [ ] Each thumbnail is a pre-rendered preview of what that prompt produces
- [ ] Click to immediately generate that shader
- **Files:** `ChatPanel.tsx`, static assets

---

## P3 — Advanced Features

### Uniform Control Panel
- [ ] Parse the generated shader for custom `uniform float/vec2/vec3` declarations
- [ ] Auto-generate slider UI for each detected uniform
- [ ] Sliders update uniform values in real-time on the canvas
- [ ] Collapsible panel on the right side or as a floating panel
- **Files:** New `components/UniformPanel.tsx`, `renderer.ts`, `ShaderCanvas.tsx`

### Share / Permalink
- [ ] Generate a shareable URL containing the shader code (base64 in hash or short link via API)
- [ ] Opening a shared link auto-loads and compiles the shader
- [ ] "Copy Link" button in toolbar
- **Files:** `ToolBar.tsx`, new API endpoint or client-side hash encoding

### Multi-Pass / Buffer Support
- [ ] Support shaders that use multiple render passes (BufferA, BufferB, etc.)
- [ ] Tab UI in editor header to switch between passes
- [ ] Requires renderer support for framebuffer objects (FBOs)
- **Files:** `renderer.ts`, `ShaderEditor.tsx`, `App.tsx`

### Texture/Image Uniforms
- [ ] Allow users to upload images as `iChannel0`-`iChannel3` texture inputs
- [ ] Drag-and-drop onto the canvas or upload button
- [ ] Renderer binds uploaded textures to sampler uniforms
- **Files:** `renderer.ts`, `ShaderCanvas.tsx`, new `components/TextureUpload.tsx`

---

## Implementation Notes

### Dependencies to Consider Adding
| Package | Purpose | Size |
|---|---|---|
| `react-markdown` + `remark-gfm` | Markdown in chat messages | ~30KB |
| `react-hot-toast` or hand-rolled | Toast notifications | ~5KB or 0 |

Everything else (hotkeys, canvas controls, FPS, recording, tutorials) can be built with zero new dependencies using React + browser APIs.

### State Management Expansion
The existing `SessionContext` and `useShaderGeneration` hook handle current needs. New features will need:
- `useShaderHistory` — undo/redo stack for shader code edits
- `useHotkeys` — global keyboard shortcut registry
- `useToast` — toast notification queue
- Canvas control state (paused, fps, resolution scale) can live in `ShaderCanvas` as local state or be lifted to App if toolbar needs access.

### Backend API Additions Needed
| Endpoint | Purpose |
|---|---|
| `PATCH /api/sessions/:id` | Rename session |
| `DELETE /api/sessions/:id` | Delete session |
| `POST /api/share` | (P3) Create short link for a shader |
| `GET /api/share/:id` | (P3) Retrieve shared shader |
