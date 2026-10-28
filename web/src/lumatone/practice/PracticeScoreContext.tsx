/* eslint-disable react-refresh/only-export-components */
import {createContext, useContext} from 'react';
import {scoreBeatLabel, stellaScore} from './scores.ts';
import type {PracticeScore} from './scores.ts';

export const PracticeScoreContext = createContext<PracticeScore>(stellaScore);
export function usePracticeScore() {
  const score = useContext(PracticeScoreContext);
  return {score, exercise: score.melody, harmonies: score.chords,
    START: score.start, END: score.end, LENGTH: score.end - score.start,
    beatLabel: (beat: number) => scoreBeatLabel(score, beat)};
}
