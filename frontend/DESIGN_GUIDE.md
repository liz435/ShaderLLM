# ShaderLLM Visual Design Guide

> Glass-morphism dark theme with gradient accents, layered depth, and accessible interactions.

---

## Stack

| Layer           | Tool               | Version |
|-----------------|--------------------|---------|
| Framework       | React              | 19.2    |
| Language        | TypeScript (strict)| 5.9     |
| Styling         | Tailwind CSS       | 4.2     |
| Bundler         | Vite               | 7.3     |
| Code Editor     | CodeMirror         | 6.x     |

Zero external UI libraries. Every component is hand-built with Tailwind utilities.

---

## Design Philosophy

```
                    ┌─────────────────────────────────┐
                    │  DEPTH THROUGH TRANSPARENCY      │
                    │                                   │
                    │  Surfaces are semi-transparent    │
                    │  with backdrop-blur, not flat     │
                    │  solid colors.                    │
                    │                                   │
                    │  bg-white/[0.04]  not  bg-zinc-800│
                    │  border-white/[0.06]  not  border-│
                    │  zinc-700                         │
                    └─────────────────────────────────┘
```

**Core principles:**

1. **Glass over gray** — Surfaces use `bg-white/[0.04]` with `backdrop-blur` instead of opaque zinc shades
2. **Gradient separators** — Panel edges use `bg-gradient-to-r from-indigo-500/20 via-white/[0.06] to-transparent` instead of solid borders
3. **Indigo as the soul** — Every accent, glow, focus ring, and interactive highlight traces back to indigo/violet
4. **Grain texture** — SVG noise overlay at 2.5% opacity on the root element for tactile depth
5. **Minimal chrome** — Buttons, inputs, and panels whisper; content speaks

---

## Color System

### Surfaces (Layered Depth)

```
  ┌─────────────────────────────────────────────────┐
  │  #0a0a0c  ·  Root background (deepest)          │
  │  ┌───────────────────────────────────────────┐  │
  │  │  #0e0e12  ·  Left panel / sidebar          │  │
  │  │  ┌─────────────────────────────────────┐  │  │
  │  │  │  #0c0c10  ·  Editor / input areas    │  │  │
  │  │  │  ┌───────────────────────────────┐  │  │  │
  │  │  │  │  #131318  ·  Modals / dialogs  │  │  │  │
  │  │  │  └───────────────────────────────┘  │  │  │
  │  │  └─────────────────────────────────────┘  │  │
  │  └───────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────┘
```

| Token          | Value       | Tailwind                  | Usage                       |
|----------------|-------------|---------------------------|-----------------------------|
| Root           | `#0a0a0c`   | `bg-[#0a0a0c]`           | `<body>`, outermost wrapper |
| Panel          | `#0e0e12`   | `bg-[#0e0e12]`           | Sidebar, left aside         |
| Recessed       | `#0c0c10`   | `bg-[#0c0c10]`           | Editor bg, input footer     |
| Elevated       | `#131318`   | `bg-[#131318]`           | Modal dialog                |
| Glass          | —           | `bg-white/[0.04]`        | Cards, inputs, bubbles      |
| Glass hover    | —           | `bg-white/[0.06]`        | Hovered glass               |
| Glass active   | —           | `bg-white/[0.08]`        | Pressed glass               |
| Canvas         | `#000000`   | `bg-black`               | WebGL viewport              |

### Borders

| Token          | Tailwind                   | Usage                          |
|----------------|----------------------------|--------------------------------|
| Default        | `border-white/[0.06]`      | Cards, inputs, panels          |
| Hover          | `border-white/[0.1]`       | Hovered interactive elements   |
| Accent         | `border-indigo-500/20`     | Active states, selected items  |
| Accent strong  | `border-indigo-500/30`     | Focus rings, active toggles    |
| Error          | `border-red-500/20`        | Error states, alerts           |

### Text

| Token          | Tailwind              | Usage                          |
|----------------|-----------------------|--------------------------------|
| Primary        | `text-zinc-100`       | Headings, logo                 |
| Body           | `text-zinc-200`       | Dialog text, session titles    |
| Secondary      | `text-zinc-300`       | Message body, descriptions     |
| Muted          | `text-zinc-400`       | Button labels, role labels     |
| Subtle         | `text-zinc-500`       | Section labels, timestamps     |
| Faint          | `text-zinc-600`       | Placeholders, hints, kbd text  |
| Accent         | `text-indigo-400`     | Active labels, LLM branding    |

### Accent Gradient

The primary accent is never a flat color — it's always a gradient:

```
bg-gradient-to-r  from-indigo-500  to-violet-500     ← Buttons (Send, New Chat)
bg-gradient-to-br from-indigo-500  via-violet-500
                  to-purple-600                       ← Logo icon, hero orb
bg-gradient-to-br from-indigo-600  to-indigo-700     ← User message bubble
```

### Semantic Colors

| Role     | Dot                | Text               | Surface                  |
|----------|--------------------|---------------------|--------------------------|
| Success  | `bg-emerald-400`   | `text-emerald-400`  | `bg-emerald-500/10`      |
| Error    | `bg-red-500`       | `text-red-400`      | `bg-red-500/10`          |
| Warning  | —                  | `text-amber-400/80` | —                        |

---

## Typography

**Font stack:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

| Element              | Size     | Weight     | Tailwind                                          |
|----------------------|----------|------------|---------------------------------------------------|
| App title            | 15px     | Bold       | `text-[15px] font-bold tracking-tight`            |
| Hero heading         | 24px     | Bold       | `text-2xl font-bold tracking-tight`               |
| Section label        | 11px     | Semibold   | `text-[11px] font-semibold tracking-wider uppercase text-zinc-500` |
| Body / messages      | 13px     | Normal     | `text-[13px] leading-relaxed`                     |
| Button label         | 13px     | Medium/Semi| `text-[13px] font-medium` or `font-semibold`      |
| Toolbar button       | 13px     | Medium     | `text-[13px] font-medium`                         |
| Small action         | 11px     | Semibold   | `text-[11px] font-semibold`                       |
| Hint / caption       | 11px     | Normal     | `text-[11px] text-zinc-600`                       |
| Kbd badge            | 10-11px  | Mono       | `font-mono text-[10px]` or `text-[11px]`          |
| Code editor          | 12.5px   | Mono       | CodeMirror override in CSS                        |
| Role label           | 11px     | Semibold   | `text-[11px] font-semibold uppercase tracking-wider` |

---

## Spacing

| Context              | Value            | Tailwind        |
|----------------------|------------------|-----------------|
| Panel outer padding  | 16–20px          | `px-4` / `py-5` |
| Form area padding    | 12px             | `p-3`           |
| Between messages     | 20px             | `mb-5`          |
| Between list items   | 2px              | `gap-0.5`       |
| Between prompt cards | 8px              | `gap-2`         |
| Button internal      | 6px 12px         | `px-3 py-1.5`   |
| Small action btn     | 4px 10px         | `px-2.5 py-1`   |
| Icon button          | 6px              | `p-1.5`         |
| Separator margins    | 2–4px            | `mx-0.5` / `mx-1` |
| Border radius (sm)   | 8px              | `rounded-lg`    |
| Border radius (md)   | 12px             | `rounded-xl`    |
| Border radius (lg)   | 16px             | `rounded-2xl`   |

---

## Component Patterns

### Glass Card

The foundational surface pattern. Used for inputs, message bubbles, prompt chips, canvas controls.

```
bg-white/[0.04]  border border-white/[0.06]  rounded-xl

hover:bg-white/[0.06]  hover:border-white/[0.1]     ← interactive
hover:border-indigo-500/20                            ← with accent
```

### Buttons

**Toolbar button** (Reset, Export):
```
px-3 py-1.5 rounded-lg text-[13px] font-medium
text-zinc-400 hover:text-zinc-100
bg-white/[0.04] hover:bg-white/[0.08]
border border-white/[0.06] hover:border-white/[0.1]
transition-all duration-150
```

**Primary gradient** (Send, New Chat):
```
rounded-lg text-xs font-semibold text-white
bg-gradient-to-r from-indigo-500 to-violet-500
shadow-md shadow-indigo-500/20
hover:shadow-lg hover:shadow-indigo-500/30
disabled:opacity-25 disabled:shadow-none
```

**Ghost button** (hamburger, close, icon actions):
```
p-1.5 rounded-lg
text-zinc-500 hover:text-zinc-200
hover:bg-white/[0.06]
transition-all duration-150
```

**Toggle button** (editor lock):
```
/* Inactive */
text-zinc-500 bg-white/[0.03] border border-white/[0.06]
hover:bg-white/[0.06] hover:text-zinc-300

/* Active */
text-indigo-400 bg-indigo-500/10 border border-indigo-500/20
hover:bg-indigo-500/15
```

**Danger button** (Stop, Delete):
```
bg-red-500/20 text-red-400 border border-red-500/20
hover:bg-red-500/30 hover:text-red-300
```

**Action button** (Compile):
```
text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
hover:bg-emerald-500/15 hover:border-emerald-500/30
```

### Text Input

```
px-4 py-3 rounded-xl
bg-white/[0.04] border border-white/[0.08]
text-zinc-100 text-sm placeholder-zinc-600
outline-none resize-none leading-relaxed
focus:border-indigo-500/30
focus:bg-white/[0.06]
focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]
disabled:opacity-40
transition-all duration-200
```

The focus state uses a triple combo: border color shift + background lift + soft shadow ring.

### Chat Message Bubbles

```
/* User */
bg-gradient-to-br from-indigo-600 to-indigo-700
text-white rounded-2xl rounded-tr-sm
shadow-lg shadow-indigo-500/15
ring-1 ring-white/10

/* Assistant */
bg-white/[0.04] text-zinc-300 rounded-2xl rounded-tl-sm
border border-white/[0.06]
shadow-lg shadow-black/10
```

Both: `px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap max-w-[88%]`

### Prompt Chip (Empty State)

```
text-left text-[13px] px-4 py-3 rounded-xl
bg-white/[0.03] border border-white/[0.06]
text-zinc-400 hover:text-zinc-200
hover:bg-white/[0.06] hover:border-indigo-500/20
active:bg-white/[0.08]
hover:shadow-md hover:shadow-indigo-500/5
transition-all duration-200
```

Arrow prefix: `text-indigo-400/60 group-hover:text-indigo-400`

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  <header>  ToolBar  (backdrop-blur-xl, gradient bottom line)│
├────────────┬──┬─────────────────────────────────────────────┤
│            │  │                                             │
│  <aside>   │▐ │  <main>                                     │
│  420px     │▐ │  flex-1                                     │
│  min:320   │  │                                             │
│            │  │  ┌─────────────────────────────────────┐    │
│  ┌──────┐  │  │  │  ShaderCanvas (WebGL)               │    │
│  │ Chat │  │  │  │  bg-black                           │    │
│  │ Panel│  │  │  │                                     │    │
│  │      │  │  │  │  ┌──────────────┐                   │    │
│  │      │  │  │  │  │CanvasControls│ (bottom-right)    │    │
│  └──────┘  │  │  │  └──────────────┘                   │    │
│  ┌──────┐  │  │  │  ┌──────────────────────────────┐   │    │
│  │Editor│  │  │  │  │  ErrorOverlay (bottom)        │   │    │
│  │ h-70 │  │  │  └──┴──────────────────────────────┘   │    │
│  └──────┘  │  │                                         │    │
├────────────┴──┴─────────────────────────────────────────────┤
│                     (ToastContainer — fixed bottom-right)   │
└─────────────────────────────────────────────────────────────┘

▐  =  Drag handle (w-1, cursor-col-resize)
```

### Surface Colors Per Region

| Region              | Background     | Note                                |
|---------------------|----------------|-------------------------------------|
| Root wrapper        | `#0a0a0c`      | + `grain` class for noise overlay   |
| Toolbar header      | `#0e0e14/80`   | + `backdrop-blur-xl`                |
| Left aside          | `#0e0e12`      | Solid, no blur                      |
| Editor area         | `#0c0c10`      | Slightly darker than aside          |
| Input footer        | `#0c0c10/80`   | + `backdrop-blur-sm`                |
| Canvas main         | `#000000`      | Pure black for WebGL                |
| Sidebar overlay     | `#0e0e12`      | Fixed position, slides from left    |
| Backdrop            | `black/50`     | + `backdrop-blur-sm`                |
| Dialog              | `#131318`      | Elevated surface for modals         |

### Gradient Separators

Panel edges use gradient lines instead of solid borders for depth:

```
/* Toolbar bottom */
bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent

/* Chat → Editor separator */
bg-gradient-to-r from-indigo-500/20 via-white/[0.06] to-transparent

/* Sidebar header separator */
bg-gradient-to-r from-indigo-500/20 via-white/[0.04] to-transparent

/* Error overlay top */
bg-gradient-to-r from-transparent via-red-500/50 to-transparent

/* Modal top */
bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent
```

These are always `h-px` divs with `aria-hidden="true"`.

### Resizable Panel

| Property       | Value                        |
|----------------|------------------------------|
| Default width  | 420px                        |
| Min width      | 320px                        |
| Max width      | `window.innerWidth - 400`    |
| Handle width   | `w-1` (4px)                  |
| Handle idle    | Transparent with 1px white/4% center line |
| Handle hover   | `bg-indigo-500/20` + indigo center line + 3 grab dots |
| Handle active  | `bg-indigo-500/30`           |
| Keyboard       | Arrow keys (10px), Shift+Arrow (50px) |

### Sidebar

| Property       | Value                         |
|----------------|-------------------------------|
| Width          | `w-72` (288px)                |
| Position       | Fixed, left, full height      |
| Animation      | `transform transition-transform duration-250` |
| Backdrop       | `bg-black/50 backdrop-blur-sm` |
| z-index        | Backdrop: 40, Panel: 50       |
| Close triggers | Click backdrop, X button, Escape key |

---

## Animations

### Keyframe Animations (index.css)

| Class                  | Effect                            | Duration | Usage                      |
|------------------------|-----------------------------------|----------|----------------------------|
| `animate-fade-in-up`   | Opacity 0→1, Y +8→0              | 0.3s     | Toasts, error banners      |
| `animate-pulse-glow`   | Green box-shadow breathe          | 2s loop  | Compile success dot        |
| `animate-shimmer`      | Background position sweep         | 2s loop  | Loading skeletons          |
| `animate-float`        | Y ±4px gentle bob                 | 3s loop  | Hero orb glow              |
| `animate-gradient`     | Background position cycle         | 6s loop  | Animated gradient fills    |
| `animate-bounce`       | Tailwind default bounce           | —        | Thinking indicator dots    |

### Inline Transitions

| Pattern                                      | Duration | Usage                |
|----------------------------------------------|----------|----------------------|
| `transition-all duration-150`                | 150ms    | Buttons, icons       |
| `transition-all duration-200`                | 200ms    | Inputs, sidebar      |
| `transition-colors duration-150`             | 150ms    | Simple color changes |
| `transition-transform duration-200`          | 200ms    | Chevron rotations    |
| `transition-all duration-300 ease-out`       | 300ms    | Message enter/exit   |
| `transition-all duration-300 ease-out`       | 300ms    | Error overlay slide  |
| `transition-opacity duration-150`            | 150ms    | Hover-reveal actions |

### Message Enter Animation (JS-driven)

```
/* Initial */   opacity-0 translate-y-3
/* Visible */   opacity-100 translate-y-0
/* Timing */    transition-all duration-300 ease-out
```

Triggered via `requestAnimationFrame(() => setIsVisible(true))` on mount.

---

## Canvas Controls

Floating overlay on the WebGL canvas:

```
┌─────────────────────────────────────────┐
│  [60 fps]                       Canvas  │
│                                         │
│                                         │
│                                         │
│          [00:12.4 | ▶ ↻ | 1x 📷 ⛶]    │
└─────────────────────────────────────────┘
```

| Element         | Style                                           |
|-----------------|-------------------------------------------------|
| Container       | `bg-black/60 backdrop-blur-md border border-white/[0.06] rounded-xl` |
| FPS badge       | Same glass style, top-left                      |
| Icon buttons    | `p-1.5 rounded-lg hover:bg-white/10`            |
| Separators      | `w-px h-4 bg-white/[0.08]`                      |
| Time display    | `text-[11px] font-mono text-zinc-500`           |

---

## Toast Notifications

Fixed `bottom-4 right-4`, z-index 100. Auto-dismiss after 3 seconds.

| Type    | Surface                    | Border                   | Dot              |
|---------|----------------------------|--------------------------|------------------|
| Success | `bg-emerald-500/10`        | `border-emerald-500/20`  | `bg-emerald-400` |
| Error   | `bg-red-500/10`            | `border-red-500/20`      | `bg-red-400`     |
| Info    | `bg-white/[0.04]`          | `border-white/[0.08]`    | `bg-indigo-400`  |

All: `backdrop-blur-md shadow-xl shadow-black/20 rounded-xl animate-fade-in-up`

---

## CSS Utilities (index.css)

### Surface Classes

```css
.surface-base { background: #0e0e12; }
.surface-1    { background: #131318; }
.surface-2    { background: #1a1a22; }
.surface-3    { background: #22222e; }
```

### Gradient Border

```css
.gradient-border::after {
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.3),
    rgba(168, 85, 247, 0.15),
    rgba(99, 102, 241, 0.05));
  /* mask trick for border-only gradient */
}
```

### Glow Effects

```css
.glow-indigo    { box-shadow: 0 0 20px rgba(99,102,241,0.15), 0 0 60px rgba(99,102,241,0.05); }
.glow-indigo-sm { box-shadow: 0 0 10px rgba(99,102,241,0.1),  0 0 30px rgba(99,102,241,0.03); }
```

### Button Base Classes

```css
.btn-ghost   → transparent, indigo hover tint
.btn-primary → gradient indigo→violet, shadow, lift on hover
```

### Grain Overlay

```css
.grain::before {
  /* SVG feTurbulence noise at 2.5% opacity */
  position: fixed; inset: 0; z-index: 9999;
  pointer-events: none;
}
```

### Scrollbar

Indigo-tinted, 6px wide:
```css
::-webkit-scrollbar-thumb { background: rgba(129, 140, 248, 0.2); }
```

### CodeMirror

```css
.cm-editor           { background: transparent; font-size: 12.5px; }
.cm-editor .cm-gutters     { background: rgba(99,102,241, 0.03); }
.cm-editor .cm-activeLine  { background: rgba(99,102,241, 0.04); }
```

---

## Icons

Inline SVGs from [Lucide](https://lucide.dev). No icon library — paths are embedded directly.

**Standard attributes:**
```tsx
<svg className="w-3.5 h-3.5" aria-hidden="true"
  viewBox="0 0 24 24" fill="none" stroke="currentColor"
  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
```

| Icon        | Lucide Name    | Where                       |
|-------------|----------------|-----------------------------|
| Zap         | `zap`          | Logo, hero orb              |
| Menu        | `menu`         | Sidebar toggle (staggered)  |
| X           | `x`            | Close buttons               |
| Refresh     | `refresh-cw`   | Reset, undo, retry          |
| Download    | `download`     | Export                      |
| Plus        | `plus`         | New Chat                    |
| Lock        | `lock`         | Editor locked               |
| Unlock      | `unlock`       | Editor unlocked             |
| Copy        | `copy`         | Copy shader / message       |
| Check       | `check`        | Copy confirmation           |
| Chevron     | `chevron-down` | Collapsible toggle          |
| Play        | `play`         | Canvas play / compile       |
| Pause       | `pause`        | Canvas pause                |
| Camera      | `camera`       | Screenshot                  |
| Maximize    | `maximize-2`   | Fullscreen                  |
| Edit        | `edit-3`       | Rename session              |
| Trash       | `trash-2`      | Delete session              |

---

## Accessibility

### Focus Ring

```css
:focus-visible {
  outline: 2px solid #818cf8;  /* indigo-400 */
  outline-offset: 2px;
  border-radius: 4px;
}
```

### ARIA Roles

| Element              | ARIA                                                 |
|----------------------|------------------------------------------------------|
| Toolbar              | `role="banner"`, nav with `aria-label`               |
| Chat section         | `<section aria-label="Chat">`                        |
| Message log          | `role="log" aria-live="polite"`                      |
| Each message         | `role="listitem"`                                    |
| Thinking dots        | `role="status" aria-live="polite"`                   |
| Error overlay        | `role="alert"` with error count label                |
| Collapse button      | `aria-expanded`, `aria-controls`                     |
| Drag handle          | `role="separator"` + `aria-valuenow/min/max`         |
| Toggle buttons       | `aria-pressed`, `aria-label` for both states         |
| Canvas controls      | `role="toolbar" aria-label`                          |
| All icon buttons     | `aria-label` describing the action                   |
| Decorative elements  | `aria-hidden="true"`                                 |
| Form inputs          | `<label>` (`.sr-only`) linked via `htmlFor`          |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Contrast Ratios

| Pair                              | Ratio  | WCAG        |
|-----------------------------------|--------|-------------|
| zinc-100 on #0e0e12              | ~15:1  | AAA         |
| zinc-300 on #0e0e12              | ~9:1   | AAA         |
| zinc-400 on #0e0e12              | ~6:1   | AA          |
| zinc-500 on #0e0e12              | ~4.5:1 | AA          |
| zinc-600 on #0e0e12              | ~3:1   | AA (large)  |
| indigo-400 on #0e0e12            | ~5.5:1 | AA          |

---

## File Structure

```
frontend/src/
├── App.tsx                         Root layout, resizable panels, editor header
├── index.css                       Global styles, animations, utilities
├── main.tsx                        Entry point (ToastProvider → SessionProvider → App)
│
├── components/
│   ├── ToolBar.tsx                 Top bar: logo, hamburger, Reset, Export
│   ├── ChatPanel.tsx               Messages, empty state hero, textarea input
│   ├── ChatMessage.tsx             Bubble with copy + retry
│   ├── ThinkingIndicator.tsx       Bouncing dots during generation
│   ├── ErrorOverlay.tsx            Collapsible compile error panel
│   ├── ShaderEditor.tsx            CodeMirror wrapper
│   ├── ShaderCanvas.tsx            WebGL canvas with forwardRef
│   ├── CanvasControls.tsx          Play/pause, time, resolution, screenshot, fullscreen
│   ├── SessionSidebar.tsx          History slide-out: search, rename, delete
│   └── ShortcutsModal.tsx          Native <dialog> listing keyboard shortcuts
│
├── contexts/
│   ├── SessionContext.tsx           Session state, messages, generation
│   └── ToastContext.tsx             Toast notifications (success/error/info)
│
├── hooks/
│   ├── useHotkeys.ts               Global keyboard shortcuts
│   ├── useShaderHistory.ts         Undo/redo stack (max 50)
│   └── useShaderGeneration.ts      SSE streaming + repair loop
│
├── api/
│   └── sessions.ts                 REST: list, rename, delete sessions
│
├── types/
│   └── index.ts                    TypeScript interfaces
│
└── webgl/
    └── renderer.ts                 WebGL2 renderer with Shadertoy uniforms
```

---

## Keyboard Shortcuts

| Shortcut           | Action              |
|--------------------|----------------------|
| `Ctrl+S`           | Compile shader       |
| `Ctrl+E`           | Toggle editor lock   |
| `Ctrl+Shift+E`     | Export shader        |
| `Ctrl+K`           | Focus chat input     |
| `Ctrl+Z`           | Undo                 |
| `Ctrl+Shift+Z`     | Redo                 |
| `?`                | Open shortcuts modal |
| `Escape`           | Close modal/sidebar, or abort generation |
| `Enter`            | Send message         |
| `Shift+Enter`      | New line in textarea |
| `Arrow Left/Right` | Resize panel (when handle focused) |

---

## Checklist: Adding a New Component

1. Use semantic HTML (`<button>`, `<section>`, `<nav>`) — not divs for everything
2. Surface with `bg-white/[0.04] border border-white/[0.06]` — not opaque zinc
3. Add `aria-label` if the purpose isn't obvious from visible text
4. Mark decorative elements with `aria-hidden="true"`
5. Use `transition-all duration-150` on interactive states
6. Border radius: `rounded-lg` (8px) for small, `rounded-xl` (12px) for medium, `rounded-2xl` (16px) for large
7. Text sizes: `text-[13px]` body, `text-[11px]` captions, `text-[15px]` titles
8. Test keyboard navigation (Tab, Enter, Escape, Arrows)
9. Test with `prefers-reduced-motion: reduce` in devtools
10. No new hex colors — use the surface/glass/accent tokens above
