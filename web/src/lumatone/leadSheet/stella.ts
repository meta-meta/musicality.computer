import stellaByStarlight from '../chordCharts/stellaByStarlight.ts';
import type {CoordAxial} from '../lumatoneTypes.ts';

export type MelodyAttack = {
  note: number;
  at: CoordAxial;
  start: number;
  duration: number;
  location: string;
};

// Full 32-bar melody, with tied segments joined into single attacks.
// https://natyelverton.com/wp-content/uploads/2018/04/Stella-by-Starlight-in-Bb-Modern-Changes-Lead-Sheet.pdf
// Each pair is MIDI pitch and duration in quarter-note beats. Bar lines do
// not re-articulate ties; the last two bars share a single eight-beat note.
const melody: [number, number][] = [
  [70, 1], // Pickup.
  [69, 5], [67, 1], [69, 1], [70, 1], // Bars 1–2.
  [65, 7], [65, 1], // 3–4.
  [67, 5], [65, 1], [65, 1], [67, 1], // 5–6.
  [60, 7], [62, 1], // 7–8.
  [63, 1], [62, 1], [60, 1], [58, 1], // 9.
  [62, 3], [64, 1], // 10.
  [67, 1.5], [65, 0.5], [65, 5], [67, 1], // 11–12.
  [70, 1], [69, 1], [67, 1], [65, 1], // 13.
  [67, 2], [69, 1], [70, 1], // 14.
  [74, 1.5], [72, 0.5], [72, 4], [74, 2], // 15–16.
  [75, 5], [75, 1], [75, 1], [74, 1], // 17–18.
  [77, 5], [75, 1], [74, 2 / 3], [72, 2 / 3], [70, 2 / 3], // 19–20.
  [74, 2], [74, 3], [72, 1], [70, 1], [69, 1], // 21–22.
  [72, 7], [70, 1], // 23–24.
  [69, 5], [67, 1], [69, 1], [70, 1], // 25–26.
  [65, 5], [65, 1], [65, 1], [63, 1], // 27–28.
  [66, 5], [66, 1], [67, 1], [65, 1], // 29–30.
  [65, 8], // 31–32.
];

// Choose a compact, consistent spelling on the same 2q + 7r pitch lattice.
function melodyPosition(note: number): CoordAxial {
  // Keep both F♯ attacks in bars 29–30 close to the preceding E♭.
  if (note === 66) return {q: -6, r: 2};
  const candidates = Array.from({length: 7}, (_, index) => index - 2)
    .map(r => ({q: (note - 64 - 7 * r) / 2, r}))
    .filter(({q}) => Number.isInteger(q));
  candidates.sort((a, b) => Math.abs(a.q + 2) - Math.abs(b.q + 2));
  return candidates[0];
}
let beat = -1;
export const stellaMelody: MelodyAttack[] = melody.map(([note, duration]) => {
  const start = Math.round(beat * 1e9) / 1e9;
  beat += duration;
  const bar = Math.floor(start / 4) + 1;
  return {note, at: melodyPosition(note), start, duration,
    location: start < 0 ? 'Pickup · beat 4' : `Bar ${bar} · beat ${Number((start % 4 + 1).toFixed(2))}`};
});

const chordNames = [
  ['Em7♭5'], ['A7(♭9)'], ['Cm7'], ['F7'],
  ['Fm7'], ['B♭7'], ['E♭maj7'], ['A♭7'],
  ['B♭maj7'], ['Em7♭5', 'A7'], ['Dm7'], ['B♭m7', 'E♭7'],
  ['Fmaj7'], ['Gm7', 'C7'], ['Am7♭5'], ['D7(♭9)'],
  ['G7(♭13)'], ['G7(♭13)'], ['Cm7'], ['Cm7'],
  ['A♭7(♯11)'], ['A♭7(♯11)'], ['B♭maj7'], ['B♭maj7'],
  ['Em7♭5'], ['A7(♭9)'], ['Dm7♭5'], ['G7(♭9)'],
  ['Cm7♭5'], ['F7(♭9)'], ['B♭maj7'], ['B♭maj7'],
];
// A Bb-centered harmonic reading. Slashes identify an applied function's
// target degree; they do not imply that every tonicization resolves directly.
const chordFunctions = [
  ['iiø7/iii'], ['V7/iii'], ['ii7'], ['V7'],
  ['ii7/IV'], ['V7/IV'], ['IVmaj7'], ['♭VII7'],
  ['Imaj7'], ['iiø7/iii', 'V7/iii'], ['iii7'], ['i7', 'IV7'],
  ['Vmaj7'], ['vi7', 'V7/V'], ['iiø7/vi'], ['V7/vi'],
  ['V7/ii'], ['V7/ii'], ['ii7'], ['ii7'],
  ['♭VII7'], ['♭VII7'], ['Imaj7'], ['Imaj7'],
  ['iiø7/iii'], ['V7/iii'], ['iiø7/ii'], ['V7/ii'],
  ['iiø7'], ['V7'], ['Imaj7'], ['Imaj7'],
];
const voicings = stellaByStarlight(57).flatMap(group => group.chords);
let rootPosition: CoordAxial = {q: 1, r: -2};
let chordIndex = 0;

// Reuse every editable-chart voicing and exact root movement. Split bars
// change harmony on beat three; the chart remains the source of truth.
export const stellaChords = chordNames.flatMap((names, bar) => names.map((name, index) => {
  const chord = voicings[chordIndex++];
  const at = {...rootPosition};
  const [q, r] = chord.intervalNextRoot ?? [0, 0];
  rootPosition = {q: at.q + q, r: at.r + r};
  return {
    name, function: chordFunctions[bar][index], bar: bar + 1, start: bar * 4 + index * (4 / names.length), duration: 4 / names.length,
    notes: [[0, 0], ...chord.intervals].map(([dq, dr], noteIndex) => ({
      note: chord.root + dq * 2 + dr * 7,
      at: {q: at.q + dq, r: at.r + dr}, root: noteIndex === 0,
    })),
  };
}));
export const stellaDuration = 32 * 4;

export function overlapsAttack(attack: MelodyAttack, start: number, duration: number) {
  return attack.start < start + duration && attack.start + attack.duration > start;
}
