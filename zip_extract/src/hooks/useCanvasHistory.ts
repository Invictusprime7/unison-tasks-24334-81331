import { useState, useCallback } from "react";
import { Canvas as FabricCanvas } from "fabric";

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  save: () => void;
  clear: () => void;
}

export const useCanvasHistory = (canvas: FabricCanvas | null, maxHistory = 50): HistoryState => {
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const save = useCallback(() => {
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(json);
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [canvas, currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (!canvas || currentIndex <= 0) return;

    const newIndex = currentIndex - 1;
    const state = history[newIndex];
    
    canvas.loadFromJSON(JSON.parse(state), () => {
      canvas.renderAll();
      setCurrentIndex(newIndex);
    });
  }, [canvas, currentIndex, history]);

  const redo = useCallback(() => {
    if (!canvas || currentIndex >= history.length - 1) return;

    const newIndex = currentIndex + 1;
    const state = history[newIndex];
    
    canvas.loadFromJSON(JSON.parse(state), () => {
      canvas.renderAll();
      setCurrentIndex(newIndex);
    });
  }, [canvas, currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo,
    save,
    clear,
  };
};
