import {useEffect, useRef} from 'react';
import {adjacentBar, adjacentLoopPoint} from './navigation.ts';

export function usePracticeShortcuts(actions: {beat: number; loopStart: number | null; loopEnd: number | null; onToggle: () => void; onSeek: (beat: number) => void; onPlayChord: () => void}) {
  const latest = useRef(actions);
  useEffect(() => {latest.current = actions;}, [actions]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="textbox"]')) return;
      const current = latest.current;
      if (event.code === 'Space') {
        if (element?.closest('button, a, [role="button"]')) return;
        event.preventDefault();
        if (!event.repeat) current.onToggle();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!event.repeat) current.onPlayChord();
      } else if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        current.onSeek(adjacentLoopPoint(current.beat, event.key === '[' ? -1 : 1, current.loopStart, current.loopEnd));
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        current.onSeek(adjacentBar(current.beat, event.key === 'ArrowLeft' ? -1 : 1));
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
}
