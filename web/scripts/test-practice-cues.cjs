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
