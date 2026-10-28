import {exercise, matchesPracticePitch} from './exercise.ts';

export type FollowState = {
  melody?: typeof exercise;
  beat: number; pass: number; entryBeat: number; endBeat: number;
  index: number; waiting: boolean; countIn: boolean; finished: boolean;
  anchorBeat: number; anchorTime: number;
  acceptedArticulation: number | null;
};

const nextIndex = (from: number, end: number, melody = exercise) => melody.findIndex(note =>
  note.start + note.duration > from + 1e-7 && note.start < end - 1e-7);

// Time is in seconds. The pending attack is a gate: the clock cannot pass it
// until a matching pitch opens it. One articulation can only open one gate.
export function createFollower(from: number, end: number, pass: number, time: number, countIn = 4, melody = exercise): FollowState {
  const index = nextIndex(from, end, melody);
  return {melody, beat: from - countIn, pass, entryBeat: from, endBeat: end, index,
    waiting: countIn === 0 && index >= 0 && melody[index].start <= from,
    countIn: countIn > 0, finished: false, anchorBeat: from - countIn, anchorTime: time, acceptedArticulation: null};
}

export function tickFollower(state: FollowState, time: number, bpm: number,
  loop: {start: number; end: number} | null): FollowState {
  if (state.waiting || state.finished) return state;
  const beat = state.anchorBeat + Math.max(0, time - state.anchorTime) * bpm / 60;
  const gate = state.index >= 0 ? Math.max(state.entryBeat, (state.melody ?? exercise)[state.index].start) : state.endBeat;
  if (beat < gate - 1e-7) return {...state, beat, countIn: beat < state.entryBeat - 1e-7};
  if (state.index >= 0) return {...state, beat: gate, countIn: false, waiting: true};
  if (loop) return {...createFollower(loop.start, loop.end, state.pass + 1, time, 0, state.melody), acceptedArticulation: state.acceptedArticulation};
  return {...state, beat: state.endBeat, countIn: false, finished: true};
}

export function followEntrance(state: FollowState, note: number, cents: number, transpose: number, time: number,
  allowLowOctaveUp = false, articulation?: number) {
  if (state.countIn || state.finished || state.index < 0 || (articulation !== undefined && articulation === state.acceptedArticulation)) return null;
  const index = state.index;
  const melody = state.melody ?? exercise;
  const target = melody[index];
  const correctPitch = matchesPracticePitch(target.note + transpose, note, cents, allowLowOctaveUp);
  const attempt = {index, cycle: state.pass, note, cents, errorMs: 0, correctPitch, freeTime: true};
  if (!correctPitch) return {state, attempt};
  const beat = Math.max(state.beat, target.start, state.entryBeat);
  const next = melody.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.start < state.endBeat - 1e-7);
  return {state: {...state, beat, index: next, waiting: false, anchorBeat: beat, anchorTime: time,
    acceptedArticulation: articulation ?? null}, attempt};
}
