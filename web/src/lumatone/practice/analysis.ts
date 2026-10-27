import {exercise, harmonies, END, START} from './exercise.ts';
import type {PracticeChord} from './exercise.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';

export type AnalysisOptions = {commonTones: boolean; voiceLeading: boolean; guideTones: boolean; destinations: boolean; melodicIntervals: boolean; phrases: boolean};
export const defaultAnalysis: AnalysisOptions = {commonTones: false, voiceLeading: false, guideTones: false, destinations: false, melodicIntervals: false, phrases: false};
export const defaultPhraseStarts = [1, 5, 9, 13, 17, 21, 25, 29];
export const pc = (note: number) => ((note % 12) + 12) % 12;
export type VoicePair = {from: number; to: number; delta: number};
export type ChordConnections = {pairs: VoicePair[]; added: number[]; removed: number[]; common: number[]; guides: number[]};

// Hold exact common tones, then minimize motion between the remaining voices
// in their written registers. Do not invent octave substitutions or silently
// duplicate voices when cardinality changes.
export function connectVoices(previous: PracticeChord | undefined, chord: PracticeChord): ChordConnections {
  const to = chord.notes.map(note => note.note).sort((a, b) => a - b);
  const from = previous?.notes.map(note => note.note).sort((a, b) => a - b) ?? [];
  const root = chord.notes.find(note => note.root)!.note;
  const guides = to.filter(note => [3, 4, 10, 11].includes(pc(note - root)));
  if (!from.length) return {pairs: [], added: to, removed: [], common: [], guides};
  const remainingFrom = [...from], remainingTo = [...to], heldPairs: VoicePair[] = [];
  for (const note of from) {
    const index = remainingTo.indexOf(note);
    if (index < 0) continue;
    remainingTo.splice(index, 1); remainingFrom.splice(remainingFrom.indexOf(note), 1);
    heldPairs.push({from: note, to: note, delta: 0});
  }
  const small = remainingFrom.length <= remainingTo.length ? remainingFrom : remainingTo;
  const large = remainingFrom.length <= remainingTo.length ? remainingTo : remainingFrom;
  let best: VoicePair[] = [], bestCost = Infinity, bestHeld = -1;
  const choose = (selected: number[], next: number) => {
    if (selected.length === small.length) {
      const pairs = small.map((note, index) => {
        const a = remainingFrom.length <= remainingTo.length ? note : large[selected[index]];
        const b = remainingFrom.length <= remainingTo.length ? large[selected[index]] : note;
        return {from: a, to: b, delta: b - a};
      });
      const cost = pairs.reduce((sum, pair) => sum + Math.abs(pair.delta), 0), held = pairs.filter(pair => pair.delta === 0).length;
      if (cost < bestCost || (cost === bestCost && held > bestHeld)) {best = pairs; bestCost = cost; bestHeld = held;}
      return;
    }
    for (let index = next; index <= large.length - (small.length - selected.length); index++) choose([...selected, index], index + 1);
  };
  choose([], 0);
  best = [...heldPairs, ...best].sort((a, b) => a.from - b.from);
  const subtract = (notes: number[], matched: number[]) => {
    const remaining = [...notes];
    for (const note of matched) remaining.splice(remaining.indexOf(note), 1);
    return remaining;
  };
  return {pairs: best, added: subtract(to, best.map(pair => pair.to)), removed: subtract(from, best.map(pair => pair.from)),
    common: heldPairs.map(pair => pair.to), guides};
}

// The score/voicings are immutable: build these once, never on playhead ticks.
export const chordConnections = harmonies.map((chord, index) => connectVoices(harmonies[index - 1], chord));

export function motionLabel(semitones: number, mode: LabelMode) {
  const distance = Math.abs(semitones), octaves = Math.floor(distance / 12), remainder = distance % 12;
  if (mode === 'dozenal') {
    const subscript = String(octaves).replace(/[0-9]/g, digit => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);
    return `${semitones < 0 ? '−' : '+'}${pitchLabel(remainder, mode)}${subscript}`;
  }
  const qualities = ['P', 'm', 'M', 'm', 'M', 'P', '', 'P', 'm', 'M', 'm', 'M'];
  const degrees = [1, 2, 2, 3, 3, 4, 0, 5, 6, 6, 7, 7];
  const interval = remainder === 6 ? (octaves ? `${octaves}oct+TT` : 'TT') : `${qualities[remainder]}${degrees[remainder] + 7 * octaves}`;
  return `${semitones === 0 ? '↔' : semitones < 0 ? '↓' : '↑'}${interval}`;
}

export const melodicMotions = exercise.map((note, index) => ({note, previous: exercise[index - 1], delta: index ? note.note - exercise[index - 1].note : 0}));

export function parsePhraseStarts(text: string): number[] | null {
  const tokens = text.trim().split(/[\s,]+/);
  if (tokens.some(token => !/^\d+$/.test(token) || Number(token) < 1 || Number(token) > 32)) return null;
  return [...new Set([1, ...tokens.map(Number)])].sort((a, b) => a - b);
}

export function phraseGroups(starts: number[]) {
  return starts.map((bar, index) => ({index: index + 1, bar, lastBar: (starts[index + 1] ?? 33) - 1,
    start: index ? (bar - 1) * 4 : START, end: starts[index + 1] ? (starts[index + 1] - 1) * 4 : END}));
}

// Exact four-attack interval/rhythm matches, allowing transposition. Greedily
// choose non-overlapping occurrences; these are motifs, not inferred phrases.
export function repeatedMotifs() {
  const candidates = new Map<string, number[]>();
  for (let index = 0; index <= exercise.length - 4; index++) {
    const notes = exercise.slice(index, index + 4);
    const signature = notes.map(note => `${note.note - notes[0].note}:${note.duration.toFixed(6)}`).join('|');
    candidates.set(signature, [...(candidates.get(signature) ?? []), index]);
  }
  const used = new Set<number>();
  const result: {label: string; start: number; end: number; reference: number; transposition: number}[] = [];
  let number = 0;
  for (const indices of candidates.values()) {
    const available: number[] = [];
    for (const index of indices) if ([0, 1, 2, 3].every(offset => !used.has(index + offset)) && (!available.length || index >= available[available.length - 1] + 4)) available.push(index);
    if (available.length < 2) continue;
    number++;
    for (const index of available) {
      [0, 1, 2, 3].forEach(offset => used.add(index + offset));
      const last = exercise[index + 3];
      result.push({label: `M${number}`, start: exercise[index].start, end: last.start + last.duration,
        reference: exercise[available[0]].start, transposition: exercise[index].note - exercise[available[0]].note});
    }
  }
  return result.sort((a, b) => a.start - b.start);
}
export const motifs = repeatedMotifs();

const destinations: Record<string, {tonic: number; quality: 'major' | 'minor'}> = {
  I: {tonic: 10, quality: 'major'}, ii: {tonic: 0, quality: 'minor'}, iii: {tonic: 2, quality: 'minor'},
  IV: {tonic: 3, quality: 'major'}, V: {tonic: 5, quality: 'major'}, vi: {tonic: 7, quality: 'minor'},
  '♭VII': {tonic: 8, quality: 'major'},
};
export type HarmonicDestination = {start: number; end: number; tonic: number; quality: 'major' | 'minor'; degree: string; reached: boolean; next?: PracticeChord; dominant: PracticeChord; preparation?: PracticeChord; backdoor: boolean};
export function harmonicDestinations() {
  const result: HarmonicDestination[] = [];
  let covered = -1;
  for (let index = 0; index < harmonies.length; index++) {
    const chord = harmonies[index];
    const previous = harmonies[index - 1];
    const root = chord.notes.find(note => note.root)!.note;
    let degree = chord.function === '♭VII7' ? 'I' : chord.function.startsWith('V7') ? chord.function.split('/')[1] ?? 'I' : '';
    // Also recognize local ii–V pairs whose global labels are not applied
    // labels, e.g. Bbm7–Eb7 (i7–IV7 globally) pointing toward Ab.
    if (!degree && previous) {
      const previousRoot = previous.notes.find(note => note.root)!.note;
      const dominant = [4, 7, 10].every(interval => chord.notes.some(note => pc(note.note - root) === interval));
      const minor = previous.notes.some(note => pc(note.note - previousRoot) === 3);
      if (dominant && minor && pc(previousRoot - root) === 7) degree = Object.keys(destinations).find(key => destinations[key].tonic === pc(root + 5)) ?? '';
    }
    const target = destinations[degree];
    if (!target) continue;
    let first = index, last = index;
    while (last + 1 < harmonies.length && harmonies[last + 1].function === chord.function) last++;
    if (index <= covered) continue;
    if (previous && index - 1 > covered) {
      const root = previous.notes.find(note => note.root)!.note;
      const minorThird = previous.notes.some(note => pc(note.note - root) === 3);
      if (pc(root - target.tonic) === 2 && minorThird) first--;
    }
    const next = harmonies[last + 1], nextRoot = next?.notes.find(note => note.root)?.note;
    const triad = target.quality === 'minor' ? [0, 3, 7] : [0, 4, 7];
    const reached = nextRoot !== undefined && pc(nextRoot) === target.tonic && triad.every(interval => next!.notes.some(note => pc(note.note - nextRoot) === interval));
    result.push({start: harmonies[first].start, end: harmonies[last].start + harmonies[last].duration, ...target, degree, reached, next,
      dominant: chord, preparation: first < index ? previous : undefined, backdoor: chord.function === '♭VII7'});
    covered = last;
  }
  return result;
}
export const harmonicGroups = harmonicDestinations();
