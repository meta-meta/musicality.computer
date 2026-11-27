import {InputNoteHighlight} from './InputNoteHighlight.tsx';
import {defaultNoteTrail} from './noteTrail.ts';
import type {NoteTrailSettings} from './noteTrail.ts';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import {memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import type {WindSource} from './ewi.ts';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import {getNoteColorHsl, orderColor} from '../colors.ts';
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
import {spreadOverlappingMoves} from './arrowLanes.ts';

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

type Cell = {q: number; r: number; note: number; x: number; y: number};
const HexCell = memo(function HexCell({cell, fills, active, live, midi, detected, tuningCents, chord, guideTone, dimmed, preview, mode, isLight, showGuideTones, windActive, heardCents, practicing, progress, barId, barEndAt, barMs, noteTrail, onPlay}: {
  cell: Cell; fills: {normal: string; played: string}; active: boolean; live: boolean; midi: boolean; detected: boolean;
  tuningCents: number | null | undefined; chord: 'tone' | 'root' | null; guideTone: boolean; dimmed: boolean; preview: boolean;
  mode: LabelMode; isLight: boolean; showGuideTones: boolean; windActive: boolean; heardCents: number | null;
  practicing: boolean; progress: number; barId: string; barEndAt: number | null; barMs: number; noteTrail: NoteTrailSettings; onPlay: (note: number) => void;
}) {
  const targetColor = isLight ? '#111' : '#fff';
  const harmonyColor = isLight ? '#422006' : '#dec89d';
  const progressColor = isLight ? '#111' : '#d1d5db';
  const tuningOffset = -Math.max(-50, Math.min(50, heardCents ?? 0)) / 50 * 4;
  const label = pitchLabel(cell.note, mode);
  return (
    <g transform={`translate(${cell.x},${cell.y})`} opacity={dimmed ? 0.22 : undefined} data-dimmed={dimmed ? 'true' : undefined} data-note={cell.note} data-target={active ? 'true' : undefined} data-preview={preview ? 'true' : undefined} data-detected-chord={detected ? 'true' : undefined} data-heard={live ? 'true' : undefined} data-harmony={chord ? 'true' : undefined} data-chord-root={chord === 'root' ? 'true' : undefined}
       className="practice-hex" role="button" tabIndex={0} aria-label={`Play ${label} octave ${Math.floor(cell.note / 12) - 1}`} style={{cursor: 'pointer'}}
       onClick={event => {
         if (event.detail > 0) event.currentTarget.blur();
         onPlay(cell.note);
       }} onKeyDown={event => {
         if (event.key !== 'Enter' && event.key !== ' ') return;
         event.preventDefault();
         if (!event.repeat) onPlay(cell.note);
       }}>
      <polygon points={points} fill={active || preview || chord ? fills.played : fills.normal} opacity={active || live || midi || !showGuideTones || !chord || guideTone ? 1 : chord === 'root' ? 0.65 : 0.35}/>
      <InputNoteHighlight active={midi || live} note={cell.note} points={points} fill={fills.played} stroke={windActive && live && !midi ? null : targetColor} settings={noteTrail}/>
      {detected && tuningCents !== null && tuningCents !== undefined && <g data-polyphonic-tuning={cell.note} data-cents={tuningCents}
        transform={`translate(0,${-RADIUS * 0.6})`} pointerEvents="none">
        <title>{`${Math.abs(tuningCents).toFixed(0)} cents ${Math.abs(tuningCents) < 3 ? 'in tune' : tuningCents > 0 ? 'sharp' : 'flat'} (experimental)`}</title>
        <circle r={6} fill="none" stroke={targetColor} strokeWidth={1}/>
        <path d="M -4 0 H 4" stroke={targetColor} strokeWidth={0.75} opacity={0.45}/>
        <circle cy={-Math.max(-50, Math.min(50, tuningCents)) / 50 * 4} r={1.8} fill={targetColor}/>
      </g>}
      {live && !windActive && <g data-monophone-indicator="true" data-cents={heardCents ?? undefined} transform={`translate(0,${-RADIUS * 0.6})`} pointerEvents="none">
        <circle r={6} fill="none" stroke={targetColor} strokeWidth={1}/>
        <path d="M -4 0 H 4" stroke={targetColor} strokeWidth={0.75} opacity={0.45}/>
        <circle cy={tuningOffset} r={1.8} fill={targetColor}/>
      </g>}
      <text fill={isLight ? '#fffc' : '#000c'} textAnchor="middle" dominantBaseline="central" style={{fontSize: RADIUS * (label.length > 1 ? 0.65 : 0.95)}}>{label}</text>
      <text x={RADIUS * 0.5} y={RADIUS * 0.25} fill={isLight ? '#fff7' : '#0007'} textAnchor="middle" style={{fontSize: RADIUS * 0.32}}>{Math.floor(cell.note / 12) - 1}</text>
      {active && <>
        {practicing && <DurationBar key={barId} progress={progress} color={progressColor} endAt={barEndAt} ms={barMs}/>}
      </>}
      {chord && <polygon data-chord-border="true" points={points} transform="scale(0.86)" fill="none" stroke={harmonyColor} strokeWidth={chord === 'root' ? 1.8 : 1.2} opacity={0.9} vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {chord === 'root' && <polygon data-root-outer-border="true" points={points} transform="scale(1.08)" fill="none" stroke={harmonyColor} strokeWidth={1.2} opacity={0.9} vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {guideTone && <circle data-guide-tone={cell.note} cx={RADIUS * 0.43} cy={-RADIUS * 0.44} r={3} fill={isLight ? '#b45309' : '#fbbf24'} stroke={isLight ? '#fff' : '#111820'} strokeWidth={1}/>}
    </g>
  );
});

const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const CUE_GROW = (RADIUS - 2 + 9) / (RADIUS - 2);
const upcomingDashPeriod = 6 * (RADIUS - 2) / 24;
// The dashed outline of an upcoming attack. It closes onto its hex during the
// last beat before the attack. With an arrival time (timed playback) that is
// one animation scheduled to end at the attack, so it runs smoothly and lands
// on time however busy the page is. Without one (free time, paused, or no
// animation support) the size follows `radius` from each render, as before.
function UpcomingHex({radius, color, opacity, transition, arriveAt, msPerBeat}: {
  radius: number; color: string; opacity: number; transition: string; arriveAt: number | null; msPerBeat: number;
}) {
  const hex = useRef<SVGPolygonElement>(null);
  const arrival = useRef(arriveAt);
  arrival.current = arriveAt;
  const timed = arriveAt !== null && msPerBeat > 0;
  useBeforePaint(() => {
    const node = hex.current, at = arrival.current;
    if (!timed || at === null || !node?.animate) return;
    const animation = node.animate([{transform: `scale(${CUE_GROW})`, strokeWidth: `${1.5 / CUE_GROW}px`}, {transform: 'scale(1)', strokeWidth: '1.5px'}],
      {duration: msPerBeat, delay: at - msPerBeat - performance.now(), fill: 'both', easing: 'linear'});
    return () => animation.cancel();
    // The arrival time is read once per attack: later renders only refine it by
    // clock jitter, and restarting the animation for that would make it stutter.
  }, [timed, msPerBeat]);
  return <polygon ref={hex} className="practice-upcoming-motion" data-upcoming-hex="true" data-cue-timed={timed ? 'true' : undefined} points={points}
    style={{transform: `scale(${radius / (RADIUS - 2)})`, transformOrigin: '0px 0px', opacity, transition}}
    fill="none" stroke={color} strokeWidth={1.5 * (RADIUS - 2) / radius}
    strokeDasharray={`${upcomingDashPeriod * 3 / 7} ${upcomingDashPeriod * 4 / 7}`}/>;
}

// The bar on the target hex that empties over the note's length. With an end
// time (timed playback) it is one animation scheduled to finish when the note
// ends; otherwise its width follows `progress` from each render.
function DurationBar({progress, color, endAt, ms}: {progress: number; color: string; endAt: number | null; ms: number}) {
  const bar = useRef<SVGRectElement>(null);
  const end = useRef(endAt);
  end.current = endAt;
  const timed = endAt !== null && ms > 0;
  useBeforePaint(() => {
    const node = bar.current, at = end.current;
    if (!timed || at === null || !node?.animate) return;
    const animation = node.animate([{transform: 'scaleX(1)'}, {transform: 'scaleX(0)'}], {duration: ms, delay: at - ms - performance.now(), fill: 'both', easing: 'linear'});
    return () => animation.cancel();
  }, [timed, ms]);
  return <g data-duration-bar="true" data-bar-timed={timed ? 'true' : undefined} pointerEvents="none">
    <rect x={-RADIUS * 0.35} y={RADIUS * 0.52 - 2} width={RADIUS * 0.7} height={2.5} rx={1.25} fill={color} opacity={0.2}/>
    <rect ref={bar} x={-RADIUS * 0.35} y={RADIUS * 0.52 - 2} width={RADIUS * 0.7 * (timed ? 1 : Math.max(0, Math.min(1, 1 - progress)))} height={2.5} rx={1.25} fill={color}
      style={timed ? {transformBox: 'fill-box', transformOrigin: 'left center', transform: `scaleX(${Math.max(0, Math.min(1, 1 - progress))})`} : undefined}/>
  </g>;
}

const noSubscribe = () => () => {};
const noValue = () => null;
// Breath sets the marker's size; bend slides it. With a live source the marker
// follows it directly and nothing else on the board re-renders.
function windShape(value: {breath: number; bend: number}) {
  const breath = Math.max(0, Math.min(1, value.breath));
  // One cell to the right is two semitones higher, so a bend is drawn to scale.
  const slide = value.bend / 2 * Math.sqrt(3) * RADIUS;
  return {breath, bend: value.bend, slide, radius: RADIUS * (0.18 + 0.6 * breath), fill: 0.12 + 0.4 * breath,
    label: `Wind controller: breath ${Math.round(breath * 100)}%, bend ${value.bend.toFixed(2)} semitones`};
}
function WindIndicator({source, breath: fixedBreath, bend: fixedBend, x, y, color}: {
  source?: WindSource; breath: number | null; bend: number | null; x: number; y: number; color: string;
}) {
  const group = useRef<SVGGElement>(null), line = useRef<SVGLineElement>(null), ring = useRef<SVGCircleElement>(null), dot = useRef<SVGCircleElement>(null);
  // With a live source the marker is redrawn here, outside React. A React
  // update per breath message would keep interrupting the lower-priority
  // playhead update, and the note cues would stall while a note is held.
  useEffect(() => {
    if (!source) return;
    const draw = () => {
      const value = source.getWind(), node = group.current;
      if (!node || !line.current || !ring.current || !dot.current) return;
      node.style.display = value ? '' : 'none';
      if (!value) return;
      const shape = windShape(value);
      node.setAttribute('data-breath', String(shape.breath));
      node.setAttribute('data-bend', String(shape.bend));
      node.setAttribute('aria-label', shape.label);
      line.current.setAttribute('x2', String(shape.slide));
      line.current.style.display = Math.abs(shape.slide) > 0.5 ? '' : 'none';
      ring.current.setAttribute('cx', String(shape.slide));
      ring.current.setAttribute('r', String(shape.radius));
      ring.current.setAttribute('fill-opacity', String(shape.fill));
      dot.current.setAttribute('cx', String(shape.slide));
    };
    draw();
    return source.subscribe(draw);
  }, [source]);
  const value = source ? source.getWind() : fixedBreath === null ? null : {breath: fixedBreath, bend: fixedBend ?? 0};
  if (!value && !source) return null;
  const shape = windShape(value ?? {breath: 0, bend: 0});
  return <g ref={group} data-wind-indicator="true" data-breath={shape.breath} data-bend={shape.bend} role="img" pointerEvents="none"
    aria-label={shape.label} transform={`translate(${x},${y})`} style={value ? undefined : {display: 'none'}}>
    <line ref={line} x2={shape.slide} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} style={Math.abs(shape.slide) > 0.5 ? undefined : {display: 'none'}}/>
    <circle ref={ring} cx={shape.slide} r={shape.radius} fill={color} fillOpacity={shape.fill} stroke={color} strokeWidth={1.5}/>
    <circle ref={dot} cx={shape.slide} r={2} fill={color}/>
  </g>;
}

export function PracticeHexMap({target, targetHit = false, futureAttacks, progress, fill = false, cueBeat = 0, cueClock, targetSpan, heard: heardNote, heardCents = null, wind, windOffset = 0, transpose, mode, harmony, previewNote, practicing, onPlayNote, showGuideTones = false, midiNotes = [], detectedNotes = [], detectedTunings = [], noteTrail = defaultNoteTrail, extendedLowRange = false, group, dimOutsideGroup = false, heardBreath = null, heardBend = null}: {
  // Fill the parent's height instead of the page layout's clamped height.
  fill?: boolean;
  // Timed playback: the beat `futureAttacks` was computed for, and a way to
  // read the audio clock's beat now, so cue outlines can be scheduled to land
  // exactly on their attacks. Omit `cueClock` where the playhead waits for the player.
  cueBeat?: number; cueClock?: () => {beat: number; msPerBeat: number} | null;
  // The sounding span of the target note in beats, and an id that changes with
  // each new attack (including a repeat of the same note), for the duration bar.
  targetSpan?: {id: string; start: number; end: number};
  // A live wind controller. When given, it supplies the played note (plus
  // `windOffset` semitones to written pitch), breath and bend, replacing
  // `heard`, `heardBreath` and `heardBend`.
  wind?: WindSource; windOffset?: number;
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
  const windNote = useSyncExternalStore(wind?.subscribe ?? noSubscribe, wind?.getNote ?? noValue, noValue);
  const heard = wind ? windNote === null ? null : windNote + windOffset : heardNote;
  const windActive = wind ? true : heardBreath !== null;
  const latestPlay = useRef(onPlayNote);
  latestPlay.current = onPlayNote;
  const playNote = useCallback((note: number) => latestPlay.current(note), []);
  const chordRoot = harmony?.notes.find(note => note.root);
  const arrowId = useId().replace(/:/g, "");
  const {colorMode} = useColorMode();
  const isLight = colorMode === 'light';
  const targetColor = isLight ? '#111' : '#fff';
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
  // Group path: one arrow per move between different cells. Moves that would be
  // drawn over one another are spread into parallel lanes.
  const groupCells = group ? group.notes.map(note => cells.find(cell => atTarget(cell, note))) : [];
  const groupCellSet = new Set(groupCells);
  // In free play there is no single prompt, so a played pitch is shown on the
  // section's own cell for it when there is one.
  const promptCell = (dimOutsideGroup ? groupCells.find(cell => cell && cell.note === heard) : undefined) ?? targetCell ?? null;
  const groupMoves = groupCells.flatMap((from, index) => {
    const to = groupCells[index + 1];
    return from && to && from !== to ? [{from, to, index}] : [];
  });
  const groupShifts = spreadOverlappingMoves(groupMoves, 4.5, 18);
  const groupSegments = groupMoves.map(({from, to, index}, order) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const unit = {x: (to.x - from.x) / distance, y: (to.y - from.y) / distance};
    const shift = groupShifts[order], padding = Math.min(RADIUS * 0.62, distance * 0.3);
    const point = (along: number, side = 0) => `${from.x + unit.x * along - unit.y * side + shift.x} ${from.y + unit.y * along + unit.x * side + shift.y}`;
    // The line stops at the base of the head, so the head ends in a clean point.
    const tip = distance - padding, head = Math.min(5.5, (tip - padding) * 0.45);
    return {index, color: orderColor(order, groupMoves.length), played: index < (group?.current ?? 0), d: `M ${point(padding)} L ${point(tip - head)}`,
      head: `M ${point(tip)} L ${point(tip - head, head * 0.42)} L ${point(tip - head, -head * 0.42)} Z`};
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
  // The audio clock's beat right now, to time the cue outlines. Unusable when
  // the clock has already wrapped into another pass than the one being drawn.
  const clockNow = practicing ? cueClock?.() ?? null : null;
  const cueNow = clockNow && Math.abs(clockNow.beat - cueBeat) < 1 ? {...clockNow, at: performance.now()} : null;
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
    <svg ref={svg} role="group" aria-label="Fixed isomorphic practice layout. Click a note to hear it. Contrasting outline: target. Dashed hexagon: upcoming. Small top indicator: detected instrument note; dot above center means sharp, below means flat." viewBox={`${viewLeft} ${top} ${viewWidth} ${height}`} style={{width: '100%', height: fill ? '100%' : 'clamp(280px, 58vh, 640px)', overflow: 'hidden', background: 'transparent', userSelect: 'none', WebkitUserSelect: 'none', borderRadius: 12, fontFamily: 'JetBrains Mono, monospace'}}>
      <defs><marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke={targetColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
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
        const active = Boolean(atTarget(cell, target));
        const live = cell === heardCell;
        const detected = detectedSet.has(cell);
        const tuning = detected ? detectedTunings.find(reading => reading.note === cell.note) : undefined;
        const midi = midiCells.has(cell) || detected;
        const chordTone = harmony?.notes.find(note => note.at.q === cell.q && note.at.r === cell.r);
        const guideTone = Boolean(showGuideTones && chordTone && chordRoot && [3, 4, 10, 11].includes(((chordTone.note - chordRoot.note) % 12 + 12) % 12));
        const dimmed = dimOutsideGroup && Boolean(group) && !groupCellSet.has(cell) && !active && !live && !midi;
        // Only the props of cells that changed differ between renders, so a new
        // played note or a moving target redraws a few cells, not the board.
        return <HexCell key={`${cell.q},${cell.r}`} cell={cell} fills={colors[index]} active={active} live={live} midi={midi} detected={detected}
          tuningCents={detected ? tuning?.cents : undefined} chord={chordTone ? chordTone.root ? 'root' : 'tone' : null} guideTone={guideTone} dimmed={dimmed}
          preview={cell === previewCell} mode={mode} isLight={isLight} showGuideTones={showGuideTones} windActive={windActive}
          heardCents={live ? heardCents : null} practicing={practicing && active} progress={active && practicing ? progress : 0}
          barId={active && targetSpan ? targetSpan.id : ''} barEndAt={active && practicing && cueNow && targetSpan ? cueNow.at + (targetSpan.end - cueNow.beat) * cueNow.msPerBeat : null}
          barMs={active && cueNow && targetSpan ? (targetSpan.end - targetSpan.start) * cueNow.msPerBeat : 0} noteTrail={noteTrail} onPlay={playNote}/>;
      })}
      {heardCell && windActive && <WindIndicator source={wind} breath={heardBreath} bend={heardBend} x={heardCell.x} y={heardCell.y} color={targetColor}/>}
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
          <UpcomingHex radius={radius} color={cueStyle.color} opacity={cueStyle.opacity} transition={practicing ? `opacity 240ms ease-out ${delay}ms` : 'none'}
            arriveAt={practicing && cueNow ? cueNow.at + (cueBeat + approaching.beatsAway - cueNow.beat) * cueNow.msPerBeat : null} msPerBeat={cueNow?.msPerBeat ?? 0}/>
        </g>;
      })}
      {group && <g data-note-group="true" data-group-size={group.notes.length} role="img" pointerEvents="none"
        aria-label={`Note group: ${group.notes.map(note => pitchLabel(note.note + transpose, mode)).join(', ')}`}>
        {/* A section's cells already stand out against the dimmed board, so they need no outline. */}
        {!dimOutsideGroup && [...new Set(groupCells)].map(cell => cell && <polygon key={`${cell.q},${cell.r}`} data-group-cell={cell.note} points={points}
          transform={`translate(${cell.x},${cell.y}) scale(0.93)`} fill="none" stroke={targetColor} strokeWidth={1}
          opacity={groupCells.lastIndexOf(cell) < group.current ? 0.2 : 0.55} vectorEffect="non-scaling-stroke"/>)}
        {groupSegments.map(segment => <g key={segment.index} data-group-move={segment.index} data-move-color={segment.color} data-played={segment.played ? 'true' : undefined} opacity={segment.played ? 0.25 : 1}>
          <path d={segment.d} fill="none" stroke="#111" strokeWidth={3} strokeOpacity={0.6}/>
          <path data-group-head="true" d={segment.head} fill={segment.color} stroke="#111" strokeOpacity={0.6} strokeWidth={0.8} strokeLinejoin="round"/>
          <path d={segment.d} fill="none" stroke={segment.color} strokeWidth={1.3}/>
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
