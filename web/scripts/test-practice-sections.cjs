const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const built=esbuild.buildSync({stdin:{contents:`export * from './src/lumatone/practice/practiceSections.ts'; export * from './src/lumatone/practice/useSavedState.ts'; export * from './src/lumatone/practice/PracticeHexMap.tsx'; export {SectionPathGraphic} from './src/lumatone/practice/PracticeSections.tsx'; export {looksLikeWindController} from './src/lumatone/practice/ewi.ts'; export {practiceInstrument} from './src/lumatone/practice/instruments.ts'; export {spreadOverlappingMoves} from './src/lumatone/practice/arrowLanes.ts';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',define:{'import.meta.env.BASE_URL':JSON.stringify('/')},external:['react','react/jsx-runtime','@chakra-ui/react','next-themes','react-icons/lu']});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const api=mod.exports;
const store=()=>{const backing=new Map();return {backing,getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,value)};};

// Layout pitch is 64 + 2q + 7r. A four-note figure with a return to the first cell.
const note=(q,r,start,duration=1)=>({note:64+2*q+7*r,at:{q,r},start,duration,location:`Beat ${start}`});
const melody=[note(0,0,0),note(1,0,1),note(0,1,2,0.5),note(1,0,2.5,0.5),note(0,0,3),note(2,0,4,2)];
const bounds={start:0,end:8};

// Sections: notes that begin inside the range.
assert.deepEqual(api.sectionNotes(melody,1,3),{first:1,notes:melody.slice(1,4)});
assert.equal(api.sectionNotes(melody,0.5,1).notes.length,0,'A note held into the range is not part of it');
assert.equal(api.sectionNotes(melody,4,8).notes.length,1);
assert.deepEqual(api.sectionNotes(melody,7,8),{first:-1,notes:[]});

// Loop lane: points snap to bar lines and note boundaries, in either drag direction.
const points=api.loopSnapPoints(melody,[0,4],bounds);
assert.deepEqual(points,[0,1,2,2.5,3,4,6,8]);
assert.equal(api.snapLoopBeat(2.3,points),2.5);
assert.deepEqual(api.dragLoopRange(2.9,1.2,points),{start:1,end:3},'Dragging right to left');
assert.equal(api.dragLoopRange(1.1,0.9,points),null,'No range until the ends differ');
assert.deepEqual(api.dragLoopRange(-5,50,points),{start:0,end:8});

// Storage is per tune and survives damaged or outdated entries.
const storage=store();
assert.deepEqual(api.readScoreSections(storage,'tune',bounds),{loopStart:null,loopEnd:null,selected:null,sections:[]});
const sections=[{id:'a',name:'Turnaround',start:1,end:3},{id:'b',name:'Section 2',start:4,end:8}];
api.writeScoreSections(storage,'tune',{loopStart:2,loopEnd:6,selected:null,sections});
api.writeScoreSections(storage,'other',{loopStart:1,loopEnd:null,selected:null,sections:[]});
assert.deepEqual(api.readScoreSections(storage,'tune',bounds),{loopStart:2,loopEnd:6,selected:null,sections});
assert.equal(api.readScoreSections(storage,'other',bounds).loopStart,1,'Each tune keeps its own loop');
api.writeScoreSections(storage,'tune',{loopStart:2,loopEnd:6,selected:'a',sections});
assert.deepEqual(api.readScoreSections(storage,'tune',bounds),{loopStart:1,loopEnd:3,selected:'a',sections},'A selected section owns the loop points');
storage.backing.set(api.SECTIONS_KEY,JSON.stringify({tune:{loopStart:6,loopEnd:2,selected:'gone',sections:[{id:'a',name:'',start:1,end:3},{id:'a',name:'Duplicate',start:1,end:2},{id:'c',name:'Reversed',start:5,end:4},{id:'d',name:'Outside',start:1,end:99},null]}}));
assert.deepEqual(api.readScoreSections(storage,'tune',bounds),{loopStart:6,loopEnd:null,selected:null,sections:[{id:'a',name:'Section',start:1,end:3}]});
for(const raw of ['{','null','[]'])storage.backing.set(api.SECTIONS_KEY,raw),assert.equal(api.readScoreSections(storage,'tune',bounds).sections.length,0);
api.writeScoreSections(storage,'tune',{loopStart:null,loopEnd:null,selected:null,sections:[]});
assert.equal(storage.backing.get(api.SECTIONS_KEY),'{}','Nothing to keep leaves no entry');
assert.equal(api.nextSectionName(sections),'Section 3');
assert.equal(api.nextSectionName([{id:'x',name:'Section 2',start:0,end:1}]),'Section 3');
console.log('Passed sections: range membership, loop snapping, per-tune storage and damaged entries.');

// Saved view preferences.
const view=store();
assert.equal(api.savedValue(view,'guide',true,api.isBoolean),true);
view.backing.set(api.PRACTICE_VIEW_KEY,JSON.stringify({guide:false,lookahead:12,labels:'jazz',analysis:{a:true},tune:'missing'}));
assert.equal(api.savedValue(view,'guide',true,api.isBoolean),false);
assert.equal(api.savedValue(view,'lookahead',3,api.numberBetween(0,8,true)),3,'Out-of-range values fall back');
assert.equal(api.savedValue(view,'labels','dozenal',api.oneOf('dozenal','jazz')),'jazz');
assert.deepEqual(api.savedValue(view,'analysis',{a:false,b:false},api.booleanRecord(['a','b'])),{a:false,b:false},'A record missing a key falls back');
view.backing.set(api.PRACTICE_VIEW_KEY,'{');assert.equal(api.savedValue(view,'guide',true,api.isBoolean),true);
console.log('Passed saved view preferences: valid values, fallbacks and unreadable storage.');

// EWI as an instrument, and the port-name guess used to preselect EWI In.
assert.equal(api.practiceInstrument('ewi').id,'ewi');assert.equal(api.practiceInstrument('ewi').soundingOffset,0);
for(const name of ['EWI5000','Akai EWI USB','Aerophone AE-30','NuRAD','Sylphyo','Travel Sax 2','WX5','YDS-150'])assert.ok(api.looksLikeWindController(name),name);
for(const name of ['Lumatone','loopMIDI Port','Launchkey Mini','Windows MIDI Mapper','Rewire'])assert.ok(!api.looksLikeWindController(name),name);

// Section card: one hexagon per distinct cell, one arrow per move.
const card=renderToStaticMarkup(React.createElement(api.SectionPathGraphic,{notes:melody.slice(0,5),transpose:0,id:'t'}));
assert.equal((card.match(/data-section-cell=/g)??[]).length,3);
assert.equal((card.match(/data-section-move=/g)??[]).length,4);
assert.ok(card.includes('data-section-path="5"'));
// Arrows are colored in order: the hue wheel in as many steps as there are arrows.
const moveColors=markup=>[...markup.matchAll(/data-move-color="(#[0-9a-f]{6})"/g)].map(match=>match[1]);
const Color=require('colorjs.io').default;
const hsl=moveColors(card).map(hex=>new Color(hex).to('okhsl').coords);
assert.equal(new Set(moveColors(card)).size,4,'Each arrow has its own color');
hsl.forEach(([hue,saturation,lightness],index)=>{
  assert.ok(Math.abs(((hue-90*index+540)%360)-180)<3,`Arrow ${index} hue ${hue}`);
  assert.ok(saturation>0.4&&saturation<0.7&&lightness>0.7,`Light and mid-saturated: ${saturation}, ${lightness}`);
});
assert.ok(!renderToStaticMarkup(React.createElement(api.SectionPathGraphic,{notes:[],transpose:0,id:'t'})).includes('<svg'),'An empty section draws nothing');

// Board: a selected section dims every other cell but never a played or held one.
const base={futureAttacks:[],progress:0,transpose:0,mode:'jazz',previewNote:null,practicing:false,onPlayNote:()=>{},heard:null};
const render=props=>renderToStaticMarkup(React.createElement(api.PracticeHexMap,{...base,...props}));
const group={notes:melody.slice(0,5),current:0};
const cell=(markup,noteNumber)=>[...markup.matchAll(new RegExp(`<g transform="[^"]*"( opacity="[\\d.]+")?( data-dimmed="true")? data-note="${noteNumber}"[^>]*>`,'g'))].map(match=>match[0]);
const plain=render({group});
assert.ok(!plain.includes('data-dimmed'),'A note group alone dims nothing');
const board=render({group,dimOutsideGroup:true});
assert.equal((plain.match(/data-group-cell=/g)??[]).length,3,'A note group outlines its cells');
assert.equal((board.match(/data-group-cell=/g)??[]).length,0,'A section does not: its cells already stand out');
assert.equal((board.match(/data-group-move=/g)??[]).length,4);
assert.deepEqual(moveColors(board),moveColors(card),'The board and the card use the same order colors');
const total=(board.match(/class="practice-hex"/g)??[]).length, dimmed=(board.match(/data-dimmed="true"/g)??[]).length;
assert.ok(total-dimmed>=3&&total-dimmed<total/2,`Only section cells stay bright (${total-dimmed} of ${total})`);
assert.ok(cell(board,64).some(tag=>!tag.includes('data-dimmed')),'Section cell stays bright');
assert.ok(cell(board,78).every(tag=>tag.includes('data-dimmed')),'Cell outside the section is dimmed');
const played=render({group,dimOutsideGroup:true,heard:78,midiNotes:[80]});
assert.ok(cell(played,78).some(tag=>tag.includes('data-heard')&&!tag.includes('data-dimmed')),'A played note outside the section is still shown');
assert.ok(cell(played,80).some(tag=>!tag.includes('data-dimmed')),'A held MIDI note is not dimmed');
const inSection=render({group,dimOutsideGroup:true,heard:66});
assert.equal((inSection.match(/data-heard="true"/g)??[]).length,1);
assert.ok(/<g transform="translate\(46\.7[^"]*,0\)"[^>]*data-heard="true"/.test(inSection),'A played section pitch lights the section cell');
assert.ok(!render({dimOutsideGroup:true}).includes('data-dimmed'),'No section, no dimming');
console.log('Passed EWI instrument, section cards and free-play dimming on the board.');

// Arrows that would be drawn over one another are spread into parallel lanes.
const P=(x,y)=>({x,y}), move=(from,to)=>({from,to});
const spread=(moves,spacing=8,max=32)=>api.spreadOverlappingMoves(moves,spacing,max).map(shift=>[Math.round(shift.x*100)/100+0,Math.round(shift.y*100)/100+0]);
assert.deepEqual(spread([move(P(0,0),P(10,0)),move(P(10,0),P(20,0)),move(P(0,0),P(0,10))]),[[0,0],[0,0],[0,0]],'Arrows that only touch or cross stay put');
assert.deepEqual(spread([move(P(0,0),P(10,0)),move(P(10,0),P(0,0))]),[[0,-4],[0,4]],'A retraced move');
assert.deepEqual(spread([move(P(0,0),P(10,0)),move(P(0,0),P(10,0)),move(P(10,0),P(0,0))]),[[0,-8],[0,0],[0,8]],'A repeated move gets its own lane too');
assert.deepEqual(spread([move(P(0,0),P(20,0)),move(P(10,0),P(30,0)),move(P(40,0),P(50,0))]),[[0,-4],[0,4],[0,0]],'A partial overlap along the same line');
assert.deepEqual(spread([move(P(0,0),P(10,0)),move(P(20,0),P(30,0)),move(P(0,0),P(30,0))]),[[0,-4],[0,-4],[0,4]],'Lanes are reused where arrows do not overlap');
assert.deepEqual(spread([move(P(0,0),P(10,0)),move(P(0,5),P(10,5))]),[[0,0],[0,0]],'Parallel arrows on different lines are already apart');
const many=spread(Array.from({length:9},()=>move(P(0,0),P(0,10))));
assert.deepEqual([many[0],many[8]],[[16,0],[-16,0]],'Many arrows on one line are squeezed into the allowed width');
assert.equal(new Set(many.map(String)).size,9);
const diagonal=spread([move(P(0,0),P(30,40)),move(P(30,40),P(0,0))],10);
assert.deepEqual(diagonal,[[4,-3],[-4,3]],'Shifts are perpendicular to the arrows');
const repeated=[note(0,0,0),note(1,0,1),note(0,0,2),note(1,0,3),note(0,0,4)];
const starts=markup=>[...markup.matchAll(/data-(?:group|section)-move="\d+"[^>]*><path d="M ([-\d.]+) ([-\d.]+) L/g)].map(match=>match[2]);
assert.equal(new Set(starts(render({group:{notes:repeated,current:0}}))).size,4,'Four moves between two cells are all visible on the board');
assert.equal(new Set(starts(renderToStaticMarkup(React.createElement(api.SectionPathGraphic,{notes:repeated,transpose:0,id:'t'})))).size,4,'and on the card');
console.log('Passed arrow spreading: retraced, repeated and partially overlapping moves, squeezing, and crossing arrows left alone.');

// Left/right step along the cards and stop at the ends.
assert.equal(api.adjacentSection(sections,'a',1),sections[1]);assert.equal(api.adjacentSection(sections,'b',-1),sections[0]);
assert.equal(api.adjacentSection(sections,'b',1),null);assert.equal(api.adjacentSection(sections,'a',-1),null);assert.equal(api.adjacentSection(sections,null,1),null);
// The line ends at the base of the arrowhead, short of the tip.
const arrow=render({group:{notes:[note(0,0,0),note(2,0,1)],current:0}}).match(/data-group-move="0"[^>]*><path d="M ([-\d.]+) [^ "]+ L ([-\d.]+) [^ "]+"[^>]*><\/path><path data-group-head="true" d="M ([-\d.]+) /);
assert.ok(Number(arrow[1])<Number(arrow[2])&&Number(arrow[3])-Number(arrow[2])>=5.4,`Line ${arrow[2]} stops before tip ${arrow[3]}`);
console.log('Passed section stepping and arrowhead geometry.');
