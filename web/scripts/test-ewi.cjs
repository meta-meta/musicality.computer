const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const built=esbuild.buildSync({stdin:{contents:`export * from './src/lumatone/practice/ewi.ts'; export * from './src/lumatone/practice/PracticeHexMap.tsx';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',define:{'import.meta.env.BASE_URL':JSON.stringify('/')},external:['react','react/jsx-runtime','@chakra-ui/react','next-themes','react-icons/lu']});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const api=mod.exports;
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<0.05,`${message??''} ${actual} != ${expected}`);
const bendBytes=value=>{const raw=Math.round(8192+value*(value<0?8192:8191));return [0xe0,raw&0x7f,raw>>7];};

// Synthetic MIDI messages, not a recording of a real controller.
const ewi=new api.EwiTracker(2);
assert.equal(ewi.reading(),null,'Silent before the first note');
assert.equal(ewi.handle([0x90,72,100]),true,'Note on is an entrance');
close(ewi.reading().breath,100/127,'Attack velocity stands in for breath');
assert.equal(ewi.handle([0xb0,2,64]),false);
close(ewi.reading().breath,64/127,'Breath controller 2');
ewi.handle([0xb0,11,127]);close(ewi.reading().breath,1,'Expression controller 11');
ewi.handle([0xd0,32]);close(ewi.reading().breath,32/127,'Channel pressure');
ewi.handle([0xb0,1,127]);close(ewi.reading().breath,32/127,'Other controllers are ignored');
assert.deepEqual([ewi.reading().note,ewi.reading().pitch.note,ewi.reading().pitch.cents],[72,72,0]);
close(ewi.reading().pitch.frequency,523.2511306,'C5 at A4 = 440 Hz');

// Bend: fingered note stays, sounding pitch moves; the nearest note re-centres past 50 cents.
ewi.handle(bendBytes(0.1));close(ewi.reading().bend,0.2,'±2 semitone range');
assert.equal(ewi.reading().note,72);assert.equal(ewi.reading().pitch.note,72);close(ewi.reading().pitch.cents,20);
ewi.handle(bendBytes(0.5));assert.equal(ewi.reading().note,72);assert.equal(ewi.reading().pitch.note,73);close(ewi.reading().pitch.cents,0);
ewi.handle(bendBytes(-1));close(ewi.reading().bend,-2,'Full downward bend');assert.equal(ewi.reading().pitch.note,70);
ewi.handle(bendBytes(1));close(ewi.reading().bend,2,'Full upward bend');
ewi.handle(bendBytes(0));close(ewi.reading().bend,0);
const wide=new api.EwiTracker(12);wide.handle([0x90,60,90]);wide.handle(bendBytes(1));assert.equal(wide.reading().pitch.note,72,'Configured ±12 range');

// Legato: the new note starts before the old one is released.
assert.equal(ewi.handle([0x91,74,80]),true,'A slurred note on another channel is an entrance');
assert.equal(ewi.reading().note,74);
assert.equal(ewi.handle([0x80,72,0]),false,'Releasing the earlier note is not an entrance');
assert.equal(ewi.reading().note,74);
assert.equal(ewi.handle([0x90,76,70]),true);
assert.equal(ewi.handle([0x90,76,0]),true,'Releasing back to a still-held note sounds it again');
assert.equal(ewi.reading().note,74);
assert.equal(ewi.handle([0x90,74,0]),false,'Velocity-zero note on releases');
assert.equal(ewi.reading(),null);
assert.equal(ewi.articulation,4);
ewi.handle([0x90,60,90]);ewi.handle([0xb0,123,0]);assert.equal(ewi.reading(),null,'All notes off');
ewi.handle([0x90,60,90]);ewi.reset();assert.equal(ewi.reading(),null,'Reset on disconnect');
console.log('Passed EWI notes, legato entrances, breath sources and pitch bend.');

// Hex map: the layout pitch is 64 + 2q + 7r, so +2 semitones is one cell to the right.
const base={futureAttacks:[],progress:0,transpose:0,mode:'jazz',previewNote:null,practicing:false,onPlayNote:()=>{}};
const render=props=>renderToStaticMarkup(React.createElement(api.PracticeHexMap,{...base,...props}));
const mic=render({heard:64,heardCents:10});
assert.ok(mic.includes('data-monophone-indicator')&&!mic.includes('data-wind-indicator'),'Microphone display is unchanged');
const wind=render({heard:64,heardCents:null,heardBreath:0.5,heardBend:2});
assert.ok(wind.includes('data-wind-indicator="true" data-breath="0.5" data-bend="2"'));
assert.ok(!wind.includes('data-monophone-indicator'),'The tuning dot yields to the wind marker');
assert.ok(/data-input-highlight="held"[^>]*><polygon[^>]*><\/polygon><polygon data-midi-note="64"[^>]*stroke="none"/.test(wind),'A wind note is highlighted without an outline');
assert.ok(/data-input-highlight="held"[^>]*><polygon[^>]*><\/polygon><polygon data-midi-note="64"[^>]*stroke="#/.test(mic),'A microphone note keeps its outline');
assert.ok(/data-midi-note="66"[^>]*stroke="#/.test(render({heard:64,heardBreath:0.5,heardBend:0,midiNotes:[66]})),'A held Lumatone key keeps its outline beside a wind note');
const centre=name=>Number(wind.match(new RegExp(`data-wind-indicator[^]*?<circle ${name}="([-\\d.]+)"`))[1]);
close(centre('cx'),Math.sqrt(3)*27,'A two-semitone bend reaches the next cell');
const radius=markup=>Number(markup.match(/data-wind-indicator[^]*?<circle cx="[-\d.]+" r="([-\d.]+)"/)[1]);
assert.ok(radius(render({heard:64,heardBreath:1,heardBend:0}))>radius(render({heard:64,heardBreath:0.1,heardBend:0})),'More breath, larger marker');
assert.ok(!render({heard:null,heardBreath:0.5,heardBend:0}).includes('data-wind-indicator'),'No marker without a note');
console.log('Passed hex-map breath size, bend slide and microphone fallback.');
