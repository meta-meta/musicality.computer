import {InputNoteHighlight} from './InputNoteHighlight.tsx';
import {defaultNoteTrail} from './noteTrail.ts';
import type {NoteTrailSettings} from './noteTrail.ts';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import {getNoteColorHsl} from '../colors.ts';
import {pointyHexAxialToPixel} from '../hexUtils.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';

import type {PracticeChord} from './exercise.ts';
import {upcomingCueStyle} from './lookahead.ts';
import type {UpcomingAttack} from './lookahead.ts';

import type {PolyphonicTuning} from './polyphonicTuning.ts';
import {detectedChordCells, detectedPitchCell} from './detectedPitchCell.ts';
import {transposePosition} from './transposition.ts';

const RADIUS = 27;
const referenceCells = Array.from({length: 10}, (_, row) => Array.from({length: 11}, (_, col) => {
  const q = col - 7, r = row - 2;
  const {x, y} = pointyHexAxialToPixel({q, r});
  return {q, r, note: 64 + 2 * q + 7 * r, x: x * RADIUS, y: y * RADIUS};
})).flat();
const left = Math.min(...referenceCells.map(cell => cell.x)) - RADIUS - 9;
const top = Math.min(...referenceCells.map(cell => cell.y)) - RADIUS - 9;
const width = Math.max(...referenceCells.map(cell => cell.x)) - left + RADIUS + 9;
const baseHeight = Math.max(...referenceCells.map(cell => cell.y)) - top + RADIUS + 9;
const points = Array.from({length: 6}, (_, index) => {
  const angle = Math.PI / 2 + index * Math.PI / 3;
  return `${Math.cos(angle) * (RADIUS - 2)},${Math.sin(angle) * (RADIUS - 2)}`;
}).join(' ');

export function PracticeHexMap({target, targetHit = false, futureAttacks, progress, heard, heardCents = null, transpose, mode, harmony, previewNote, practicing, onPlayNote, showGuideTones = false, midiNotes = [], detectedNotes = [], detectedTunings = [], noteTrail = defaultNoteTrail, extendedLowRange = false, group, dimOutsideGroup = false, heardBreath = null, heardBend = null}: {
  // Free play on a saved section: every cell outside the group is dimmed.
  dimOutsideGroup?: boolean;
  // Wind-controller input: breath 0–1 sizes a marker on the fingered note's cell,
  // and bend (semitones) slides it along the whole-tone axis of the layout.
  heardBreath?: number | null; heardBend?: number | null;
  // Every note of the current melodic group, in order; `current` indexes the target.
  group?: {notes: MelodyAttack[]; current: number};
  midiNotes?: number[];
  noteTrail?: NoteTrailSettings;
  detectedNotes?: number[];
  detectedTunings?: PolyphonicTuning[];
  extendedLowRange?: boolean;
  target?: MelodyAttack; futureAttacks: UpcomingAttack[]; progress: number;
  targetHit?: boolean;
  heard: number | null; transpose: number; mode: LabelMode;
  heardCents?: number | null;
  onPlayNote: (note: number) => void;
  harmony?: PracticeChord;
  previewNote: number | null;
  practicing: boolean;
  showGuideTones?: boolean;
}) {
  // Two extra low rows expose the seven-string low B in written pitch.
  const height = baseHeight + (extendedLowRange ? 3 * RADIUS : 0);
  const {exercise} = usePracticeScore();
  const arrowId = useId().replace(/:/g, "");
  const {colorMode} = useColorMode();
  const isLight = colorMode === 'light';
  const targetColor = isLight ? '#111' : '#fff';
  const harmonyColor = isLight ? '#422006' : '#dec89d';
  const progressColor = isLight ? '#111' : '#d1d5db';
  const tuningOffset = -Math.max(-50, Math.min(50, heardCents ?? 0)) / 50 * 4;
  const markers = futureAttacks.map(attack => ({id: attack.id, attackId: attack.id, step: attack.ordinal - 1}));
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
  }, [viewLeft, viewWidth, height]);
  const colors = useMemo(() => cells.map(cell => {
    const color = getNoteColorHsl(cell.note);
    const base = isLight ? color.range('white')(0.3) : color;
    return {normal: base.toString({format: 'hex'}), played: base.range(isLight ? 'black' : 'white')(0.25).toString({format: 'hex'})};
  }), [cells, isLight]);
  const melodyOffset = transposePosition({q: 0, r: 0}, transpose);
  const atTarget = (cell: typeof cells[number], note?: MelodyAttack) => note && cell.q === note.at.q + melodyOffset.q && cell.r === note.at.r + melodyOffset.r;
  const targetCell = cells.find(cell => atTarget(cell, target));
  const nextAttack = futureAttacks[0];
  const moveInterval = target && nextAttack ? ((nextAttack.note.note - target.note) % 12 + 12) % 12 : null;
  const arrowBackground = useMemo(() => moveInterval === null ? isLight ? '#fff' : '#111'
    : getNoteColorHsl(48 + moveInterval).range(isLight ? 'white' : 'black')(isLight ? 0.5 : 0).toString({format: 'hex'}), [moveInterval, isLight]);
  const nextCell = nextAttack && cells.find(cell => atTarget(cell, nextAttack.note));
  const showArrow = practicing && nextAttack && nextAttack.beatsAway <= 1 && nextCell;
  const arrowFrom = targetCell && targetCell !== nextCell ? targetCell : nextCell ? {x: nextCell.x, y: nextCell.y - RADIUS * 3} : undefined;
  const arrowDistance = arrowFrom && nextCell ? Math.hypot(nextCell.x - arrowFrom.x, nextCell.y - arrowFrom.y) : 0;
  const arrowUnit = arrowFrom && nextCell && arrowDistance ? {x: (nextCell.x - arrowFrom.x) / arrowDistance, y: (nextCell.y - arrowFrom.y) / arrowDistance} : {x: 0, y: 1};
  const arrowPadding = Math.min(RADIUS + 5, arrowDistance * 0.25);
  const arrowPath = arrowFrom && nextCell ? `M ${arrowFrom.x + arrowUnit.x * arrowPadding} ${arrowFrom.y + arrowUnit.y * arrowPadding} L ${nextCell.x - arrowUnit.x * arrowPadding} ${nextCell.y - arrowUnit.y * arrowPadding}` : '';
  // Group path: one arrow per move between different cells. A move that is
  // later retraced in the opposite direction is shifted sideways so both show.
  const groupCells = group ? group.notes.map(note => cells.find(cell => atTarget(cell, note))) : [];
  const groupCellSet = new Set(groupCells);
  // In free play there is no single prompt, so a played pitch is shown on the
  // section's own cell for it when there is one.
  const promptCell = (dimOutsideGroup ? groupCells.find(cell => cell && cell.note === heard) : undefined) ?? targetCell ?? null;
  const groupMoves = groupCells.flatMap((from, index) => {
    const to = groupCells[index + 1];
    return from && to && from !== to ? [{from, to, index}] : [];
  });
  const groupSegments = groupMoves.map(({from, to, index}) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const unit = {x: (to.x - from.x) / distance, y: (to.y - from.y) / distance};
    const retraced = groupMoves.some(move => move.from === to && move.to === from);
    const shift = retraced ? 4.5 : 0, padding = Math.min(RADIUS * 0.62, distance * 0.3);
    const point = (along: number) => `${from.x + unit.x * along - unit.y * shift} ${from.y + unit.y * along + unit.x * shift}`;
    return {index, played: index < (group?.current ?? 0), d: `M ${point(padding)} L ${point(distance - padding)}`};
  });
  const midiCells = new Set(midiNotes.map(note => {
    const matches = cells.filter(cell => cell.note === note);
    const melody = exercise.find(attack => attack.note + transpose === note);
    return matches.find(cell => atTarget(cell, target))
      ?? matches.find(cell => atTarget(cell, melody))
      ?? matches.sort((a, b) => Math.abs(a.q + 2) - Math.abs(b.q + 2))[0];
  }));
  const previousDetectedChord = useRef<typeof cells>([]);
  const detectedCells = detectedChordCells(cells, detectedNotes, previousDetectedChord.current,
    {left: viewLeft, top, width: viewWidth, height}, RADIUS, targetCell ?? null);
  useEffect(() => {
    if (detectedCells.length) previousDetectedChord.current = detectedCells;
  }, [detectedCells]);
  const detectedSet = new Set(detectedCells);
  const upcomingDashPeriod = 6 * (RADIUS - 2) / 24;
  const previousHeardCell = useRef<{x: number; y: number} | null>(null);
  const heardCell = detectedPitchCell(cells, heard, previousHeardCell.current,
    {left: viewLeft, top, width: viewWidth, height}, RADIUS, promptCell);
  useEffect(() => {
    // Keep the anchor through silence between articulations; update only after
    // a committed render, without adding state updates to the audio frame loop.
    if (heardCell) previousHeardCell.current = {x: heardCell.x, y: heardCell.y};
  }, [heardCell]);
  const previewCells = cells.filter(cell => cell.note === previewNote);
  const previewCell = previewCells.find(cell => atTarget(cell, target))
    ?? previewCells.sort((a, b) => Math.abs(a.q + 2) - Math.abs(b.q + 2))[0];
  return (
    <svg ref={svg} role="group" aria-label="Fixed isomorphic practice layout. Click a note to hear it. Contrasting outline: target. Dashed hexagon: upcoming. Small top indicator: detected instrument note; dot above center means sharp, below means flat." viewBox={`${viewLeft} ${top} ${viewWidth} ${height}`} style={{width: '100%', height: 'clamp(280px, 58vh, 640px)', overflow: 'hidden', background: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', borderRadius: 12, fontFamily: 'JetBrains Mono, monospace'}}>
      <defs><marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke={targetColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></marker>
        <marker id={`${arrowId}-group`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M 1 1.5 L 9 5 L 1 8.5 Z" fill={targetColor}/></marker></defs>
      <style>{`
        .practice-hex:focus { outline: none; }
        .practice-hex:focus-visible > polygon:first-child,
        .practice-hex[data-preview="true"] > polygon:first-child {
          stroke: ${targetColor};
          stroke-width: 1.25;
          stroke-opacity: 1;
          opacity: 1;
        }
        @keyframes practice-next-arrow-flow { to { stroke-dashoffset: -20; } }
        .practice-next-arrow { animation: practice-next-arrow-flow 600ms linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .practice-upcoming-motion { transition: none !important; }
          .practice-next-arrow { animation: none; }
        }
      `}</style>
      {cells.map((cell, index) => {
        const active = atTarget(cell, target);
        const live = cell === heardCell;
        const detected = detectedSet.has(cell);
        const tuning = detected ? detectedTunings.find(reading => reading.note === cell.note) : undefined;
        const midi = midiCells.has(cell) || detected;
        const chordTone = harmony?.notes.find(note => note.at.q === cell.q && note.at.r === cell.r);
        const root = harmony?.notes.find(note => note.root);
        const guideTone = showGuideTones && chordTone && root && [3, 4, 10, 11].includes(((chordTone.note - root.note) % 12 + 12) % 12);
        const dimmed = dimOutsideGroup && Boolean(group) && !groupCellSet.has(cell) && !active && !live && !midi;
        return (
          <g key={`${cell.q},${cell.r}`} transform={`translate(${cell.x},${cell.y})`} opacity={dimmed ? 0.22 : undefined} data-dimmed={dimmed ? 'true' : undefined} data-note={cell.note} data-target={active ? 'true' : undefined} data-preview={cell === previewCell ? 'true' : undefined} data-detected-chord={detected ? 'true' : undefined} data-heard={live ? 'true' : undefined} data-harmony={chordTone ? 'true' : undefined} data-chord-root={chordTone?.root ? 'true' : undefined}
             className="practice-hex" role="button" tabIndex={0} aria-label={`Play ${pitchLabel(cell.note, mode)} octave ${Math.floor(cell.note / 12) - 1}`} style={{cursor: 'pointer'}}
             onClick={event => {
               if (event.detail > 0) event.currentTarget.blur();
               onPlayNote(cell.note);
             }} onKeyDown={event => {
               if (event.key !== 'Enter' && event.key !== ' ') return;
               event.preventDefault();
               if (!event.repeat) onPlayNote(cell.note);
             }}>
            <polygon points={points} fill={active || cell === previewCell || chordTone ? colors[index].played : colors[index].normal} opacity={active || live || midi || !showGuideTones || !chordTone || guideTone ? 1 : chordTone.root ? 0.65 : 0.35}/>
            <InputNoteHighlight active={midi || live} note={cell.note} points={points} fill={colors[index].played} stroke={targetColor} settings={noteTrail}/>
            {detected && tuning?.cents !== null && tuning?.cents !== undefined && <g data-polyphonic-tuning={cell.note} data-cents={tuning.cents}
              transform={`translate(0,${-RADIUS * 0.6})`} pointerEvents="none">
              <title>{`${Math.abs(tuning.cents).toFixed(0)} cents ${Math.abs(tuning.cents) < 3 ? 'in tune' : tuning.cents > 0 ? 'sharp' : 'flat'} (experimental)`}</title>
              <circle r={6} fill="none" stroke={targetColor} strokeWidth={1}/>
              <path d="M -4 0 H 4" stroke={targetColor} strokeWidth={0.75} opacity={0.45}/>
              <circle cy={-Math.max(-50, Math.min(50, tuning.cents)) / 50 * 4} r={1.8} fill={targetColor}/>
            </g>}
            {live && heardBreath === null && <g data-monophone-indicator="true" data-cents={heardCents ?? undefined} transform={`translate(0,${-RADIUS * 0.6})`} pointerEvents="none">
              <circle r={6} fill="none" stroke={targetColor} strokeWidth={1}/>
              <path d="M -4 0 H 4" stroke={targetColor} strokeWidth={0.75} opacity={0.45}/>
              <circle cy={tuningOffset} r={1.8} fill={targetColor}/>
            </g>}
            <text fill={isLight ? '#fffc' : '#000c'} textAnchor="middle" dominantBaseline="central" style={{fontSize: RADIUS * (pitchLabel(cell.note, mode).length > 1 ? 0.65 : 0.95)}}>{pitchLabel(cell.note, mode)}</text>
            <text x={RADIUS * 0.5} y={RADIUS * 0.25} fill={isLight ? '#fff7' : '#0007'} textAnchor="middle" style={{fontSize: RADIUS * 0.32}}>{Math.floor(cell.note / 12) - 1}</text>
            {active && <>
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
      {heardCell && heardBreath !== null && (() => {
        const breath = Math.max(0, Math.min(1, heardBreath));
        // One cell to the right is two semitones higher, so a bend is drawn to scale.
        const slide = (heardBend ?? 0) / 2 * Math.sqrt(3) * RADIUS;
        return <g data-wind-indicator="true" data-breath={breath} data-bend={heardBend ?? 0} role="img" pointerEvents="none"
          aria-label={`Wind controller: breath ${Math.round(breath * 100)}%, bend ${(heardBend ?? 0).toFixed(2)} semitones`} transform={`translate(${heardCell.x},${heardCell.y})`}>
          {Math.abs(slide) > 0.5 && <line x2={slide} stroke={targetColor} strokeWidth={1.5} strokeOpacity={0.7}/>}
          <circle cx={slide} r={RADIUS * (0.18 + 0.6 * breath)} fill={targetColor} fillOpacity={0.12 + 0.4 * breath} stroke={targetColor} strokeWidth={1.5}/>
          <circle cx={slide} r={2} fill={targetColor}/>
        </g>;
      })()}
      {[...markers].sort((a, b) => b.step - a.step).map(marker => {
        const approaching = futureAttacks[marker.step];
        if (!approaching || approaching.id !== marker.attackId) return null;
        const note = approaching.note;
        const cell = cells.find(cell => atTarget(cell, note));
        if (!cell) return null;
        const ordinal = marker.step + 1;
        const cueStyle = upcomingCueStyle(marker.step, isLight);
        const radius = RADIUS - 2 + Math.min(1, approaching?.beatsAway ?? 1) * 9;
        const delay = marker.step * 40;
        const transition = practicing ? `transform 320ms ease-in-out ${delay}ms, opacity 240ms ease-out ${delay}ms` : 'none';
        return <g key={marker.id} className="practice-upcoming-motion" role="img"
          aria-label={`Upcoming attack ${ordinal}: ${pitchLabel(cell.note, mode)}`}
          data-traveller-id={marker.id} data-traveller-note={cell.note} data-traveller-step={marker.step} data-attack-id={marker.attackId}
          style={{transform: `translate(${cell.x}px, ${cell.y}px)`, transition}} pointerEvents="none">
          <polygon className="practice-upcoming-motion" data-upcoming-hex="true" points={points}
            style={{transform: `scale(${radius / (RADIUS - 2)})`, transformOrigin: '0px 0px', opacity: cueStyle.opacity, transition: practicing ? `opacity 240ms ease-out ${delay}ms` : 'none'}}
            fill="none" stroke={cueStyle.color} strokeWidth={1.5 * (RADIUS - 2) / radius}
            strokeDasharray={`${upcomingDashPeriod * 3 / 7} ${upcomingDashPeriod * 4 / 7}`}/>
        </g>;
      })}
      {group && <g data-note-group="true" data-group-size={group.notes.length} role="img" pointerEvents="none"
        aria-label={`Note group: ${group.notes.map(note => pitchLabel(note.note + transpose, mode)).join(', ')}`}>
        {[...new Set(groupCells)].map(cell => cell && <polygon key={`${cell.q},${cell.r}`} data-group-cell={cell.note} points={points}
          transform={`translate(${cell.x},${cell.y}) scale(0.93)`} fill="none" stroke={targetColor} strokeWidth={1}
          opacity={groupCells.lastIndexOf(cell) < group.current ? 0.2 : 0.55} vectorEffect="non-scaling-stroke"/>)}
        {groupSegments.map(segment => <g key={segment.index} data-group-move={segment.index} data-played={segment.played ? 'true' : undefined} opacity={segment.played ? 0.25 : 0.9}>
          <path d={segment.d} fill="none" stroke={isLight ? '#fff' : '#111'} strokeWidth={4} strokeOpacity={0.55} strokeLinecap="round"/>
          <path d={segment.d} fill="none" stroke={targetColor} strokeWidth={1.5} markerEnd={`url(#${arrowId}-group)`}/>
        </g>)}
      </g>}
      {showArrow && arrowDistance > 1 && <g data-next-note-arrow="true" role="img" aria-label={`Next note: ${pitchLabel(nextCell.note, mode)}`} pointerEvents="none" opacity={0.4 + 0.6 * (1 - nextAttack.beatsAway)}>
        <path data-arrow-interval={moveInterval ?? undefined} d={arrowPath} fill="none" stroke={arrowBackground} strokeWidth={5} strokeOpacity={0.9} strokeLinecap="round"/>
        <path className="practice-next-arrow" d={arrowPath} fill="none" stroke={targetColor} strokeWidth={2} strokeDasharray="6 4" markerEnd={`url(#${arrowId})`}/>
      </g>}
      {targetCell && <polygon data-target-hit={targetHit ? 'true' : 'false'} data-note={targetCell.note} points={points}
        transform={`translate(${targetCell.x},${targetCell.y})`} fill="none" stroke={targetHit ? isLight ? '#15803d' : '#4ade80' : targetColor}
        strokeWidth={1.25} pointerEvents="none"/>}
    </svg>
  );
}
