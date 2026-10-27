import {stellaChords, stellaMelody} from '../leadSheet/stella.ts';

export const exercise = stellaMelody;
export const START = -1;
export const END = 128;
export const harmonies = stellaChords.filter(chord => chord.start >= 0 && chord.start < END);
export type PracticeChord = typeof harmonies[number];
export const LENGTH = END - START;
export const TIMING_TOLERANCE = 120;
export type Attempt = {index: number; cycle: number; note: number; cents: number; errorMs: number; correctPitch: boolean; freeTime?: boolean};

export function matchesPracticePitch(expected: number, played: number, cents: number, allowLowOctaveUp = false) {
  return Math.abs(cents) <= 35 && (played === expected || (allowLowOctaveUp && expected < 60 && played === expected + 12));
}

export function judgeEntrance(beat: number, note: number, cents: number, bpm: number, transpose: number,
  options: {pass: number; entryBeat: number; loop: boolean; loopStart: number; loopEnd: number; allowLowOctaveUp?: boolean;
    next?: {entryBeat: number; endBeat: number; pass: number} | null}) : Attempt | null {
  if (beat < options.entryBeat - 0.5) return null;
  let nearest: Attempt | null = null;
  const passes = [{pass: options.pass, entry: options.entryBeat, end: options.loopEnd, offset: 0}];
  if (options.next) passes.push({pass: options.next.pass, entry: options.next.entryBeat, end: options.next.endBeat, offset: options.loopEnd - options.next.entryBeat});
  else if (options.loop) passes.push({pass: options.pass + 1, entry: options.loopStart, end: options.loopEnd, offset: options.loopEnd - options.loopStart});
  for (const candidate of passes) {
    for (const [index, target] of exercise.entries()) {
      if (target.start + target.duration <= candidate.entry || target.start >= candidate.end) continue;
      const onset = Math.max(target.start, candidate.entry) + candidate.offset;
      const errorMs = (beat - onset) * 60000 / bpm;
      if (!nearest || Math.abs(errorMs) < Math.abs(nearest.errorMs)) {
        nearest = {index, cycle: candidate.pass, note, cents, errorMs,
          correctPitch: matchesPracticePitch(target.note + transpose, note, cents, options.allowLowOctaveUp)};
      }
    }
  }
  return nearest && Math.abs(nearest.errorMs) <= 400 ? nearest : null;
}

export function beatLabel(beat: number) {
  if (beat < 0) return 'Pickup';
  if (beat >= END) return 'End';
  return `Bar ${Math.floor(beat / 4) + 1} · beat ${(beat % 4 + 1).toFixed(2)}`;
}
