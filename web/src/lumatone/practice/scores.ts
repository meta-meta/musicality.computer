import catalogIndex from './catalog.index.json';
import {exercise, harmonies} from './exercise.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import type {PracticeChord} from './exercise.ts';

export type TimedLyric = {verse: string; text: string; start: number; duration: number;
  syllabic: string; lineBreak?: boolean};
export type PracticeScore = {
  id: string; title: string; composer: string; tonic: number; quality: string;
  start: number; end: number; bars: number[]; melody: MelodyAttack[]; chords: PracticeChord[];
  source?: string; credit?: string; copyright?: string; copyrightExtra?: string; warnings?: string[];
  collection?: string; edition?: string; lyrics?: TimedLyric[];
};
export const stellaScore: PracticeScore = {id: 'stella-by-starlight', title: 'Stella by Starlight · your arrangement',
  composer: 'Victor Young', tonic: 10, quality: 'major', start: -1, end: 128,
  bars: Array.from({length: 32}, (_, i) => i * 4), melody: exercise, chords: harmonies};
export type PracticeScoreEntry = Pick<PracticeScore, 'id' | 'title' | 'composer' | 'collection' | 'edition'> & {file?: string; melodyOnly: boolean; hasLyrics?: boolean};
export const practiceScores: PracticeScoreEntry[] = [{id: stellaScore.id, title: stellaScore.title,
  composer: stellaScore.composer, melodyOnly: false}, ...catalogIndex];
const cache = new Map<string, PracticeScore>();
export async function loadPracticeScore(entry: PracticeScoreEntry, signal?: AbortSignal): Promise<PracticeScore> {
  if (entry.id === stellaScore.id) return stellaScore;
  const cached = cache.get(entry.id);
  if (cached) {cache.delete(entry.id); cache.set(entry.id, cached); return cached;}
  const response = await fetch(`${import.meta.env.BASE_URL}practice/scores/${entry.file}`, {signal});
  if (!response.ok) throw new Error(`Could not load this tune (${response.status}).`);
  const score = await response.json() as PracticeScore;
  if (score.id !== entry.id || !Array.isArray(score.melody) || !Array.isArray(score.chords)) throw new Error('Invalid tune file.');
  cache.set(entry.id, score);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return score;
}

export function scoreBeatLabel(score: PracticeScore, beat: number) {
  if (beat < 0) return 'Pickup';
  if (beat >= score.end) return 'End';
  const index = Math.max(0, score.bars.reduce((last, start, i) => start <= beat + 1e-7 ? i : last, 0));
  return `Bar ${index + 1} · beat ${(beat - score.bars[index] + 1).toFixed(2)}`;
}
