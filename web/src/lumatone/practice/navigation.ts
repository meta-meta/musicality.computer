import {END, START} from './exercise.ts';

export function adjacentLoopPoint(beat: number, direction: -1 | 1, start: number | null, end: number | null, score = {start: START, end: END}) {
  const {start: START, end: END} = score;
  const points = [...new Set([START, END, ...[start, end].filter((point): point is number => point !== null)])].sort((a, b) => a - b);
  return direction < 0 ? [...points].reverse().find(point => point < beat - 1e-6) ?? START : points.find(point => point > beat + 1e-6) ?? END;
}

export function adjacentBar(beat: number, direction: -1 | 1, score = {start: START, end: END, bars: Array.from({length: 32}, (_, i) => i * 4)}) {
  const points = [score.start, ...score.bars, score.end];
  return direction < 0 ? points.slice().reverse().find(point => point < beat - 1e-6) ?? score.start : points.find(point => point > beat + 1e-6) ?? score.end;
}
