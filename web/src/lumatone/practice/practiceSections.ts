import type {MelodyAttack} from '../leadSheet/stella.ts';

// Loop points and saved practice sections, kept per tune in this browser.
export const SECTIONS_KEY = 'musicality.practice-sections.v1';
export type PracticeSection = {id: string; name: string; start: number; end: number};
export type ScoreSections = {loopStart: number | null; loopEnd: number | null; selected: string | null; sections: PracticeSection[]};
type Bounds = {start: number; end: number};
type Stored = Record<string, ScoreSections>;

const emptySections = (): ScoreSections => ({loopStart: null, loopEnd: null, selected: null, sections: []});
const beat = (value: unknown, bounds: Bounds) => typeof value === 'number' && Number.isFinite(value)
  && value >= bounds.start && value <= bounds.end ? value : null;

function readAll(storage: Pick<Storage, 'getItem'>): Stored {
  try {
    const value = JSON.parse(storage.getItem(SECTIONS_KEY) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

// Anything that no longer fits the tune (a re-imported score, a damaged entry)
// is dropped rather than repaired.
export function readScoreSections(storage: Pick<Storage, 'getItem'>, scoreId: string, bounds: Bounds): ScoreSections {
  const value = readAll(storage)[scoreId] as Partial<ScoreSections> | undefined;
  if (!value || typeof value !== 'object') return emptySections();
  const seen = new Set<string>();
  const sections = (Array.isArray(value.sections) ? value.sections : []).flatMap(item => {
    const start = beat(item?.start, bounds), end = beat(item?.end, bounds);
    if (typeof item?.id !== 'string' || !item.id || seen.has(item.id) || start === null || end === null || end <= start) return [];
    seen.add(item.id);
    return [{id: item.id, name: typeof item.name === 'string' && item.name.trim() ? item.name.slice(0, 60) : 'Section', start, end}];
  });
  let loopStart = beat(value.loopStart, bounds), loopEnd = beat(value.loopEnd, bounds);
  if (loopStart !== null && loopStart >= bounds.end) loopStart = null;
  if (loopEnd !== null && loopEnd <= bounds.start) loopEnd = null;
  if (loopStart !== null && loopEnd !== null && loopEnd <= loopStart) loopEnd = null;
  const selected = sections.find(section => section.id === value.selected);
  // A selected section always owns the loop points.
  return selected ? {loopStart: selected.start, loopEnd: selected.end, selected: selected.id, sections}
    : {loopStart, loopEnd, selected: null, sections};
}

export function writeScoreSections(storage: Pick<Storage, 'getItem' | 'setItem'>, scoreId: string, value: ScoreSections) {
  const all = readAll(storage);
  const empty = value.loopStart === null && value.loopEnd === null && !value.sections.length;
  if (empty) delete all[scoreId]; else all[scoreId] = value;
  storage.setItem(SECTIONS_KEY, JSON.stringify(all));
}

// Notes that begin inside the range; a note held over from before it is left out.
export function sectionNotes<T extends Pick<MelodyAttack, 'start'>>(melody: T[], start: number, end: number): {first: number; notes: T[]} {
  const first = melody.findIndex(note => note.start >= start - 1e-7);
  if (first < 0) return {first: -1, notes: []};
  let last = first;
  while (last < melody.length && melody[last].start < end - 1e-7) last++;
  return {first, notes: melody.slice(first, last)};
}

// Places a loop point can land when set by dragging: bar lines, note starts and
// note ends, so a dragged loop always begins and ends on something written.
export function loopSnapPoints(melody: Pick<MelodyAttack, 'start' | 'duration'>[], bars: number[], bounds: Bounds): number[] {
  const points = [bounds.start, bounds.end, ...bars, ...melody.flatMap(note => [note.start, note.start + note.duration])]
    .filter(point => point >= bounds.start - 1e-7 && point <= bounds.end + 1e-7)
    .map(point => Math.max(bounds.start, Math.min(bounds.end, point))).sort((a, b) => a - b);
  return points.filter((point, index) => index === 0 || point - points[index - 1] > 1e-6);
}

export function snapLoopBeat(value: number, points: number[]): number {
  return points.reduce((best, point) => Math.abs(point - value) < Math.abs(best - value) ? point : best, points[0] ?? value);
}

// The two ends of a drag, in either order. Null until they are different points.
export function dragLoopRange(anchor: number, current: number, points: number[]): {start: number; end: number} | null {
  const a = snapLoopBeat(anchor, points), b = snapLoopBeat(current, points);
  return Math.abs(a - b) < 1e-6 ? null : {start: Math.min(a, b), end: Math.max(a, b)};
}

export function nextSectionName(sections: PracticeSection[]): string {
  for (let number = sections.length + 1; ; number++) {
    if (!sections.some(section => section.name === `Section ${number}`)) return `Section ${number}`;
  }
}

// The neighbouring card in the row, or null at either end or with nothing selected.
export function adjacentSection(sections: PracticeSection[], selected: string | null, direction: -1 | 1): PracticeSection | null {
  const index = sections.findIndex(section => section.id === selected);
  return index < 0 ? null : sections[index + direction] ?? null;
}
