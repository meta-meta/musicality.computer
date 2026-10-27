import {useEffect, useMemo, useRef, useState} from 'react';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import {getNoteColorHsl} from '../colors.ts';
import {pointyHexAxialToPixel} from '../hexUtils.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import type {PracticeChord} from './exercise.ts';

const RADIUS = 27;
const referenceCells = Array.from({length: 10}, (_, row) => Array.from({length: 11}, (_, col) => {
  const q = col - 7, r = row - 2;
  const {x, y} = pointyHexAxialToPixel({q, r});
  return {q, r, note: 64 + 2 * q + 7 * r, x: x * RADIUS, y: y * RADIUS};
})).flat();
const left = Math.min(...referenceCells.map(cell => cell.x)) - RADIUS - 9;
const top = Math.min(...referenceCells.map(cell => cell.y)) - RADIUS - 9;
const width = Math.max(...referenceCells.map(cell => cell.x)) - left + RADIUS + 9;
const height = Math.max(...referenceCells.map(cell => cell.y)) - top + RADIUS + 9;
const points = Array.from({length: 6}, (_, index) => {
  const angle = Math.PI / 2 + index * Math.PI / 3;
  return `${Math.cos(angle) * (RADIUS - 2)},${Math.sin(angle) * (RADIUS - 2)}`;
}).join(' ');

export function PracticeHexMap({target, upcoming, lead, progress, heard, heardCents = null, transpose, mode, harmony, previewNote, practicing, onPlayNote, showGuideTones = false}: {
  target?: MelodyAttack; upcoming?: MelodyAttack; lead: number; progress: number;
  heard: number | null; transpose: number; mode: LabelMode;
  heardCents?: number | null;
  onPlayNote: (note: number) => void;
  harmony?: PracticeChord;
  previewNote: number | null;
  practicing: boolean;
  showGuideTones?: boolean;
}) {
  const {colorMode} = useColorMode();
  const isLight = colorMode === 'light';
  const targetColor = isLight ? '#111' : '#fff';
  const harmonyColor = isLight ? '#422006' : '#dec89d';
  const progressColor = isLight ? '#111' : '#d1d5db';
  const tuningOffset = -Math.max(-50, Math.min(50, heardCents ?? 0)) / 50 * 4;
  const svg = useRef<SVGSVGElement>(null);
  const [aspect, setAspect] = useState(width / height);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setAspect(entry.contentRect.width / entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const viewWidth = height * aspect;
  const viewLeft = left + width / 2 - viewWidth / 2;
  const cells = useMemo(() => {
    const result = [];
    // Cover the viewport with staggered rows, including partial edge cells.
    // Axial coordinates stay unchanged, so resize never changes their pitches.
    const minR = Math.floor(-(top + height + RADIUS) / (1.5 * RADIUS));
    const maxR = Math.ceil((-top + RADIUS) / (1.5 * RADIUS));
    for (let r = minR; r <= maxR; r++) {
      const minQ = Math.floor((viewLeft - RADIUS) / (Math.sqrt(3) * RADIUS) - r / 2);
      const maxQ = Math.ceil((viewLeft + viewWidth + RADIUS) / (Math.sqrt(3) * RADIUS) - r / 2);
      for (let q = minQ; q <= maxQ; q++) {
        const {x, y} = pointyHexAxialToPixel({q, r});
        result.push({q, r, note: 64 + 2 * q + 7 * r, x: x * RADIUS, y: y * RADIUS});
      }
    }
    return result;
  }, [viewLeft, viewWidth]);
  const colors = useMemo(() => cells.map(cell => {
    const color = getNoteColorHsl(cell.note);
    const base = isLight ? color.range('white')(0.3) : color;
    return {normal: base.toString({format: 'hex'}), played: base.range(isLight ? 'black' : 'white')(0.25).toString({format: 'hex'})};
  }), [cells, isLight]);
  const atTarget = (cell: typeof cells[number], note?: MelodyAttack) => note && cell.q === note.at.q - transpose / 12 && cell.r === note.at.r + transpose / 6;
  const upcomingCell = cells.find(cell => atTarget(cell, upcoming));
  const upcomingRadius = RADIUS - 2 + (1 - lead) * 9;
  const upcomingDashPeriod = 6 * (RADIUS - 2) / 24;
  const heardCells = cells.filter(cell => cell.note === heard);
  const heardCell = heardCells.find(cell => atTarget(cell, target))
    ?? heardCells.sort((a, b) => Math.abs(a.q + 2) - Math.abs(b.q + 2))[0];
  const previewCells = cells.filter(cell => cell.note === previewNote);
  const previewCell = previewCells.find(cell => atTarget(cell, target))
    ?? previewCells.sort((a, b) => Math.abs(a.q + 2) - Math.abs(b.q + 2))[0];
  return (
    <svg ref={svg} role="group" aria-label="Fixed isomorphic practice layout. Click a note to hear it. Contrasting outline: target. Dashed hexagon: upcoming. Small top indicator: detected flute note; dot above center means sharp, below means flat." viewBox={`${viewLeft} ${top} ${viewWidth} ${height}`} style={{width: '100%', height: 'clamp(280px, 58vh, 640px)', overflow: 'hidden', background: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', borderRadius: 12, fontFamily: 'JetBrains Mono, monospace'}}>
      <style>{`
        .practice-hex:focus { outline: none; }
        .practice-hex:focus-visible > polygon:first-child,
        .practice-hex[data-preview="true"] > polygon:first-child {
          stroke: ${targetColor};
          stroke-width: 1.25;
          stroke-opacity: 1;
          opacity: 1;
        }
      `}</style>
      {cells.map((cell, index) => {
        const active = atTarget(cell, target);
        const live = cell === heardCell;
        const chordTone = harmony?.notes.find(note => note.at.q === cell.q && note.at.r === cell.r);
        const root = harmony?.notes.find(note => note.root);
        const guideTone = showGuideTones && chordTone && root && [3, 4, 10, 11].includes(((chordTone.note - root.note) % 12 + 12) % 12);
        return (
          <g key={`${cell.q},${cell.r}`} transform={`translate(${cell.x},${cell.y})`} data-note={cell.note} data-target={active ? 'true' : undefined} data-preview={cell === previewCell ? 'true' : undefined} data-heard={live ? 'true' : undefined} data-harmony={chordTone ? 'true' : undefined} data-chord-root={chordTone?.root ? 'true' : undefined}
             className="practice-hex" role="button" tabIndex={0} aria-label={`Play ${pitchLabel(cell.note, mode)} octave ${Math.floor(cell.note / 12) - 1}`} style={{cursor: 'pointer'}}
             onClick={event => {
               if (event.detail > 0) event.currentTarget.blur();
               onPlayNote(cell.note);
             }} onKeyDown={event => {
               if (event.key !== 'Enter' && event.key !== ' ') return;
               event.preventDefault();
               if (!event.repeat) onPlayNote(cell.note);
             }}>
            <polygon points={points} fill={active || live || cell === previewCell || chordTone ? colors[index].played : colors[index].normal} opacity={active || live || !showGuideTones || !chordTone || guideTone ? 1 : chordTone.root ? 0.65 : 0.35}/>
            {live && <g data-flute-indicator="true" data-cents={heardCents ?? undefined} transform={`translate(0,${-RADIUS * 0.6})`} pointerEvents="none">
              <circle r={6} fill="none" stroke={targetColor} strokeWidth={1}/>
              <path d="M -4 0 H 4" stroke={targetColor} strokeWidth={0.75} opacity={0.45}/>
              <circle cy={tuningOffset} r={1.8} fill={targetColor}/>
            </g>}
            <text fill={isLight ? '#fffc' : '#000c'} textAnchor="middle" dominantBaseline="central" style={{fontSize: RADIUS * (pitchLabel(cell.note, mode).length > 1 ? 0.65 : 0.95)}}>{pitchLabel(cell.note, mode)}</text>
            <text x={RADIUS * 0.5} y={RADIUS * 0.25} fill={isLight ? '#fff7' : '#0007'} textAnchor="middle" style={{fontSize: RADIUS * 0.32}}>{Math.floor(cell.note / 12) - 1}</text>
            {active && <>
              <polygon points={points} fill="none" stroke={targetColor} strokeWidth={1.25}/>
              {practicing && <g data-duration-bar="true" pointerEvents="none">
                <rect x={-RADIUS * 0.35} y={RADIUS * 0.52 - 2} width={RADIUS * 0.7} height={2.5} rx={1.25} fill={progressColor} opacity={0.2}/>
                <rect x={-RADIUS * 0.35} y={RADIUS * 0.52 - 2} width={RADIUS * 0.7 * Math.max(0, Math.min(1, 1 - progress))} height={2.5} rx={1.25} fill={progressColor}/>
              </g>}
            </>}
            {chordTone && <polygon data-chord-border="true" points={points} transform="scale(0.86)" fill="none" stroke={harmonyColor} strokeWidth={chordTone.root ? 1.8 : 1.2} opacity={0.9} vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
            {chordTone?.root && <polygon data-root-outer-border="true" points={points} transform="scale(1.08)" fill="none" stroke={harmonyColor} strokeWidth={1.2} opacity={0.9} vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
            {guideTone && <circle data-guide-tone={cell.note} cx={RADIUS * 0.43} cy={-RADIUS * 0.44} r={3} fill={isLight ? '#b45309' : '#fbbf24'} stroke={isLight ? '#fff' : '#111820'} strokeWidth={1}/>}
          </g>
        );
      })}
      {upcomingCell && <g transform={`translate(${upcomingCell.x},${upcomingCell.y})`} pointerEvents="none">
        <polygon data-upcoming-hex="true" points={points} transform={`scale(${upcomingRadius / (RADIUS - 2)})`}
          fill="none" stroke={isLight ? '#111' : '#fff9'} strokeWidth={1.5 * (RADIUS - 2) / upcomingRadius}
          strokeDasharray={`${upcomingDashPeriod * 3 / 7} ${upcomingDashPeriod * 4 / 7}`}/>
      </g>}
    </svg>
  );
}
