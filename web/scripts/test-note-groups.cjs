const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const built=esbuild.buildSync({stdin:{contents:`export * from './src/lumatone/practice/noteGroups.ts'; export * from './src/lumatone/practice/navigation.ts'; export * from './src/lumatone/practice/PracticeHexMap.tsx';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',define:{'import.meta.env.BASE_URL':JSON.stringify('/')},external:['react','react/jsx-runtime','@chakra-ui/react','next-themes','react-icons/lu']});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const api=mod.exports;

// Synthetic melody: [pitch, duration, beam]; a null pitch is a rest.
function melody(spec) {
 let start=0;const notes=[];
 for(const [note,duration,beam] of spec) {if(note!==null)notes.push({note,start,duration,...(beam?{beam}:{})});start+=duration;}
 return notes;
}
const spans=groups=>groups.map(group=>group.end-group.start+1);

assert.deepEqual(api.melodyGroups(melody([[60,1]]),'off'),[]);

// Written beams: a tied long note that begins a beam, two full groups, a rest
// inside an unfinished beam, and an "end" with no open group.
const beamed=melody([[72,2.25,'begin'],[69,0.25,'continue'],[65,0.25,'continue'],[62,0.25,'end'],
 [67,0.25,'begin'],[64,0.25,'continue'],[60,0.25,'continue'],[57,0.25,'end'],[64,1],
 [65,0.25,'begin'],[null,0.25],[67,0.25,'continue'],[69,0.25,'end'],[71,0.5,'end']]);
assert.equal(api.hasWrittenBeams(beamed),true);
assert.deepEqual(spans(api.melodyGroups(beamed,'beams')),[4,4,1,1,1,1,1],'Beams group begin..end; rests and stray ends do not join');

// No beam data: sub-beat notes sharing a beat are joined; beats and bars divide.
const plain=melody([[60,0.5],[62,0.5],[64,0.5],[65,0.5],[67,1],[69,0.25],[71,0.25],[72,0.25],[74,0.25],[76,0.5],[77,0.5]]);
assert.equal(api.hasWrittenBeams(plain),false);
assert.deepEqual(spans(api.melodyGroups(plain,'beams',[0,4])),[2,2,1,4,2],'Beat fallback joins notes within one beat');

// Contour: three-note descending cells against four-note beams (a hemiola),
// then a long note and a rest as boundaries; a repeated pitch keeps direction.
const hemiola=melody([[85,0.25],[82,0.25],[78,0.25],[87,0.25],[84,0.25],[80,0.25],[85,0.25],[82,0.25],[78,0.25],
 [76,2],[77,0.25],[77,0.25],[79,0.25],[null,0.25],[81,0.5],[83,0.5]]);
assert.deepEqual(spans(api.melodyGroups(hemiola,'contour')),[3,3,4,3,2],'Contour splits at reversals, long notes and rests');
const turn=melody([[60,0.5],[62,0.5],[64,0.5],[62,0.5],[60,0.5]]);
assert.deepEqual(spans(api.melodyGroups(turn,'contour')),[3,2],'The turning note stays with the sweep that reached it');

const groups=api.melodyGroups(beamed,'beams');
assert.deepEqual(api.groupAt(groups,5),{start:4,end:7});
assert.equal(api.groupAt(groups,-1),undefined);
for(const mode of ['beams','contour']) for(const notes of [beamed,plain,hemiola,turn]) {
 const result=api.melodyGroups(notes,mode,[0,4]);
 assert.equal(result[0].start,0);assert.equal(result.at(-1).end,notes.length-1);
 result.forEach((group,index)=>{if(index)assert.equal(group.start,result[index-1].end+1,'Groups cover every note once');});
}
const score={start:0,end:5,melody:beamed};
assert.equal(api.adjacentGroup(0,1,groups,score),3,'Next group start');
assert.equal(api.adjacentGroup(3.5,-1,groups,score),3,'Inside a group, back goes to its start');
assert.equal(api.adjacentGroup(3,-1,groups,score),0);
assert.equal(api.adjacentGroup(0,-1,groups,score),0,'Before the first group: track start');
assert.equal(api.adjacentGroup(beamed.at(-1).start,1,groups,score),5,'After the last group: track end');
assert.equal(api.adjacentGroup(2,1,[],score),2,'No groups: playhead unchanged');
console.log('Passed written-beam, beat-fallback and contour groupings and group navigation.');

// Hex map: the layout pitch is 64 + 2q + 7r.
const at=(q,r,start)=>({note:64+2*q+7*r,at:{q,r},start,duration:0.25,location:'Bar 1'});
const notes=[at(0,0,0),at(2,0,0.25),at(0,0,0.5),at(0,0,0.75),at(-2,1,1)];
function render(group) {
 return renderToStaticMarkup(React.createElement(api.PracticeHexMap,{target:group?group.notes[group.current]:notes[0],group,futureAttacks:[],progress:0,heard:null,transpose:0,mode:'jazz',previewNote:null,practicing:false,onPlayNote:()=>{}}));
}
assert.ok(!render().includes('data-note-group'),'No group layer when grouping is off');
const map=render({notes,current:2});
assert.ok(map.includes('data-note-group="true" data-group-size="5"'));
assert.equal(map.match(/data-group-cell=/g).length,3,'Each distinct cell is outlined once');
assert.equal(map.match(/data-group-move=/g).length,3,'A repeated pitch adds no arrow');
assert.equal(map.match(/data-played="true"/g).length,2,'Moves before the target are dimmed');
const paths=[...map.matchAll(/data-group-move="(\d)"[^>]*><path d="M ([-\d.]+) ([-\d.]+) L/g)].map(match=>({index:match[1],y:Number(match[3])}));
assert.ok(paths[0].y!==paths[1].y,'A retraced move is offset from its opposite');
console.log('Passed hex-map group outlines, arrows, played state and retraced offsets.');
