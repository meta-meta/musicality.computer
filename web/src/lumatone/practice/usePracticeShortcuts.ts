import {usePracticeScore} from './PracticeScoreContext.tsx';
import {useEffect, useRef} from 'react';
import {adjacentBar, adjacentGroup, adjacentLoopPoint, adjacentNote} from './navigation.ts';

// Space types a space only where text is being entered; everywhere else on the
// practice page it is play/pause, whatever has focus.
const textInputTypes = ['text', 'search', 'email', 'url', 'tel', 'password'];
export function spaceTypesText(element: {tagName: string; isContentEditable?: boolean; getAttribute: (name: string) => string | null} | null): boolean {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  if (tag === 'textarea' || element.isContentEditable || element.getAttribute('role') === 'textbox') return true;
  return tag === 'input' && textInputTypes.includes((element.getAttribute('type') ?? 'text').toLowerCase());
}

export function usePracticeShortcuts(actions: {beat: number; loopStart: number | null; loopEnd: number | null; noteGroups: {start: number}[]; onToggle: () => void; onSeek: (beat: number) => void; onPlayChord: () => void; onToggleMetronome?: () => void; onToggleLoop?: () => void;
  // Up/down: tempo steps in BPM (positive is faster).
  onTempoStep?: (bpm: number) => void;
  // Left/right first offer the step here; returning true means it was used (moving between saved sections).
  onStep?: (direction: -1 | 1) => boolean}) {
  const {score} = usePracticeScore();
  const latest = useRef({...actions, score});
  useEffect(() => {latest.current = {...actions, score};}, [actions, score]);
  useEffect(() => {
    // Capture phase: a focused button, checkbox, select, slider or note hex
    // would otherwise act on Space itself.
    const space = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (spaceTypesText(event.target instanceof HTMLElement ? event.target : null)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) latest.current.onToggle();
    };
    // A button or checkbox activates on keyup, so that is swallowed as well.
    const spaceUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || spaceTypesText(event.target instanceof HTMLElement ? event.target : null)) return;
      event.preventDefault();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const element = event.target instanceof Element ? event.target : null;
      // M and R work from any focus except where a letter would be typed.
      const letter = event.key.toLowerCase();
      if ((letter === 'm' || letter === 'r') && !spaceTypesText(event.target instanceof HTMLElement ? event.target : null)) {
        event.preventDefault();
        if (!event.repeat) (letter === 'm' ? latest.current.onToggleMetronome : latest.current.onToggleLoop)?.();
        return;
      }
      if (element?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="textbox"]')) return;
      const current = latest.current;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        current.onTempoStep?.((event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1));
      } else if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        if (!event.repeat) current.onPlayChord();
      } else if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        current.onSeek(adjacentNote(current.beat, event.key === '[' ? -1 : 1, current.score));
      } else if (event.key === ',' || event.key === '.') {
        if (!current.noteGroups.length) return;
        event.preventDefault();
        current.onSeek(adjacentGroup(current.beat, event.key === ',' ? -1 : 1, current.noteGroups, current.score));
      } else if (event.key === '{' || event.key === '}') {
        event.preventDefault();
        current.onSeek(adjacentLoopPoint(current.beat, event.key === '{' ? -1 : 1, current.loopStart, current.loopEnd, current.score));
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (current.onStep?.(event.key === 'ArrowLeft' ? -1 : 1)) return;
        current.onSeek(adjacentBar(current.beat, event.key === 'ArrowLeft' ? -1 : 1, current.score));
      }
    };
    window.addEventListener('keydown', space, true);
    window.addEventListener('keyup', spaceUp, true);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', space, true);
      window.removeEventListener('keyup', spaceUp, true);
      window.removeEventListener('keydown', keydown);
    };
  }, []);
}
