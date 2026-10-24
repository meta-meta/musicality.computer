import {toSymbol} from '../util.js';

export type LabelMode = 'dozenal' | 'jazz';

const jazzPitches = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const pitchClass = (note: number) => ((note % 12) + 12) % 12;

export function pitchLabel(note: number, mode: LabelMode) {
  return mode === 'jazz' ? jazzPitches[pitchClass(note)] : String(toSymbol(pitchClass(note)));
}

export function chordLabel(chord: {name: string; notes: {note: number; root: boolean}[]}, mode: LabelMode) {
  if (mode === 'jazz') return chord.name;
  const root = chord.notes.find(note => note.root)!.note;
  const intervals = [...new Set(chord.notes.map(note => pitchClass(note.note - root)))]
    .filter(interval => interval !== 0)
    .sort((a, b) => a - b)
    .map(interval => toSymbol(interval))
    .join('');
  return `${pitchLabel(root, mode)}${intervals ? '+' + intervals : ''}`;
}
