export type Segment = {id: number; time: number; beat: number; entryBeat: number; endBeat: number; endTime: number; pass: number};

export function positionAtTime(segments: Segment[], time: number, secondsPerBeat: number) {
  let index = segments.length - 1;
  while (index > 0 && segments[index].time > time) index--;
  const segment = segments[index];
  const next = segments[index + 1];
  return {beat: Math.min(segment.endBeat, segment.beat + (time - segment.time) / secondsPerBeat),
    pass: segment.pass, entryBeat: segment.entryBeat, endBeat: segment.endBeat,
    next: next ? {entryBeat: next.entryBeat, endBeat: next.endBeat, pass: next.pass} : null};
}

export function nextBeatTime(segment: Segment, time: number, secondsPerBeat: number) {
  const beat = segment.beat + (time - segment.time) / secondsPerBeat;
  return segment.time + (Math.floor(beat + 1e-7) + 1 - segment.beat) * secondsPerBeat;
}
