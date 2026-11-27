const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({entryPoints:['src/lumatone/practice/historyReview.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const {reviewHistorySession:review,historyRate:rate,historyBarRanges:ranges,reviewHistoryPasses:passes,historyCoverage:coverage}=mod.exports;
const score={id:'fixture',start:-1,end:10,bars:[0,3,8],melody:[-1,0,3,8].map((start,index)=>({start,duration:1,note:60+index})),chords:[]};
const settings={transpose:2,freeTime:false};
const judgement=(index,cycle,correctPitch,errorMs=0,extras={})=>({index,cycle,correctPitch,errorMs,start:score.melody[index].start,duration:1,
  expectedNote:score.melody[index].note+2,at:new Date(Date.UTC(2026,9,28,0,cycle,index)).toISOString(),...extras});
const session={piece:'fixture',settings,judgements:[judgement(0,1,true),judgement(1,1,false,200),judgement(2,1,true,200),judgement(2,2,true),
  judgement(1,1,true,0,{at:'2026-10-28T02:00:00Z'})]};
let result=review(score,session);
assert.deepEqual(result.bars.map(bar=>[bar.label,bar.start,bar.end]),[['Pickup',-1,0],['Bar 1',0,3],['Bar 2',3,8],['Bar 3',8,10]]);
assert.deepEqual(result.total,{attempts:4,pitch:3,timed:4,onTime:2,hits:2});
assert.equal(rate(result.total,'pitch'),.75);assert.equal(rate(result.total,'timing'),.5);assert.equal(rate(result.total,'both'),.5);
assert.equal(result.bars[1].attempts,1,'Correction is not another attempt');
assert.equal(result.bars[2].attempts,2,'Distinct passes remain distinct');
assert.equal(result.bars[2].observed,1,'Coverage counts distinct notes');
assert.equal(rate(result.bars[3],'pitch'),null,'Untouched bar is unknown');
const shuffled=review(score,{...session,judgements:session.judgements.slice().reverse()});
assert.deepEqual(shuffled,result,'Earliest timestamp determines first judgement');
const free=review(score,{...session,settings:{...settings,freeTime:true}});
assert.equal(rate(free.total,'timing'),null);assert.equal(free.total.hits,3);
const explicit=review(score,{...session,judgements:[judgement(1,1,true,300,{freeTime:true}),judgement(2,1,true)]});
assert.equal(explicit.total.timed,1);assert.equal(rate(explicit.total,'timing'),1);
const stale=review(score,{...session,judgements:[judgement(0,1,true,0,{start:4})]});
assert.equal(stale.stale,1);assert.equal(stale.total.attempts,0);
assert.equal(review(score,{...session,piece:'another'}).total.attempts,0);
assert.equal(ranges({...score,start:0})[0].label,'Bar 1');
assert.equal(coverage(result),.75,'Coverage uses distinct notes, not accuracy');
assert.equal(coverage(review(score,{...session,judgements:[]})),0);
const repeated=review(score,{...session,judgements:Array.from({length:100},(_,cycle)=>judgement(0,cycle,true))});
assert.equal(coverage(repeated),.25,'Repeated loop attempts cannot inflate song coverage');
const half=review(score,{...session,judgements:[judgement(0,1,false),judgement(1,1,false)]});
assert.equal(coverage(half),.5,'Exactly half remains visible, even with incorrect notes');
const split=passes(score,session);
assert.deepEqual(split.map(pass=>pass.cycle),[1,2]);
assert.equal(split[0].review.total.attempts,3);
assert.equal(split[1].review.total.attempts,1);
assert.equal(rate(split[0].review.total,'pitch'),2/3);
assert.equal(rate(split[1].review.total,'pitch'),1);
assert.equal(split.reduce((sum,pass)=>sum+pass.review.total.attempts,0),result.total.attempts);
assert.deepEqual(passes(score,{...session,judgements:session.judgements.slice().reverse()}),split);
assert.deepEqual(passes(score,{...session,judgements:[]}),[]);
assert.equal(passes(score,{...session,judgements:[judgement(1,20,true),judgement(1,25,false)]})[1].cycle,25,'Raw transport pass IDs are preserved');
console.log('Passed history map: pickups, variable meter, chronology, corrections, pass counts, partial coverage, free-time gaps, transposition and stale score exclusion.');

// Rows other than bars: saved sections (which may overlap) and single notes.
{
  const sections=[{start:-1,end:3,label:'Opening'},{start:0,end:10,label:'From bar 1'},{start:8,end:10,label:'Ending'}];
  const bySection=review(score,session,sections);
  assert.deepEqual(bySection.bars.map(row=>[row.label,row.attempts,row.pitch,row.observed,row.notes]),
    [['Opening',2,1,2,2],['From bar 1',3,2,2,3],['Ending',0,0,0,1]],'A note counts in every section it starts in');
  assert.deepEqual(bySection.total,result.total,'Totals count each judgement once, however many rows it falls in');
  const notes=score.melody.map(note=>({start:note.start,end:note.start+note.duration,label:`Note ${note.note}`}));
  const byNote=review(score,session,notes);
  assert.deepEqual(byNote.bars.map(row=>[row.attempts,row.pitch,row.onTime]),[[1,1,1],[1,0,0],[2,2,1],[0,0,0]]);
  assert.deepEqual(byNote.bars.map(row=>row.errorSum),[0,200,200,0],'Signed timing error is summed per row');
  assert.equal(mod.exports.historyMeanError(byNote.bars[2]),100,'Two timed first judgements, 200 ms and 0 ms');
  assert.equal(mod.exports.historyMeanError(byNote.bars[3]),null,'Nothing timed, no mean');
  assert.equal(mod.exports.historyMeanError(review(score,{...session,judgements:[judgement(1,1,true,-80)]},notes).bars[1]),-80,'Early is negative');
  const free=review(score,{...session,settings:{...settings,freeTime:true}},notes);
  assert.equal(mod.exports.historyMeanError(free.bars[1]),null,'Free time has no timing');
  assert.deepEqual(passes(score,session,notes).map(pass=>pass.review.bars.map(row=>row.attempts)),[[1,1,1,0],[0,0,1,0]],'Passes use the same rows');
  assert.equal(review(score,session).bars.length,4,'Bars remain the default rows');
  console.log('Passed history rows: overlapping sections, single notes, mean timing and per-pass rows.');
}
