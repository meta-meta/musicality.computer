import {pitchLabel} from '../leadSheet/labels.ts';
import type {CoordAxial} from '../lumatoneTypes.ts';
import type {PracticeChord} from './exercise.ts';

// Keep octave changes on the established (-1, 2) axis; choose the
// shortest exact lattice displacement for the remaining semitones.
export function transposePosition(at: CoordAxial, semitones: number): CoordAxial {
  const octaves = Math.trunc(semitones / 12), remainder = semitones - octaves * 12;
  const candidates = Array.from({length: 7}, (_, i) => i - 3)
    .map(r => ({q: (remainder - 7 * r) / 2, r})).filter(p => Number.isInteger(p.q));
  candidates.sort((a, b) => (a.q ** 2 + a.q * a.r + a.r ** 2) - (b.q ** 2 + b.q * b.r + b.r ** 2));
  const offset = candidates[0];
  return {q: at.q + offset.q - octaves, r: at.r + offset.r + octaves * 2};
}

export function transposeChord(chord: PracticeChord, semitones: number): PracticeChord {
  if (!semitones) return chord;
  const root = chord.notes.find(note => note.root)!.note;
  const name = chord.name.replace(/^[A-G][♭♯#b]?/, pitchLabel(root + semitones, 'jazz'))
    .replace(/\/([A-G])([♭♯#b]?)$/, (_, letter: string, accidental: string) => {
      const naturals: Record<string, number> = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
      const natural = naturals[letter];
      const alteration = ['♭', 'b'].includes(accidental) ? -1 : ['♯', '#'].includes(accidental) ? 1 : 0;
      return '/' + pitchLabel(natural + alteration + semitones, 'jazz');
    });
  return {...chord, name,
    notes: chord.notes.map(note => ({...note, note: note.note + semitones, at: transposePosition(note.at, semitones)}))};
}
