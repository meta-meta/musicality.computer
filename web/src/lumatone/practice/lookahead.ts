import {exercise} from './exercise.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';

export type UpcomingAttack = {id: string; note: MelodyAttack; beatsAway: number; ordinal: number};

export function upcomingAttacks(beat: number, entry: number, end: number, count: number, loop: {start: number; end: number} | null, cycle = 0): UpcomingAttack[] {
  const result: UpcomingAttack[] = [];
  // A boundary frame may land on or beyond the end before the transport wraps.
  beat = Math.min(beat, end - 1e-6);
  let from = entry, until = end, offset = 0;
  // One pass has at least one attack when looping. Bound passes as well so
  // even an empty interval cannot stall rendering.
  for (let pass = 0; pass <= count && result.length < count; pass++) {
    for (const note of exercise) {
      const onset = Math.max(from, note.start);
      if (note.start + note.duration <= from + 1e-7 || onset >= until - 1e-7) continue;
      const beatsAway = pass ? offset + onset - from : onset - beat;
      if (beatsAway <= 1e-7) continue;
      result.push({id: `${cycle + pass}:${note.start}`, note, beatsAway, ordinal: result.length + 1});
      if (result.length === count) return result;
    }
    if (!loop) break;
    offset += pass ? until - from : until - beat;
    from = loop.start; until = loop.end;
  }
  return result;
}
