const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const built=esbuild.buildSync({stdin:{contents:`export * from './src/lumatone/practice/transport.ts'; export * from './src/lumatone/practice/monophoneFollower.ts'; export * from './src/lumatone/practice/PracticeHexMap.tsx';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',define:{'import.meta.env.BASE_URL':JSON.stringify('/')},external:['react','react/jsx-runtime','@chakra-ui/react','next-themes','react-icons/lu']});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const api=mod.exports;
for(const entry of [-1,-0.5,0,12.25]) {
 assert.deepEqual(api.countInClicks(entry),[entry-3,entry-2,entry-1]);
 const state=api.createFollower(entry,128,1,10);
 assert.equal(state.beat,entry-3);
 assert.equal(api.tickFollower(state,11,60,null).beat,entry-2);
 assert.equal(api.tickFollower(state,12,60,null).countIn,true);
 assert.equal(api.tickFollower(state,13,60,null).countIn,false);
}
const current={note:64,at:{q:0,r:0},start:0,duration:1,location:'Bar 1'};
const next={...current,note:66,at:{q:1,r:0},start:1};
function render({distance=0.5,practicing=true,target=current,note=next,extendedLowRange=false}={}) {
 return renderToStaticMarkup(React.createElement(api.PracticeHexMap,{target,extendedLowRange,futureAttacks:[{id:'1:1',note,beatsAway:distance,ordinal:1}],progress:0.5,heard:null,transpose:0,mode:'jazz',previewNote:null,practicing,onPlayNote:()=>{}}));
}
assert.ok(render().includes('data-next-note-arrow="true"'),'Adjacent note gets an arrow');
assert.ok(!render({distance:1.1}).includes('data-next-note-arrow="true"'),'No arrow before final beat');
assert.ok(!render({practicing:false}).includes('data-next-note-arrow="true"'),'No animation when paused');
assert.ok(render({note:current}).includes('data-next-note-arrow="true"'),'Repeated pitches get a pointer');
assert.ok(render({target:null}).includes('data-next-note-arrow="true"'));
assert.ok(render().includes('prefers-reduced-motion'));
console.log('Passed three-beat pickup count-in, timed/follower boundaries, adjacent/repeated-note arrows and final-beat visibility.');

const lowB={...current,note:47,at:{q:2,r:-3}};
const lowMap=render({target:lowB,extendedLowRange:true});
assert.ok(lowMap.includes('data-note="47" data-target="true"'),'Guitar low B has a target cell');
const viewBox=lowMap.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
assert.ok(121.5+27<viewBox[1]+viewBox[3],'Low B hex is fully inside the guitar viewport');
console.log('Seven-string low-B target fits inside the extended hex viewport.');

// Tempo change while playing: the playhead keeps its beat and continues at the new tempo.
{
  const transport=mod.exports;
  const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,`${message}: ${a} != ${b}`);
  // 120 BPM (0.5 s per beat): beats 0-8 over 10 s-14 s, then a second pass already queued.
  const first={id:0,time:10,beat:0,entryBeat:0,endBeat:8,endTime:14,pass:1,seconds:0.5};
  const queued={id:1,time:14,beat:0,entryBeat:0,endBeat:8,endTime:18,pass:2,seconds:0.5};
  const before=transport.positionAtTime([first,queued],11.5,0.5);
  const retimed=transport.retimeSegments([first,queued],11.5,1,0.5,2);
  assert.equal(retimed.dropped,1,'The queued pass is dropped for rescheduling');
  assert.equal(retimed.segments.length,2);
  const [cut,slow]=retimed.segments;
  close(cut.endTime,11.5,'The old segment ends at the change');
  assert.equal(cut.endBeat,8,'It still reports the range it belongs to');
  assert.deepEqual([slow.id,slow.pass,slow.entryBeat,slow.endBeat,slow.seconds],[2,1,0,8,1],'Same pass and range, new tempo');
  close(slow.beat,before.beat,'No jump at the change');close(slow.beat,3,'Beat 3');
  close(slow.soundFrom,3,'Notes begun before beat 3 are not restarted');
  close(slow.endTime,16.5,'Five beats remain at one second each');
  close(transport.positionAtTime(retimed.segments,11.49,0.5).beat,2.98,'Before the change, old tempo');
  close(transport.positionAtTime(retimed.segments,12.5,0.5).beat,4,'After the change, new tempo regardless of the fallback');
  close(transport.nextBeatTime(slow,12.2,0.5),12.5,'Next beat follows the segment tempo');
  const again=transport.retimeSegments(retimed.segments,12.5,0.25,1,3);
  close(again.segments[2].beat,4,'A second change continues from the retimed segment');
  close(again.segments[2].endTime,13.5,'Four beats at a quarter second');
  assert.equal(transport.retimeSegments([first],14.2,1,0.5,2),null,'Nothing is playing after the last segment');
  assert.equal(transport.retimeSegments([first],9.5,1,0.5,2),null,'Nor before the first');
  assert.deepEqual(transport.positionAtTime([{...first,seconds:undefined}],11,0.5).beat,2,'Segments without their own tempo use the fallback');
  console.log('Passed live tempo change: continuity, per-segment tempo, repeated changes and edges.');
}
