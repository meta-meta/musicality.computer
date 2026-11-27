const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({entryPoints:['src/lumatone/practice/rhythm.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const {melodyRests:rests,rhythmValues:values}=mod.exports;
const note=(start,duration)=>({start,duration});
assert.deepEqual(rests([note(1,1),note(2,0.5),note(4,2)],0,8),[{start:0,duration:1},{start:2.5,duration:1.5},{start:6,duration:2}],'Before, between and after the notes');
assert.deepEqual(rests([note(0,4),note(4,4)],0,8),[],'A melody with no gaps has no rests');
assert.deepEqual(rests([],0,4),[{start:0,duration:4}],'An empty range is one rest');
assert.deepEqual(rests([note(0,1),note(1.1,1)],0,2.1),[],'A gap shorter than a sixteenth is ignored');
assert.deepEqual(rests([note(2,1),note(0,1)],0,3),[{start:1,duration:1}],'Order of the notes does not matter');
assert.deepEqual(rests([note(0,3),note(1,1)],0,4),[{start:3,duration:1}],'An overlapping note does not open a rest');
assert.deepEqual(rests([note(0,1)],-1,1),[{start:-1,duration:1}],'A pickup bar');
// How a rest is written: split at bar lines, largest values first.
assert.deepEqual(values(2.5,1.5).map(value=>value.beats),[1.5],'A dotted quarter rest');
assert.deepEqual(values(3,3).map(value=>value.beats),[1,2],'Across a bar line: a quarter, then a half');
assert.deepEqual(values(0,8).map(value=>value.beats),[4,4],'Two whole bars');
console.log('Passed melody rests: gaps, short gaps, overlaps, pickups and how they are written.');
