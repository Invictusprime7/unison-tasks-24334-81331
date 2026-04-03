import { useState, useCallback, useRef } from "react";

export interface CodeHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => string | null;
  redo: () => string | null;
  push: (code: string) => void;
  clear: () => void;
  currentIndex: number;
  historyLength: number;
}

export const useCodeHistory = (maxHistory = 50): CodeHistoryState => {
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const lastPushedRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const push = useCallback((code: string) => {
    // Debounce rapid changes (e.g., typing)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Don't push if code is the same as last pushed
      if (code === lastPushedRef.current) return;
      
      // Don't push empty or default content
      if (!code || code.includes('AI-generated code will appear here')) return;

      lastPushedRef.current = code;

      setHistory((prev) => {
        // Remove any future states (redo stack) when pushing new state
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push(code);
        
        // Limit history size
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          setCurrentIndex((idx) => Math.max(0, idx));
          return newHistory;
        }
        
        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });
    }, 500); // 500ms debounce
  }, [currentIndex, maxHistory]);

  const undo = useCallback((): string | null => {
    if (currentIndex <= 0) return null;

    const newIndex = currentIndex - 1;
    const state = history[newIndex];
    setCurrentIndex(newIndex);
    lastPushedRef.current = state;
    return state;
  }, [currentIndex, history]);

  const redo = useCallback((): string | null => {
    if (currentIndex >= history.length - 1) return null;

    const newIndex = currentIndex + 1;
    const state = history[newIndex];
    setCurrentIndex(newIndex);
    lastPushedRef.current = state;
    return state;
  }, [currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    lastPushedRef.current = "";
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo,
    push,
    clear,
    currentIndex,
    historyLength: history.length,
  };
};
