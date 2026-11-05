const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({entryPoints:['src/lumatone/practice/usePracticeSettings.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const {readPracticeSettings:read,PRACTICE_SETTINGS_KEY:key,defaultPracticeSettings:defaults}=mod.exports;
const historyKey='musicality.practice-history.v1';
const backing=new Map(),storage={getItem:key=>backing.get(key)??null};
assert.deepEqual(read(storage),defaults);
const preferences={bpm:95,loop:false,instrumentId:'flute',concertKey:3,register:-12};
backing.set(key,JSON.stringify(preferences));assert.deepEqual(read(storage),preferences);
backing.set(key,JSON.stringify({bpm:500,loop:'false',instrumentId:'invalid',concertKey:12,register:7}));assert.deepEqual(read(storage),defaults);
for(const bpm of [40,180]) {backing.set(key,JSON.stringify({bpm}));assert.equal(read(storage).bpm,bpm);}
for(const raw of ['null','{']) {backing.set(key,raw);assert.deepEqual(read(storage),defaults);}
assert.deepEqual(read({getItem:()=>{throw new Error('Unavailable');}}),defaults);
function session(id,date,settings={},extra={}) {
 return {id,piece:'openbook-fixture',tonic:2,startedAt:date,updatedAt:date,endedAt:date,
 settings:{bpm:110,transpose:15,keyTranspose:3,instrumentId:'tenor-sax',freeTime:false,allowLowOctaveUp:true,loop:true,loopStart:null,loopEnd:null,latencyMs:0,...settings},
 judgements:[{id:'note',at:date,index:0,cycle:1,note:60,cents:0,errorMs:0,correctPitch:true,freeTime:false,expectedNote:60,location:'Bar 1',start:0,duration:1,latencyMs:0}],...extra};
}
const old=session('old','2026-11-01T10:00:00Z');
const latest=session('latest','2026-11-02T10:00:00Z');
function setHistory(sessions) {backing.set(historyKey,JSON.stringify({format:'musicality.practice-history',version:1,sessions}));}
backing.set(key,JSON.stringify(preferences));
setHistory([latest,old,session('empty','2026-11-03T10:00:00Z',{}, {judgements:[]})]);
const savedHistory=backing.get(historyKey);
assert.deepEqual(read(storage),{bpm:110,loop:false,instrumentId:'tenor-sax',concertKey:5,register:12},'Latest judged session restores absolute key, register, tempo and instrument');
assert.equal(backing.get(historyKey),savedHistory);
const resumed=session('resumed','2026-11-01T11:00:00Z',{bpm:120,transpose:-17,keyTranspose:-5},{updatedAt:'2026-11-02T11:00:00Z'});
setHistory([resumed,latest]);
assert.deepEqual(read(storage),{bpm:120,loop:false,instrumentId:'tenor-sax',concertKey:9,register:-12},'Latest activity and wrapped keys');
setHistory([resumed,session('tie','2026-11-02T11:00:00Z',{bpm:130})]);assert.equal(read(storage).bpm,130);
setHistory([session('legacy','2026-11-02T10:00:00Z',{instrumentId:undefined,transpose:7})]);
assert.equal(read(storage).instrumentId,'flute');assert.equal(read(storage).register,-12);
setHistory([session('unknown','2026-11-02T10:00:00Z',{instrumentId:'future-instrument'})]);assert.equal(read(storage).instrumentId,'flute');
backing.set(key,'{');assert.equal(read(storage).bpm,110,'Malformed preferences do not block history');
backing.set(key,JSON.stringify(preferences));backing.set(historyKey,'{');assert.deepEqual(read(storage),preferences);
setHistory([]);assert.deepEqual(read(storage),preferences);
console.log('Passed practice settings: preferences, latest activity, key/register derivation, legacy instruments and unchanged history.');
