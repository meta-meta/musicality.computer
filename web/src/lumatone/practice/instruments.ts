import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {PracticeScore} from './scores.ts';
import {transposeChord, transposePosition} from './transposition.ts';

// Semitones from written pitch to sounding (concert) pitch, including octave.
// Ranges are typical written MIDI limits, not a player's guaranteed range.
// Flutes assume a C foot, saxophones a high-F# key (baritone also low A),
// and saxophone altissimo / brass extended techniques are excluded.
// Sources and model assumptions are documented in web/README.md.
export const transposingInstruments = [
  {id: 'flute', label: 'Flute / concert C', soundingOffset: 0, writtenLow: 60, writtenHigh: 96},
  {id: 'piccolo', label: 'Piccolo', soundingOffset: 12, writtenLow: 62, writtenHigh: 96},
  {id: 'alto-flute', label: 'Alto flute in G', soundingOffset: -5, writtenLow: 60, writtenHigh: 96},
  {id: 'bass-flute', label: 'Bass flute in C', soundingOffset: -12, writtenLow: 60, writtenHigh: 96},
  {id: 'bb', label: 'Clarinet in B♭', soundingOffset: -2, writtenLow: 52, writtenHigh: 96},
  {id: 'bb-trumpet', label: 'Trumpet in B♭', soundingOffset: -2, writtenLow: 54, writtenHigh: 84},
  {id: 'soprano-sax', label: 'Soprano saxophone in B♭', soundingOffset: -2, writtenLow: 58, writtenHigh: 90},
  {id: 'a-clarinet', label: 'Clarinet in A', soundingOffset: -3, writtenLow: 52, writtenHigh: 96},
  {id: 'alto-sax', label: 'Alto saxophone in E♭', soundingOffset: -9, writtenLow: 58, writtenHigh: 90},
  {id: 'tenor-sax', label: 'Tenor saxophone in B♭', soundingOffset: -14, writtenLow: 58, writtenHigh: 90},
  {id: 'baritone-sax', label: 'Baritone saxophone in E♭', soundingOffset: -21, writtenLow: 57, writtenHigh: 90},
  // Standard seven-string B1–E4 tuning, 24 frets; written one octave up.
  {id: 'guitar', label: 'Guitar (7 string)', soundingOffset: -12, writtenLow: 47, writtenHigh: 100},
  {id: 'horn', label: 'Horn in F', soundingOffset: -7, writtenLow: 42, writtenHigh: 84},
] as const;
export type InstrumentId = typeof transposingInstruments[number]['id'];
export type TransposingInstrument = typeof transposingInstruments[number];
export function practiceInstrument(id: unknown): TransposingInstrument {
  return transposingInstruments.find(instrument => instrument.id === id) ?? transposingInstruments[0];
}
export function instrumentPitchLabel(instrument: TransposingInstrument, mode: LabelMode) {
  const offset = instrument.soundingOffset;
  const octave = offset === 0 ? '' : Math.abs(offset) >= 12
    ? ` · sounds ${Math.floor(Math.abs(offset) / 12) === 1 ? 'one octave' : 'two octaves'}${Math.abs(offset) % 12 ? ` + ${Math.abs(offset) % 12} semitones` : ''} ${offset > 0 ? 'higher' : 'lower'} than written` : '';
  return `${pitchLabel(-offset, mode)} = concert ${pitchLabel(0, mode)}${octave}`;
}
// Transform only the view. Playback, detector readings and saved judgements
// remain in concert pitch, so selecting an instrument never changes the song.
export function writtenPracticeScore(score: PracticeScore, soundingOffset: number): PracticeScore {
  if (!soundingOffset) return score;
  const shift = -soundingOffset;
  return {...score, tonic: ((score.tonic + shift) % 12 + 12) % 12,
    melody: score.melody.map(note => ({...note, note: note.note + shift, at: transposePosition(note.at, shift)})),
    chords: score.chords.map(chord => transposeChord(chord, shift))};
}

export type MelodyPitchBounds = {low: number; high: number};
export type InstrumentRangeFit = MelodyPitchBounds & {fits: boolean; tooLow: boolean; tooHigh: boolean};
export function practiceKeyTranspose(tonic: number, sourceTonic: number) {
  return ((tonic - sourceTonic + 18) % 12) - 6;
}
export function melodyPitchBounds(melody: PracticeScore['melody']): MelodyPitchBounds | null {
  if (!melody.length) return null;
  return melody.reduce((bounds, note) => ({low: Math.min(bounds.low, note.note), high: Math.max(bounds.high, note.note)}),
    {low: Infinity, high: -Infinity});
}
// Check the entire melody, with the same key/register displacement used by
// playback, then convert to written pitch. Chord accompaniment is excluded.
export function instrumentRangeFit(bounds: MelodyPitchBounds | null, instrument: TransposingInstrument, transpose: number): InstrumentRangeFit | null {
  if (!bounds) return null;
  const low = bounds.low + transpose - instrument.soundingOffset;
  const high = bounds.high + transpose - instrument.soundingOffset;
  const tooLow = low < instrument.writtenLow, tooHigh = high > instrument.writtenHigh;
  return {low, high, tooLow, tooHigh, fits: !tooLow && !tooHigh};
}
