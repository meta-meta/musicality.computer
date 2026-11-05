const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const built = esbuild.buildSync({entryPoints:['src/lumatone/practice/polyphonicNotes.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports',built.outputFiles[0].text)(mod,mod.exports);
const tracker=new mod.exports.PolyphonicNoteTracker();
const chord=[40,47,52,56,59,64].map(midi=>({midi,prob:0.8}));
const first=tracker.update(chord,1000,45);
assert.equal(new Set(first.notes.map(note=>note.articulation)).size,1,'Simultaneous chord notes share one articulation');
assert.equal(first.notes.length,6);assert.equal(first.started.length,6);assert.equal(first.time,1000);
const held=tracker.update(chord,1012,45);
assert.equal(held.started.length,0,'A sustained chord must not be rejudged every frame');
assert.deepEqual(held.notes.map(n=>n.articulation),first.notes.map(n=>n.articulation));
tracker.update(chord.filter(n=>n.midi!==64),1024,45);
const repeated=tracker.update(chord,1036,45);
assert.deepEqual(repeated.started.map(n=>n.note),[64]);
assert.notEqual(repeated.started[0].articulation,first.notes[5].articulation);
assert.equal(tracker.update([],1048,45).notes.length,0,'Silence clears all keys');
assert.equal(tracker.update([{midi:NaN,prob:1},{midi:200,prob:1},{midi:60,prob:NaN}],1060,45).notes.length,0);
assert.equal(tracker.update([{midi:35,prob:0.9}],1072,45).started.length,1,'Low seven-string B1 remains available');
console.log('Polyphonic note lifecycle passes: six-note chords, sustained notes, rearticulation, silence, invalid readings and low B1.');
(async()=>{
 const {analyze}=await import('@markusstrasser/pitchplease');
 const rate=48000, seconds=1.3;
 // Decaying harmonics approximate a clean pluck; this is a model smoke test,
 // not an accuracy benchmark for real guitars or microphones.
 const pitches=[40,47,52,56,59,64];
 const audio=Float32Array.from({length:rate*seconds},(_,i)=>{
  const t=i/rate;if(t<0.15)return 0;
  const age=t-0.15;
  return pitches.reduce((sum,n)=>{
   const hz=440*2**((n-69)/12);
   return sum+[1,2,3,4].reduce((v,h)=>v+Math.sin(2*Math.PI*hz*h*age)/h**1.4,0);
  },0)*0.04*Math.exp(-age*1.2)*Math.min(1,age*200);
 });
 const frames=await analyze(audio,rate,{model:'piano'});
 const voiced=frames.filter(frame=>frame.time>0.3&&frame.time<1&&frame.notes.length>=3);
 assert.ok(voiced.length>10,'The installed model must emit multi-note frames');
 const heard=new Set(voiced.flatMap(frame=>frame.notes.map(note=>note.midi)));
 assert.ok(pitches.filter(note=>heard.has(note)).length>=4,'Recognize most of the synthetic E-major pitches');
 assert.ok(frames.every(frame=>frame.emitTime>=frame.time));
 const silence=await analyze(new Float32Array(rate/2),rate,{model:'piano'});
 assert.ok(silence.every(frame=>!frame.notes.length),'Silence should not activate notes');
 console.log(`Installed model smoke test passes: ${frames.length} frames, multi-note E-major pluck, silence and capture/delivery clocks.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
