import {useEffect, useLayoutEffect, useRef} from 'react';
import {noteTrailPlan} from './noteTrail.ts';
import type {NoteTrailSettings} from './noteTrail.ts';
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function InputNoteHighlight({active, note, points, fill, stroke, settings}: {
  active: boolean; note: number; points: string; fill: string; stroke: string; settings: NoteTrailSettings;
}) {
  const element = useRef<SVGGElement>(null);
  const previouslyActive = useRef(active);
  const releasedAt = useRef<number | null>(null);
  const lastOpacity = useRef<number | undefined>();
  const {enabled, dropMs, level, fadeMs, dropCurve, fadeCurve} = settings;
  useBeforePaint(() => {
    const node = element.current;
    if (!node) return;
    const now = performance.now();
    if (active) {releasedAt.current = null; lastOpacity.current = undefined;}
    else if (previouslyActive.current) {releasedAt.current = now; lastOpacity.current = undefined;}
    previouslyActive.current = active;
    if (active || releasedAt.current === null) return;
    const plan = noteTrailPlan({enabled, dropMs, level, fadeMs, dropCurve, fadeCurve}, now - releasedAt.current, lastOpacity.current);
    if (!plan) return;
    const animation = node.animate(plan.frames, {duration: plan.duration, fill: 'forwards'});
    return () => {
      lastOpacity.current = Number(getComputedStyle(node).opacity);
      animation.cancel();
    };
  }, [active, enabled, dropMs, level, fadeMs, dropCurve, fadeCurve]);
  return <g ref={element} data-input-highlight={active ? 'held' : 'released'} style={{opacity: active ? 1 : 0}} pointerEvents="none" aria-hidden="true">
    <polygon points={points} fill={fill}/>
    <polygon data-midi-note={active ? note : undefined} points={points} fill="none" stroke={stroke} strokeWidth={1.6}/>
  </g>;
}
