# ShaderLLM Frontend Design Guide

Reference for building and extending the ShaderLLM frontend UI. Covers color tokens, typography, component patterns, accessibility rules, and layout conventions.

---

## Tech Stack

| Tool              | Version | Purpose                        |
|-------------------|---------|--------------------------------|
| React             | 19.2    | UI framework                   |
| TypeScript        | 5.9     | Type safety (strict mode)      |
| Tailwind CSS      | 4.2     | Utility-first styling          |
| Vite              | 7.3     | Dev server + build             |
| CodeMirror        | 6.x     | Shader code editor             |

No additional UI component libraries. All components are custom-built with Tailwind utility classes.

---

## Color System

Dark theme built on the **Zinc** scale from Tailwind. **Indigo** is the primary accent. Semantic colors for status.

### Surfaces

| Token             | Tailwind Class  | Hex       | Usage                          |
|-------------------|-----------------|-----------|--------------------------------|
| Background        | —               | `#111113` | Root `<html>` / `<body>`       |
| Surface           | `bg-zinc-900`   | `#18181b` | Panels, sidebar, toolbar       |
| Surface raised    | `bg-zinc-800`   | `#27272a` | Cards, inputs, buttons, chips  |
| Surface hover     | `bg-zinc-700`   | `#3f3f46` | Hovered buttons/cards          |
| Surface active    | `bg-zinc-600`   | `#52525b` | Pressed/active state           |

### Text

| Token             | Tailwind Class    | Usage                          |
|-------------------|-------------------|--------------------------------|
| Primary text      | `text-zinc-100`   | Headings, primary content      |
| Secondary text    | `text-zinc-200`   | Body text, message content     |
| Muted text        | `text-zinc-300`   | Button labels, secondary UI    |
| Subtle text       | `text-zinc-400`   | Labels, role names, metadata   |
| Placeholder       | `text-zinc-500`   | Input placeholders, hints      |

### Borders

| Token             | Tailwind Class         | Usage                          |
|-------------------|------------------------|--------------------------------|
| Default border    | `border-zinc-700`      | Buttons, inputs, cards         |
| Subtle border     | `border-zinc-700/60`   | Panel separators, toolbar      |
| Active border     | `border-indigo-500/30` | Active toggle, selected state  |

### Accent — Indigo

| State      | Class              | Usage                              |
|------------|--------------------|------------------------------------|
| Default    | `bg-indigo-600`    | Primary buttons (Send)             |
| Hover      | `bg-indigo-500`    | Primary button hover               |
| Active     | `bg-indigo-700`    | Primary button pressed             |
| Text       | `text-indigo-400`  | Accent text, links, user labels    |
| Tint       | `bg-indigo-500/15` | Active toggle background           |
| Glow       | `shadow-indigo-500/20` | Button shadows                 |

### Semantic Colors

| Role       | Dot/Badge           | Text              | Background          |
|------------|---------------------|--------------------|---------------------|
| Success    | `bg-emerald-500`    | —                  | —                   |
| Error      | `bg-red-500`        | `text-red-200`     | `bg-red-950/95`     |
| Warning    | —                   | `text-amber-400`   | —                   |

---

## Typography

System font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

| Element           | Size / Weight            | Class                                          |
|-------------------|--------------------------|-------------------------------------------------|
| App title         | 16px bold                | `text-base font-bold text-zinc-100`             |
| Hero heading      | 30px extrabold           | `text-3xl font-extrabold text-zinc-100`         |
| Section label     | 12px semibold uppercase  | `text-xs font-semibold text-zinc-400 tracking-wider uppercase` |
| Body text         | 14px normal              | `text-sm text-zinc-200 leading-relaxed`         |
| Button label      | 14px semibold/medium     | `text-sm font-semibold` or `font-medium`        |
| Code / editor     | 12px mono                | CodeMirror with `font-size: 12px`               |
| Hint text         | 12px normal              | `text-xs text-zinc-500`                         |
| Keyboard badge    | 11px mono                | `font-mono text-[11px] text-zinc-400`           |
| Role label        | 12px semibold            | `text-xs font-semibold`                         |

---

## Spacing Conventions

- **Panel padding**: `p-5` (20px) for content areas, `p-3` (12px) for form areas
- **Gap between items**: `gap-2` (8px) standard, `gap-2.5` (10px) for cards/chips
- **Message spacing**: `mb-4` (16px) between chat messages
- **Button padding**: `px-3 py-1.5` (toolbar), `px-5 py-2.5` (primary action)
- **Border radius**: `rounded-md` (buttons), `rounded-xl` (inputs, chips, cards), `rounded-2xl` (message bubbles)
- **Icon size**: `w-4 h-4` (standard), `w-3.5 h-3.5` (small/inline), `w-5 h-5` (toolbar hamburger)

---

## Component Patterns

### Buttons

**Primary action** (Send, Stop):
```
px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
hover:bg-indigo-500 active:bg-indigo-700
disabled:opacity-35 disabled:cursor-not-allowed
shadow-sm shadow-indigo-500/20
transition-colors duration-100
```

**Secondary action** (Reset, Export):
```
px-3 py-1.5 rounded-md text-sm font-medium
text-zinc-300 bg-zinc-800 border border-zinc-700
hover:bg-zinc-700 hover:text-zinc-100
active:bg-zinc-600
disabled:opacity-40 disabled:cursor-not-allowed
transition-colors duration-100
```

**Ghost button** (sidebar close, hamburger):
```
p-1.5 rounded-md text-zinc-400
hover:text-zinc-200 hover:bg-zinc-800
transition-colors duration-100
```

**Toggle button** (editor lock/unlock): Use tinted background when active:
```
// Inactive
text-zinc-400 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700

// Active
text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25
```

### Inputs

**Textarea / text input**:
```
px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700
text-zinc-100 text-sm placeholder-zinc-500
outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
disabled:opacity-50 resize-none leading-relaxed
transition-shadow duration-100
```

### Cards / Chips

**Clickable card** (example prompts, session list items):
```
text-left text-sm px-4 py-3 rounded-xl
bg-zinc-800 border border-zinc-700 text-zinc-300
hover:border-zinc-600 hover:text-zinc-100
active:bg-zinc-700
transition-colors duration-100
shadow-sm
```

**Selected card** (current session):
```
bg-indigo-500/15 border border-indigo-500/30 text-indigo-200
```

### Overlays

**Error overlay / alert banner**:
```
bg-red-950/95 backdrop-blur-sm border-t-2 border-red-500/40
```

**Error banner (floating)**:
```
rounded-xl bg-red-950/90 backdrop-blur-sm border border-red-500/30
text-red-200 text-sm shadow-lg shadow-red-900/20
```

**Modal backdrop**:
```
fixed inset-0 bg-black/40 z-40
```

### Status Indicators

**Compile status dot** (in editor header):
```
w-2.5 h-2.5 rounded-full

// States:
Success:  bg-emerald-500 animate-pulse-glow
Error:    bg-red-500 shadow-sm shadow-red-500/40
Neutral:  bg-zinc-500
```

**Error count dot**:
```
w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50
```

### Chat Messages

**User bubble**:
```
bg-indigo-600 text-white rounded-2xl rounded-tr-sm
shadow-md shadow-indigo-500/10
```

**Assistant bubble**:
```
bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm
border border-zinc-700
```

Both use `max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap`.

---

## Layout Architecture

```
<div>                          ← Full height flex column
  <header>                     ← ToolBar (sticky, z-50)
  <div>                        ← Main content (flex row, flex-1)
    <SessionSidebar />         ← Fixed overlay sidebar (w-72, z-50)
    <aside>                    ← Left panel (resizable, min 320px)
      <section>                ← ChatPanel (flex-1)
      <div>                    ← ShaderEditor (h-70, bottom)
    </aside>
    <div role="separator" />   ← Drag handle (w-1.5)
    <main>                     ← Right panel (flex-1, bg-black)
      <ShaderCanvas />         ← WebGL canvas
      <ErrorOverlay />         ← Bottom overlay
    </main>
  </div>
</div>
```

### Resizable Panel

- Default width: `420px`
- Min width: `320px`
- Max width: `window.innerWidth - 400px`
- Drag handle: `w-1.5`, `bg-zinc-700/60`, highlights `bg-indigo-500` on hover/focus
- Keyboard accessible: Arrow Left/Right (10px step), Shift+Arrow (50px step)

### Sidebar

- Width: `w-72` (288px)
- Slides in from left with `transform transition-transform duration-200`
- Sits on top of content (does not push layout)
- Backdrop: `fixed inset-0 bg-black/40`

---

## Accessibility Requirements

### Keyboard Navigation

Every interactive element must be reachable via Tab. All custom controls must have keyboard equivalents:

| Control              | Keyboard                                      |
|----------------------|-----------------------------------------------|
| Send message         | `Enter`                                       |
| New line in textarea | `Shift+Enter`                                 |
| Resize panel         | `ArrowLeft` / `ArrowRight` (focus drag handle)|
| Close sidebar        | Click backdrop or close button                |

### ARIA Attributes

| Element                | Required ARIA                                     |
|------------------------|---------------------------------------------------|
| ToolBar                | `role="banner"`, nav has `aria-label`             |
| Chat section           | `aria-label="Chat"`                               |
| Message log            | `role="log"`, `aria-live="polite"`                |
| Each message           | `role="listitem"`                                 |
| Thinking indicator     | `role="status"`, `aria-live="polite"`             |
| Error overlay          | `role="alert"`, `aria-label` with error count     |
| Collapse toggle        | `aria-expanded`, `aria-controls`                  |
| Drag handle            | `role="separator"`, `aria-orientation="vertical"` |
|                        | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Editor toggle          | `aria-pressed`, `aria-label` for both states      |
| All icon buttons       | `aria-label` describing the action                |
| Decorative SVGs        | `aria-hidden="true"`                              |
| Form inputs            | Associated `<label>` (visually hidden with `sr-only`) |

### Focus Management

- Global `:focus-visible` ring: `2px solid #818cf8` (indigo-400), `2px offset`
- Textarea auto-focuses after generation completes
- Sidebar close returns focus to toggle button (implicit via React)

### Motion

Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast

- Primary text (`zinc-100` on `zinc-900`): ~15:1 contrast ratio
- Secondary text (`zinc-200` on `zinc-800`): ~11:1
- Muted text (`zinc-400` on `zinc-900`): ~5.5:1 (passes WCAG AA)
- Placeholder (`zinc-500` on `zinc-800`): ~4.1:1 (passes WCAG AA for large text)

---

## Animations

Defined in `index.css`, used via class names:

| Class                  | Animation                          | Duration | Usage                   |
|------------------------|------------------------------------|----------|-------------------------|
| `animate-fade-in-up`   | Opacity 0→1, Y +8px→0            | 0.3s     | Error banners, new UI   |
| `animate-pulse-glow`   | Green box-shadow pulse            | 2s loop  | Success status dot      |
| `animate-bounce`       | Tailwind bounce                   | —        | Thinking indicator dots |

Chat messages use inline CSS transitions (not keyframes):
```
transition-all duration-300 ease-out
// Enter: opacity-0 translate-y-2 → opacity-100 translate-y-0
```

### Transition Defaults

- `duration-100`: Buttons, interactive hover/active states
- `duration-200`: Sidebar slide, chevron rotation, collapse/expand
- `duration-300`: Message fade-in, error overlay slide-in

---

## Icons

Inline SVGs using [Feather/Lucide](https://lucide.dev) icon paths. No icon library installed — paths are embedded directly.

Standard attributes for all SVGs:
```tsx
<svg
  className="w-4 h-4"
  aria-hidden="true"          // Always hide decorative icons
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
```

Icons used:

| Icon       | Name (Lucide) | Used In                    |
|------------|---------------|----------------------------|
| Lightning  | `zap`         | Logo mark                  |
| Refresh    | `refresh-cw`  | Reset button               |
| Download   | `download`    | Export button               |
| Menu       | `menu`        | Sidebar toggle             |
| X          | `x`           | Sidebar close              |
| Plus       | `plus`        | New Chat                   |
| Lock       | `lock`        | Editor locked              |
| Unlock     | `unlock`      | Editor unlocked            |
| Chevron    | `chevron-down`| Error overlay collapse     |

---

## File Structure

```
frontend/src/
├── App.tsx                    # Root layout, resizable panel, editor header
├── index.css                  # Global styles, scrollbar, animations, a11y
├── main.tsx                   # React entry point
├── components/
│   ├── ToolBar.tsx            # Top header bar with logo and actions
│   ├── ChatPanel.tsx          # Chat messages, empty state, input form
│   ├── ChatMessage.tsx        # Individual message bubble
│   ├── ThinkingIndicator.tsx  # Generation loading state
│   ├── ErrorOverlay.tsx       # Compilation error panel
│   ├── ShaderEditor.tsx       # CodeMirror wrapper
│   ├── ShaderCanvas.tsx       # WebGL canvas
│   └── SessionSidebar.tsx     # Session history slide-out
├── contexts/
│   └── SessionContext.tsx      # Session state management
├── hooks/                     # Custom React hooks
├── types/
│   └── index.ts               # TypeScript interfaces
└── webgl/                     # WebGL renderer
```

---

## Adding New Components

Checklist for any new UI component:

1. Use semantic HTML (`<button>`, `<nav>`, `<section>`, etc.) — not `<div>` for everything
2. Add `aria-label` to any element whose purpose isn't clear from visible text
3. Mark decorative elements with `aria-hidden="true"`
4. Use `role="alert"` or `aria-live` for dynamic status content
5. Follow the color tokens above — don't introduce new grays or one-off hex values
6. Use `transition-colors duration-100` on all interactive hover/active states
7. Use `rounded-md` for small controls, `rounded-xl` for larger surfaces
8. Test with keyboard-only navigation (Tab, Enter, Escape, Arrows)
9. Verify contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for UI components)
