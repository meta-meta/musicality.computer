import catalog from './openbook/catalog.json';
import {exercise, harmonies} from './exercise.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import type {PracticeChord} from './exercise.ts';

export type PracticeScore = {
  id: string; title: string; composer: string; tonic: number; quality: string;
  start: number; end: number; bars: number[]; melody: MelodyAttack[]; chords: PracticeChord[];
  source?: string; credit?: string; copyright?: string; copyrightExtra?: string; warnings?: string[];
};
export const stellaScore: PracticeScore = {id: 'stella-by-starlight', title: 'Stella by Starlight · your arrangement',
  composer: 'Victor Young', tonic: 10, quality: 'major', start: -1, end: 128,
  bars: Array.from({length: 32}, (_, i) => i * 4), melody: exercise, chords: harmonies};
export const practiceScores: PracticeScore[] = [stellaScore, ...catalog];

export function scoreBeatLabel(score: PracticeScore, beat: number) {
  if (beat < 0) return 'Pickup';
  if (beat >= score.end) return 'End';
  const index = Math.max(0, score.bars.reduce((last, start, i) => start <= beat + 1e-7 ? i : last, 0));
  return `Bar ${index + 1} · beat ${(beat - score.bars[index] + 1).toFixed(2)}`;
}
