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
