import {harmonies} from './exercise.ts';
import type {PracticeChord} from './exercise.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';

export type MelodyRole = {label: string; description: string; inVoicing: boolean; semitones: number};
export type MelodyRoleSegment = {start: number; duration: number; chord?: PracticeChord; role?: MelodyRole};
const pc = (note: number) => ((note % 12) + 12) % 12;

export function melodyRole(note: number, chord: PracticeChord): MelodyRole {
  const root = chord.notes.find(tone => tone.root)!;
  const interval = pc(note - root.note);
  const hasMinorThird = chord.notes.some(tone => pc(tone.note - root.note) === 3);
  const flatFifth = chord.name.includes('♭5');
  const labels = ['R', '♭9', '9', hasMinorThird ? '♭3' : '♯9', '3', '11', flatFifth ? '♭5' : '♯11', '5', '♭13', '13', '♭7', '7'];
  const descriptions = ['root', 'flat ninth', 'ninth', hasMinorThird ? 'minor third' : 'sharp ninth', 'major third', 'eleventh', flatFifth ? 'diminished fifth' : 'sharp eleventh', 'perfect fifth', 'flat thirteenth', 'thirteenth', 'minor seventh', 'major seventh'];
  return {label: labels[interval], description: descriptions[interval], semitones: note - root.note, inVoicing: chord.notes.some(tone => pc(tone.note) === pc(note))};
}

export function melodyRoleLabel(role: MelodyRole, mode: LabelMode) {
  if (mode === 'jazz') return role.label;
  return `+${pitchLabel(pc(role.semitones), 'dozenal')}`;
}

export function melodyRoleSegments(note: number, start: number, duration: number): MelodyRoleSegment[] {
  const result: MelodyRoleSegment[] = [];
  const end = start + duration;
  if (start < 0) result.push({start, duration: Math.min(end, 0) - start});
  for (const chord of harmonies) {
    const from = Math.max(start, chord.start), to = Math.min(end, chord.start + chord.duration);
    if (to - from > 1e-7) result.push({start: from, duration: to - from, chord, role: melodyRole(note, chord)});
  }
  return result;
}
