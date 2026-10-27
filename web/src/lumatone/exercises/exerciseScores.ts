import scores from './scores.json';
import type {LumatoneChordData} from '../lumatoneTypes.ts';

export type ExerciseEvent = {bar: number; beat: number; duration: number; page: number; name: string; root: number; notes: number[]; upperStructure?: string; mode?: string};
export type ExerciseSection = {title: string; events: ExerciseEvent[]};
export type ExerciseScore = {id: string; title: string; source: string; sections: ExerciseSection[]};
export const exerciseScores: ExerciseScore[] = scores;

// Preserve the exact MIDI interval, including its octave, while choosing a
// compact location on the same 2-right / 7-up-right lattice as the song charts.
export function intervalPosition(semitones: number): number[] {
  let best = [semitones / 2, 0], cost = Infinity;
  for (let r = -16; r <= 16; r++) {
    const q = (semitones - 7 * r) / 2;
    if (!Number.isInteger(q)) continue;
    const distance = 3 * (q + r / 2) ** 2 + 2.25 * r ** 2;
    if (distance < cost) {best = [q, r]; cost = distance;}
  }
  return best;
}

export function exerciseDiagram(event: ExerciseEvent, previous?: ExerciseEvent): LumatoneChordData {
  return {
    root: event.root,
    intervals: event.notes.filter(note => note !== event.root).map(note => intervalPosition(note - event.root)),
    fromRootInterval: previous ? intervalPosition(previous.root - event.root) : undefined,
    fromIntervals: previous?.notes.filter(note => note !== previous.root).map(note => intervalPosition(note - previous.root)),
  };
}
