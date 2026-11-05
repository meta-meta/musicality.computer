const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const built = esbuild.buildSync({entryPoints:['src/lumatone/practice/pitch.ts'], bundle:true, write:false, format:'cjs', platform:'node'});
const mod = {exports:{}};
new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const {detectPitch,pitchWindow,capturedPitchTime,PitchStabilizer,EntranceTracker} = mod.exports;
const frequency = (note,cents=0) => 440 * 2 ** ((note-69+cents/100)/12);
function tone(note,rate,cents=0,rich=false,phase=0) {
  const samples = new Float32Array(pitchWindow(rate));
  for(let i=0;i<samples.length;i++) {
    const angle=2*Math.PI*frequency(note,cents)*i/rate+phase;
    samples[i]=rich ? .07*(.45*Math.sin(angle)+Math.sin(2*angle)+.4*Math.sin(3*angle)+.2*Math.sin(4*angle)) : .15*Math.sin(angle);
  }
  return samples;
}
let cases=0;
for(const rate of [44100,48000,96000,192000]) {
  // Concert A-flat2 is the tenor's low written B-flat3. Also exercise the
  // baritone's bottom register, existing flute range, and high piccolo notes.
  for(const note of [32,44,45,46,48,50,52,55,58,69,77,96,108]) {
    for(const rich of [false,true]) {
      const expectedCents=rich?-18:23;
      const found=detectPitch(tone(note,rate,expectedCents,rich,.37),rate);
      assert.ok(found,`Missing ${note} at ${rate} Hz (${rich?'rich':'sine'})`);
      assert.equal(found.note,note,`Wrong fundamental: ${note} at ${rate} Hz`);
      assert.ok(Math.abs(found.cents-expectedCents)<12,`Inaccurate tuning: ${note} at ${rate}: ${found.cents}`);
      cases++;
    }
  }
  const size=pitchWindow(rate);
  assert.equal(capturedPitchTime(1000,rate,size),1000-size/rate*500);
  assert.ok(size/2>rate/50,'Each half-window must cover a low fundamental period');
  assert.equal(detectPitch(new Float32Array(size),rate),null);
}
assert.equal(pitchWindow(44100),2048);
assert.equal(pitchWindow(48000),2048);
assert.equal(pitchWindow(96000),4096);
assert.equal(pitchWindow(192000),8192);
// Sustain and articulate a low tenor fundamental through the same stabilizer
// and entrance tracker used by the live microphone.
const stabilizer=new PitchStabilizer(),tracker=new EntranceTracker(1);
const found=detectPitch(tone(44,48000,0,true),48000);
let onsets=0;
for(let now=0;now<300;now+=30) {
  const stable=stabilizer.update(found,now);
  if(tracker.update(stable?.pitch??null,now))onsets++;
}
assert.equal(onsets,1,'A sustained low note should produce one entrance');
for(const now of [330,360,390]) {const stable=stabilizer.update(null,now);tracker.update(stable?.pitch??null,now);}
for(const now of [420,450,480]) {const stable=stabilizer.update(found,now);if(tracker.update(stable?.pitch??null,now))onsets++;}
assert.equal(onsets,2,'Rearticulating a low note should produce another entrance');
console.log(`Passed ${cases} pitch cases: low sax fundamentals, stronger second harmonics, detuning, flute/piccolo regression, sample-rate windows, timestamps, sustain and rearticulation.`);
