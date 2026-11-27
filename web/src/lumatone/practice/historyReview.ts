import {TIMING_TOLERANCE} from './exercise.ts';
import type {PracticeSession} from './practiceHistory.ts';
import type {PracticeScore} from './scores.ts';

export type HistoryMetric = 'pitch' | 'timing' | 'both';
// Mean signed timing error of a row in ms, or null when nothing was timed.
export const historyMeanError = (row: {errorSum: number; timed: number}) => row.timed ? row.errorSum / row.timed : null;
export type ReviewCounts = {attempts: number; pitch: number; timed: number; onTime: number; hits: number};
// A row of the history map: a bar, a saved section or a single melody note.
// `errorSum` is the signed timing error in ms summed over the timed first
// judgements, so errorSum / timed is the mean (negative is early).
export type HistoryRange = {start: number; end: number; label: string};
export type HistoryBar = ReviewCounts & HistoryRange & {observed: number; notes: number; errorSum: number};
export type SessionReview = {bars: HistoryBar[]; total: ReviewCounts; stale: number};
const empty = (): ReviewCounts => ({attempts:0,pitch:0,timed:0,onTime:0,hits:0});

export function historyBarRanges(score: PracticeScore) {
  const starts = [...new Set([score.start,...score.bars])].filter(start=>start>=score.start && start<score.end).sort((a,b)=>a-b);
  return starts.map((start,index)=>({start,end:starts[index+1]??score.end,
    label:start<0?'Pickup':`Bar ${score.bars.indexOf(start)+1}`}));
}

// `ranges` are the rows to summarise; bars of the whole piece by default.
// Ranges may overlap (saved sections can), and a note counts in every range it starts in.
export function reviewHistorySession(score: PracticeScore,session: PracticeSession,ranges: HistoryRange[] = historyBarRanges(score)): SessionReview {
  const bars: HistoryBar[] = ranges.map(bar=>({start:bar.start,end:bar.end,label:bar.label,...empty(),observed:0,errorSum:0,
    notes:score.melody.filter(note=>note.start>=bar.start && note.start<bar.end).length}));
  const total=empty(),seen=new Set<string>(),observed=bars.map(()=>new Set<number>());
  let stale=0;
  if (session.piece!==score.id) return {bars,total,stale:session.judgements.length};
  for (const judgement of [...session.judgements].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))) {
    const note=score.melody[judgement.index];
    if (!note || Math.abs(note.start-judgement.start)>1e-6 || Math.abs(note.duration-judgement.duration)>1e-6
      || note.note!==judgement.expectedNote-session.settings.transpose) {stale++;continue;}
    const key=`${judgement.cycle}:${judgement.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rows=bars.filter(bar=>note.start>=bar.start-1e-7 && note.start<bar.end-1e-7);
    if (!rows.length) continue;
    const timed=!(judgement.freeTime??session.settings.freeTime);
    const onTime=timed && Math.abs(judgement.errorMs)<=TIMING_TOLERANCE;
    for (const row of rows) {
      if (timed) row.errorSum+=judgement.errorMs;
      observed[bars.indexOf(row)].add(judgement.index);
    }
    for (const counts of [total,...rows]) {
      counts.attempts++;
      if (judgement.correctPitch) counts.pitch++;
      if (timed) counts.timed++;
      if (onTime) counts.onTime++;
      if (judgement.correctPitch && (!timed || onTime)) counts.hits++;
    }
  }
  bars.forEach((bar,i)=>{bar.observed=observed[i].size;});
  return {bars,total,stale};
}

export function historyMetricCounts(counts: ReviewCounts,metric: HistoryMetric): [number,number] {
  return metric==='pitch'?[counts.pitch,counts.attempts]:metric==='timing'?[counts.onTime,counts.timed]:[counts.hits,counts.attempts];
}

export function historyRate(counts: ReviewCounts,metric: HistoryMetric) {
  const [success,total]=historyMetricCounts(counts,metric);
  return total?success/total:null;
}

export function reviewHistoryPasses(score:PracticeScore,session:PracticeSession,ranges?:HistoryRange[]) {
  const groups=new Map<number,PracticeSession['judgements']>();
  for (const judgement of session.judgements) {
    const group=groups.get(judgement.cycle)??[];
    group.push(judgement);groups.set(judgement.cycle,group);
  }
  return [...groups.entries()].map(([cycle,judgements])=>({cycle,
    startedAt:judgements.reduce((first,item)=>Date.parse(item.at)<Date.parse(first)?item.at:first,judgements[0].at),
    review:reviewHistorySession(score,{...session,judgements},ranges)}))
    .sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt)||a.cycle-b.cycle);
}

export function historyCoverage(review:SessionReview) {
  const notes=review.bars.reduce((sum,bar)=>sum+bar.notes,0);
  const observed=review.bars.reduce((sum,bar)=>sum+bar.observed,0);
  return notes?observed/notes:0;
}
