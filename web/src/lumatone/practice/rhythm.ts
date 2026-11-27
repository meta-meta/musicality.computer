export type RhythmValue = {beats: number; triplet?: boolean};

// Keep ties at bar lines, rather than depicting every long duration as one
// oversized value. Triplet quarter notes each occupy two thirds of a beat.
export function rhythmValues(start: number, duration: number): RhythmValue[] {
  if (Math.abs(duration - 2 / 3) < 1e-6) return [{beats: 1, triplet: true}];
  const result: RhythmValue[] = [];
  let position = start, remaining = duration;
  while (remaining > 1e-6) {
    const barEnd = (Math.floor((position + 1e-7) / 4) + 1) * 4;
    const available = Math.min(remaining, barEnd - position);
    const value = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25].find(beats => beats <= available + 1e-6);
    if (value === undefined) break;
    result.push({beats: value});
    remaining -= value;
    position += value;
  }
  return result;
}

// The silences in a melody: every stretch of the tune with no note sounding,
// including before the first note and after the last. A gap too short to write
// as a sixteenth rest is ignored.
export function melodyRests(melody: {start: number; duration: number}[], start: number, end: number): {start: number; duration: number}[] {
  const rests: {start: number; duration: number}[] = [];
  let position = start;
  for (const note of [...melody].sort((a, b) => a.start - b.start)) {
    if (note.start - position >= 0.25 - 1e-6) rests.push({start: position, duration: note.start - position});
    position = Math.max(position, note.start + note.duration);
  }
  if (end - position >= 0.25 - 1e-6) rests.push({start: position, duration: end - position});
  return rests;
}
