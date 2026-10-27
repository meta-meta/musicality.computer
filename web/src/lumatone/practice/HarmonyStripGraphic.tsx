import {memo, useMemo} from 'react';
import {LumatoneChordCard} from '../chords/LumatoneChordCard.tsx';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {LumatoneChordData} from '../lumatoneTypes.ts';
import type {PracticeChord} from './exercise.ts';

export const HarmonyStripGraphic = memo(function HarmonyStripGraphic({chord, previous, mode, commonNotes, guideNotes}: {
  chord: PracticeChord; previous?: PracticeChord; mode: LabelMode;
  commonNotes?: readonly number[]; guideNotes?: readonly number[];
}) {
  const data = useMemo<LumatoneChordData>(() => {
    const root = chord.notes.find(note => note.root)!;
    const from = previous?.notes.find(note => note.root);
    return {
      root: root.note,
      intervals: chord.notes.filter(note => !note.root).map(note => [note.at.q - root.at.q, note.at.r - root.at.r]),
      fromRootInterval: from ? [from.at.q - root.at.q, from.at.r - root.at.r] : undefined,
      fromIntervals: from ? previous!.notes.filter(note => !note.root).map(note => [note.at.q - from.at.q, note.at.r - from.at.r]) : undefined,
    };
  }, [chord, previous]);
  return <LumatoneChordCard chordData={data} diagramOnly labelMode={mode} commonNotes={commonNotes} guideNotes={guideNotes}/>;
});
