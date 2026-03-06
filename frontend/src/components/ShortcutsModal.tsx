import { useEffect, useRef } from 'react';
import { SHORTCUT_DESCRIPTIONS } from '../hooks/useHotkeys';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
    } else if (!isOpen && el.open) {
      el.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
  const mod = isMac ? '\u2318' : 'Ctrl';

  function formatKeys(keys: string): string {
    return keys
      .replace(/Ctrl\+/g, `${mod}+`)
      .replace(/Shift\+/g, isMac ? '\u21E7+' : 'Shift+');
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-[#131318] border border-white/[0.08] rounded-2xl
                 shadow-2xl shadow-black/60
                 p-0 max-w-md w-full
                 backdrop:bg-black/60 backdrop:backdrop-blur-sm
                 text-zinc-200"
      aria-label="Keyboard shortcuts"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-[15px] font-bold text-zinc-100">Keyboard Shortcuts</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]
                     transition-all duration-150"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-5 space-y-1">
        {SHORTCUT_DESCRIPTIONS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
            <span className="text-[13px] text-zinc-400">{s.description}</span>
            <kbd className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]
                           text-[11px] font-mono text-zinc-400 ml-4 shrink-0">
              {formatKeys(s.keys)}
            </kbd>
          </div>
        ))}
      </div>

      <div className="px-6 py-3 border-t border-white/[0.06] text-center">
        <span className="text-[11px] text-zinc-600">
          Press <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono text-[10px]">Esc</kbd> to close
        </span>
      </div>
    </dialog>
  );
}
