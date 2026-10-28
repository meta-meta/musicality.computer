const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const result = esbuild.buildSync({entryPoints:['src/lumatone/practice/practiceSuggestions.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod = {exports:{}};
new Function('module','exports','require',result.outputFiles[0].text)(mod,mod.exports,require);
const {suggestPracticeLoops:suggest} = mod.exports;
const score = {id:'fixture',title:'Fixture',composer:'Test',tonic:0,quality:'major',start:-1,end:32,
  bars:[0,4,8,12,16,20,24,28],chords:[],melody:Array.from({length:8},(_,i)=>({note:60+i,start:i*4,duration:1,at:{q:0,r:0},location:`Bar ${i+1}`}))};
const settings = {bpm:80,transpose:0,keyTranspose:0,freeTime:false,allowLowOctaveUp:true,loop:true,loopStart:null,loopEnd:null,latencyMs:0};
const options = {...settings,goal:'balanced',focus:'pitch',bars:1,recentSessions:5,matchSettings:true};
const judgement = (index,cycle,correctPitch=true,extras={}) => ({index,cycle,correctPitch,note:60+index,cents:0,errorMs:0,
  id:`${index}-${cycle}`,at:new Date(Date.UTC(2026,9,28,0,cycle,index)).toISOString(),expectedNote:60+index,
  start:index*4,duration:1,location:`Bar ${index+1}`,latencyMs:0,...extras});
const session = {id:'session',piece:'fixture',startedAt:'2026-10-28T00:00:00Z',updatedAt:'2026-10-28T01:00:00Z',endedAt:null,settings,
  judgements:Array.from({length:4},(_,cycle)=>score.melody.map((_,index)=>judgement(index,cycle,index===2 ? cycle>0 : index!==5))).flat()};
const history={sessions:[session]};
let resultSet=suggest(score,history,options);
assert.deepEqual(resultSet.suggestions.map(item=>item.kind),['confidence','polish','challenge']);
assert.equal(resultSet.suggestions[0].start,-1,'First bar preserves pickup');
assert.equal(resultSet.suggestions[1].firstBar,3);
assert.equal(resultSet.suggestions[2].firstBar,6);
assert.equal(resultSet.suggestions[2].failedPasses,4);
assert.equal(suggest(score,{sessions:[]},options).suggestions.length,0);
assert.equal(suggest(score,{sessions:[{...session,piece:'another'}]},options).sessions,0);
const noise={...session,judgements:[...session.judgements,...Array.from({length:200},(_,i)=>judgement(5,0,true,{id:`noise-${i}`,at:'2026-10-28T02:00:00Z'}))]};
assert.deepEqual(suggest(score,{sessions:[noise]},options).suggestions,resultSet.suggestions,'Corrections/detector samples do not add tries');
assert.equal(suggest(score,{sessions:[{...session,judgements:session.judgements.filter(a=>a.cycle===0)}]},options).suggestions.length,0,'One pass is not recurring evidence');
assert.equal(suggest(score,{sessions:[{...session,settings:{...settings,transpose:2}}]},options).samples,0);
assert.equal(suggest(score,{sessions:[{...session,settings:{...settings,bpm:120}}]},options).samples,0);
assert.equal(suggest(score,{sessions:[{...session,settings:{...settings,bpm:120}}]},{...options,matchSettings:false}).samples,32);
const free={...session,settings:{...settings,freeTime:true},judgements:session.judgements.map(a=>({...a,freeTime:true,errorMs:300}))};
assert.equal(suggest(score,{sessions:[free]},{...options,freeTime:true,focus:'timing'}).samples,0);
assert.deepEqual(suggest(score,{sessions:[free]},{...options,freeTime:true}).suggestions,resultSet.suggestions);
const timing={...session,judgements:session.judgements.map(a=>({...a,correctPitch:true,errorMs:a.index===5?250:0}))};
assert.equal(suggest(score,{sessions:[timing]},{...options,focus:'timing',goal:'challenge'}).suggestions[0].firstBar,6);
assert.equal(suggest(score,{sessions:[timing]},{...options,focus:'pitch',goal:'challenge'}).suggestions.length,0);
const changed={...session,judgements:session.judgements.map(a=>({...a,start:a.start+.5}))};
assert.equal(suggest(score,{sessions:[changed]},options).samples,0);
assert.equal(suggest(score,{sessions:[changed]},options).stale,32);
const many={...session,judgements:Array.from({length:50},(_,cycle)=>judgement(5,cycle,false))};
assert.equal(suggest(score,{sessions:[many]},options).samples,12);
const odd={...score,bars:[0,3,8],end:10,melody:score.melody.slice(0,3).map((n,i)=>({...n,start:[0,3,8][i]}))};
const oddSession={...session,judgements:Array.from({length:3},(_,cycle)=>odd.melody.map((n,index)=>judgement(index,cycle,false,{start:n.start}))).flat()};
assert.ok(suggest(odd,{sessions:[oddSession]},{...options,goal:'challenge'}).suggestions.some(item=>item.start===8&&item.end===10),'Variable meter/final boundary');
const two=suggest(score,history,{...options,bars:2}).suggestions;
assert.ok(two.every((a,i)=>two.slice(i+1).every(b=>a.end<=b.start||b.end<=a.start)),'Suggested loops do not overlap');
console.log('Passed practice suggestions: goals, deduplication, evidence, settings, timing/free-time, score changes, pickups, variable meter, and non-overlap.');
