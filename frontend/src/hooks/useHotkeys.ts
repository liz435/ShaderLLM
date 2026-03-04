import { useEffect } from 'react';

export interface HotkeyDef {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

export function useHotkeys(hotkeys: HotkeyDef[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea (unless it's a Ctrl/Cmd combo)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      for (const hk of hotkeys) {
        const ctrlMatch = hk.ctrl ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
        const shiftMatch = hk.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === hk.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch) {
          // Allow Ctrl combos even in inputs, but block plain keys
          if (isInput && !hk.ctrl) continue;
          e.preventDefault();
          hk.handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeys]);
}

export const SHORTCUT_DESCRIPTIONS: { keys: string; description: string }[] = [
  { keys: 'Space', description: 'Pause / resume shader' },
  { keys: 'Ctrl+S', description: 'Compile shader from editor' },
  { keys: 'Ctrl+E', description: 'Toggle editor lock' },
  { keys: 'Ctrl+Shift+E', description: 'Export shader file' },
  { keys: 'Ctrl+K', description: 'Focus chat input' },
  { keys: 'Ctrl+Z', description: 'Undo shader edit' },
  { keys: 'Ctrl+Shift+Z', description: 'Redo shader edit' },
  { keys: 'F', description: 'Toggle fullscreen canvas' },
  { keys: '?', description: 'Show keyboard shortcuts' },
  { keys: 'Escape', description: 'Close modal / stop generation' },
];
