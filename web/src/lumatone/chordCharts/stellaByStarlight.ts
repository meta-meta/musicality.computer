import type {LumatoneChordData, LumatoneLyricsAndChordsGroup} from '../lumatoneTypes.ts';

// Common jazz changes, rather than a transcription of a particular recording.
// https://www.michaelsattler.de/jazz-standards/stella_by_starlight/akkorde.html
// Axial pitch intervals follow the existing chart layout: 2q + 7r semitones.
const voicings = {
  minor7: [[-2, 1], [0, 1], [-1, 0]], // 3, 7, 10
  halfDiminished: [[-2, 1], [-4, 2], [-1, 0]], // 3, 6, 10
  halfDiminishedLowFifth: [[-2, 1], [-3, 0], [-1, 0]], // 3, -6, -2
  major7: [[2, 0], [0, 1], [2, 1]], // 4, 7, 11
  dominant7: [[2, 0], [0, 1], [-1, 0]], // 4, 7, 10
  dominantFlat9: [[2, 0], [0, 1], [-1, 0], [-3, 1]], // 4, 7, 10, 1
  dominantFlat13: [[2, 0], [0, 1], [-1, 0], [-3, 2]], // 4, 7, 10, 8
  dominantSharp11: [[2, 0], [0, 1], [-1, 0], [3, 0]], // Same +6 pitch beside the third, rather than the distant [-4, 2] hex.
};

const stellaByStarlight = (transpose: number): LumatoneLyricsAndChordsGroup[] => {
  // The shared selector supplies A3 (57); this chart's tonic is Bb3 (58).
  const tonic = transpose + 1;
  const chord = (offset: number, quality: keyof typeof voicings): LumatoneChordData => ({
    root: tonic + offset,
    intervals: voicings[quality].map(interval => [...interval]),
  });
  const bar = (label: string, ...chords: LumatoneChordData[]) => ({label, chords});
  const bars = [
    bar('Em7b5', chord(-6, 'halfDiminished')),
    bar('A7(b9)', {
      ...chord(-1, 'dominantFlat9'),
      intervals: [[2, 0], [0, 1], [-2, 2], [-3, 1]], // Raise the minor seventh from -2 to +10.
    }),
    bar('Cm7', chord(2, 'minor7')),
    bar('F7', {
      ...chord(-5, 'dominant7'),
      intervals: [[2, 0], [0, 1], [-2, 2]], // Raise the minor seventh from -2 to +10.
    }),
    bar('Fm7', chord(-5, 'minor7')),
    bar('Bb7', chord(0, 'dominant7')),
    bar('Ebmaj7', chord(5, 'major7')),
    bar('Ab7', chord(-2, 'dominant7')),
    bar('Bbmaj7', chord(0, 'major7')),
    // Bb and D stay put; F -> E and A -> G descend by one and two semitones.
    bar('Em7b5 A7', chord(6, 'halfDiminishedLowFifth'), chord(-1, 'dominant7')),
    bar('Dm7', chord(4, 'minor7')),
    bar('Bbm7 Eb7', chord(0, 'minor7'), chord(5, 'dominant7')),
    bar('Fmaj7', chord(-5, 'major7')),
    bar('Gm7 C7', chord(-3, 'minor7'), chord(2, 'dominant7')),
    bar('Am7b5', chord(-1, 'halfDiminished')),
    bar('D7(b9)', chord(4, 'dominantFlat9')),
    bar('G7(b13)', chord(-3, 'dominantFlat13')),
    bar('G7(b13)', chord(-3, 'dominantFlat13')),
    bar('Cm7', chord(2, 'minor7')),
    bar('Cm7', chord(2, 'minor7')),
    bar('Ab7(#11)', chord(-2, 'dominantSharp11')),
    bar('Ab7(#11)', chord(-2, 'dominantSharp11')),
    bar('Bbmaj7', chord(0, 'major7')),
    bar('Bbmaj7', chord(0, 'major7')),
    bar('Em7b5', chord(6, 'halfDiminishedLowFifth')),
    bar('A7(b9)', chord(-1, 'dominantFlat9')),
    bar('Dm7b5', chord(4, 'halfDiminished')),
    bar('G7(b9)', chord(-3, 'dominantFlat9')),
    bar('Cm7b5', chord(2, 'halfDiminished')),
    bar('F7(b9)', chord(-5, 'dominantFlat9')),
    bar('Bbmaj7', chord(0, 'major7')),
    bar('Bbmaj7', chord(0, 'major7')),
  ];

  const sequence = bars.flatMap(({chords}) => chords);
  sequence.forEach((current, index) => {
    const next = sequence[index + 1];
    if (!next) return;
    const delta = next.root - current.root;
    // Choose a nearby hex for the exact root movement, including its octave.
    const candidates = [-2, -1, 0, 1, 2]
      .map(r => [(delta - 7 * r) / 2, r])
      .filter(([q]) => Number.isInteger(q));
    candidates.sort(([q, r], [otherQ, otherR]) =>
      (q * q + q * r + r * r) - (otherQ * otherQ + otherQ * otherR + otherR * otherR));
    current.intervalNextRoot = candidates[0];
  });

  return Array.from({length: 8}, (_, index) => {
    const firstBar = index * 4;
    const line = bars.slice(firstBar, firstBar + 4);
    return {
      chords: line.flatMap(({chords}) => chords),
      lyrics: `Bars ${firstBar + 1}–${firstBar + 4}: | ${line.map(({label}) => label).join(' | ')} |`,
    };
  });
};

export default stellaByStarlight;
