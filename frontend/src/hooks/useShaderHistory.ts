import { useState, useCallback, useRef } from 'react';

interface ShaderHistoryState {
  current: string | null;
  canUndo: boolean;
  canRedo: boolean;
  push: (code: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  reset: () => void;
}

export function useShaderHistory(maxSize = 50): ShaderHistoryState {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const push = useCallback((code: string) => {
    if (current !== null) {
      past.current.push(current);
      if (past.current.length > maxSize) past.current.shift();
    }
    future.current = [];
    setCurrent(code);
    updateFlags();
  }, [current, maxSize, updateFlags]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return current;
    if (current !== null) future.current.push(current);
    const prev = past.current.pop()!;
    setCurrent(prev);
    updateFlags();
    return prev;
  }, [current, updateFlags]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return current;
    if (current !== null) past.current.push(current);
    const next = future.current.pop()!;
    setCurrent(next);
    updateFlags();
    return next;
  }, [current, updateFlags]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    setCurrent(null);
    updateFlags();
  }, [updateFlags]);

  return { current, canUndo, canRedo, push, undo, redo, reset };
}
