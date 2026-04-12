import type {LumatoneLyricsAndChordsGroup} from '../lumatoneTypes.ts';

export function annotateChordTransitions(groups: LumatoneLyricsAndChordsGroup[]) : LumatoneLyricsAndChordsGroup[] {
  let prevChordIntervals: number[][] = [];
  let prevChordIntervalNextRoot = [0, 0];

  return groups.map(({chords, lyrics}) => {
    const annotatedChords = chords.map((chord) => {
      const {intervalNextRoot = [0, 0], intervals} = chord;
      const [q, r] = prevChordIntervalNextRoot;

      const annotated = {
        ...chord,
        fromRootInterval: [-q, -r],
        fromIntervals: prevChordIntervals,
      };

      prevChordIntervalNextRoot = intervalNextRoot;
      prevChordIntervals = intervals;

      return annotated;
    });

    return {
      chords: annotatedChords,
      lyrics,
    };
  });
}
