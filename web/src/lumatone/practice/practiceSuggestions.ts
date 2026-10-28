import {TIMING_TOLERANCE} from './exercise.ts';
import type {PracticeHistoryData, PracticeSession} from './practiceHistory.ts';
import type {PracticeScore} from './scores.ts';

export type PracticeGoal = 'balanced' | 'polish' | 'challenge' | 'confidence';
export type PracticeFocus = 'both' | 'pitch' | 'timing';
export type LoopSuggestion = {
  start: number; end: number; firstBar: number; lastBar: number;
  kind: 'confidence' | 'polish' | 'challenge' | 'explore';
  tries: number; successes: number; passes: number; failedPasses: number;
  pitchErrors: number; timingErrors: number; observed: number; notes: number;
  accuracy: number;
};
export type LoopSuggestionOptions = {
  goal: PracticeGoal; focus: PracticeFocus; bars: number; recentSessions: number;
  matchSettings: boolean; bpm: number; transpose: number; keyTranspose: number;
  freeTime: boolean; allowLowOctaveUp: boolean;
};
type Sample = {index: number; pass: string; success: boolean; pitchError: boolean; timingError: boolean; at: number};

function comparable(session: PracticeSession, options: LoopSuggestionOptions) {
  const settings = session.settings;
  return !options.matchSettings || (Math.abs(settings.bpm - options.bpm) <= 10
    && settings.transpose === options.transpose && (settings.keyTranspose ?? 0) === options.keyTranspose
    && settings.freeTime === options.freeTime && settings.allowLowOctaveUp === options.allowLowOctaveUp);
}

export function suggestPracticeLoops(score: PracticeScore, history: PracticeHistoryData, options: LoopSuggestionOptions) {
  const sessions = history.sessions.filter(session => session.piece === score.id && session.judgements.length && comparable(session, options))
    .sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0,options.recentSessions);
  const perNote = new Map<number, Sample[]>();
  let stale = 0;
  for (const session of sessions) {
    const seen = new Set<string>();
    // Snapshot metadata prevents a changed score's old note indices being reused.
    for (const judgement of [...session.judgements].sort((a,b) => Date.parse(a.at) - Date.parse(b.at))) {
      const note = score.melody[judgement.index];
      if (!note || Math.abs(note.start - judgement.start) > 1e-6 || Math.abs(note.duration - judgement.duration) > 1e-6
        || note.note !== judgement.expectedNote - session.settings.transpose) {stale++; continue;}
      const key = `${judgement.cycle}:${judgement.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const freeTime = judgement.freeTime ?? session.settings.freeTime;
      if (options.focus === 'timing' && freeTime) continue;
      const pitchError = !judgement.correctPitch;
      const timingError = !freeTime && Math.abs(judgement.errorMs) > TIMING_TOLERANCE;
      const sample = {index: judgement.index, pass: `${session.id}:${judgement.cycle}`, at: Date.parse(judgement.at), pitchError, timingError,
        success: options.focus === 'pitch' ? !pitchError : options.focus === 'timing' ? !timingError : !pitchError && !timingError};
      perNote.set(judgement.index,[...(perNote.get(judgement.index) ?? []),sample]);
    }
  }
  // A long repeat drill cannot swamp all other recent practice for that note.
  const samples = [...perNote.values()].flatMap(items => items.sort((a,b) => b.at-a.at).slice(0,12));
  const candidates: LoopSuggestion[] = [];
  const boundaries = score.bars.length ? score.bars : [Math.max(0,score.start)];
  const length = Math.min(Math.max(1,options.bars),boundaries.length);
  for (let bar=0; bar<=boundaries.length-length; bar++) {
    const start = bar === 0 ? score.start : boundaries[bar];
    const end = boundaries[bar+length] ?? score.end;
    const notes = score.melody.filter(note => note.start >= start-1e-6 && note.start < end-1e-6).length;
    const attempts = samples.filter(sample => score.melody[sample.index].start >= start-1e-6 && score.melody[sample.index].start < end-1e-6);
    const passes = new Set(attempts.map(sample => sample.pass)).size;
    if (passes < 2 || !attempts.length || !notes) continue;
    const successes = attempts.filter(sample => sample.success).length;
    const accuracy = successes/attempts.length;
    const failedPasses = new Set(attempts.filter(sample => !sample.success).map(sample => sample.pass)).size;
    const observed = new Set(attempts.map(sample => sample.index)).size;
    const supported = observed/notes >= .5;
    const kind = supported && accuracy >= .85 ? 'confidence' : supported && accuracy >= .65 ? 'polish' : failedPasses >= 3 && accuracy < .65 ? 'challenge' : 'explore';
    candidates.push({start,end,firstBar:bar+1,lastBar:bar+length,kind,tries:attempts.length,successes,passes,failedPasses,
      pitchErrors:attempts.filter(sample => sample.pitchError).length,timingErrors:attempts.filter(sample => sample.timingError).length,
      observed,notes,accuracy});
  }
  const selected: LoopSuggestion[] = [];
  const add = (items: LoopSuggestion[]) => {
    for (const item of items) {
      if (selected.length>=3) break;
      if (!selected.some(other => item.start < other.end && item.end > other.start)) selected.push(item);
    }
  };
  const ranked = (kind: LoopSuggestion['kind']) => candidates.filter(item => kind==='polish'
    ? item.observed/item.notes >= .5 && item.accuracy >= .65 && item.accuracy < 1 : kind==='challenge'
      ? item.failedPasses>=3 && item.accuracy<.65 : item.kind===kind)
    .sort((a,b) => {
      const score = (item: LoopSuggestion) => kind==='confidence' ? item.accuracy : kind==='polish'
        ? 1-Math.abs(item.accuracy-.8) : kind==='challenge' ? 1-item.accuracy : item.tries;
      return score(b)-score(a) || b.observed/b.notes-a.observed/a.notes || b.passes-a.passes || a.start-b.start;
    });
  if (options.goal==='balanced') {
    for (const kind of ['confidence','polish','challenge'] as const) {
      const item = ranked(kind).find(item => !selected.some(other => item.start < other.end && item.end > other.start));
      if (item) selected.push({...item,kind});
    }
    add(ranked('explore'));
  } else add(ranked(options.goal).map(item => ({...item,kind:options.goal as LoopSuggestion['kind']})));
  return {suggestions:selected,sessions:sessions.length,samples:samples.length,stale};
}
