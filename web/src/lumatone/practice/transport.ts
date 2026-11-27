export const COUNT_IN_BEATS = 3;
export const countInClicks = (entryBeat: number) => Array.from({length: COUNT_IN_BEATS}, (_, index) => entryBeat - COUNT_IN_BEATS + index);

// `seconds` is this segment's seconds per beat; a tempo change during playback
// starts a new segment at the same beat. `soundFrom` marks such a continuation:
// notes that began before that beat are already sounding and are not restarted.
export type Segment = {id: number; time: number; beat: number; entryBeat: number; endBeat: number; endTime: number; pass: number; seconds?: number; soundFrom?: number};

export function positionAtTime(segments: Segment[], time: number, secondsPerBeat: number) {
  let index = segments.length - 1;
  while (index > 0 && segments[index].time > time) index--;
  const segment = segments[index];
  const next = segments[index + 1];
  return {beat: Math.min(segment.endBeat, segment.beat + (time - segment.time) / (segment.seconds ?? secondsPerBeat)),
    pass: segment.pass, entryBeat: segment.entryBeat, endBeat: segment.endBeat,
    next: next ? {entryBeat: next.entryBeat, endBeat: next.endBeat, pass: next.pass} : null};
}

export function nextBeatTime(segment: Segment, time: number, secondsPerBeat: number) {
  const seconds = segment.seconds ?? secondsPerBeat;
  const beat = segment.beat + (time - segment.time) / seconds;
  return segment.time + (Math.floor(beat + 1e-7) + 1 - segment.beat) * seconds;
}

// Change tempo at `time` without moving the playhead: the segment playing then
// is cut there and continues, from the same beat, at the new tempo. Segments
// already queued after it are dropped (the caller reschedules them); the number
// dropped is returned. Returns null when nothing is playing at `time`.
export function retimeSegments(segments: Segment[], time: number, secondsPerBeat: number, fallbackSeconds: number, nextId: number): {segments: Segment[]; dropped: number} | null {
  let index = segments.length - 1;
  while (index > 0 && segments[index].time > time) index--;
  const segment = segments[index];
  if (!segment || time <= segment.time || time >= segment.endTime) return null;
  const beat = segment.beat + (time - segment.time) / (segment.seconds ?? fallbackSeconds);
  const kept = segments.slice(0, index);
  kept.push({...segment, endTime: time}, {...segment, id: nextId, time, beat, endTime: time + (segment.endBeat - beat) * secondsPerBeat, seconds: secondsPerBeat, soundFrom: beat});
  return {segments: kept, dropped: segments.length - 1 - index};
}
