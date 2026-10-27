import {END, START} from './exercise.ts';

export function adjacentLoopPoint(beat: number, direction: -1 | 1, start: number | null, end: number | null) {
  const points = [...new Set([START, END, ...[start, end].filter((point): point is number => point !== null)])].sort((a, b) => a - b);
  return direction < 0 ? [...points].reverse().find(point => point < beat - 1e-6) ?? START : points.find(point => point > beat + 1e-6) ?? END;
}

export function adjacentBar(beat: number, direction: -1 | 1) {
  return Math.max(START, Math.min(END, direction < 0 ? (Math.ceil((beat - 1e-6) / 4) - 1) * 4 : (Math.floor((beat + 1e-6) / 4) + 1) * 4));
}
