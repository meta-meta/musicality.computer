const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({stdin:{contents:`export * from './src/lumatone/practice/timingCalibration.ts';export * from './src/lumatone/practice/pitch.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const api=mod.exports;
const measured=offsets=>api.calibrationPulses(1000).map((pulse,i)=>({...pulse,offset:offsets[i]}));
let result=api.analyseCalibration(measured([100,110,100,90,100,100,100,110,95,800]));
assert.equal(result.correction,100);assert.equal(result.used,9);assert.equal(result.detected,10);
assert.throws(()=>api.analyseCalibration(measured([100,100,100])),/Too few/);
assert.throws(()=>api.analyseCalibration(measured([0,70,140,210,280,350,420,490,560,630])),/varied/);
assert.throws(()=>api.analyseCalibration(measured(Array(10).fill(600))),/supported/);
assert.equal(api.analyseCalibration(measured(Array(10).fill(-20))).correction,-20);
const pulses=api.calibrationPulses(1000),pitch={note:69,cents:0,clarity:.99,frequency:440,rms:.1};
assert.equal(api.captureCalibrationPulse(pulses,{pitch,time:900}),true);
assert.equal(api.captureCalibrationPulse(pulses,{pitch,time:910}),false,'Duplicate onset cannot consume the same pulse');
assert.equal(api.captureCalibrationPulse(pulses,{pitch:{...pitch,note:74},time:2400}),true);
assert.equal(api.captureCalibrationPulse(pulses,{pitch:{...pitch,note:71,clarity:.3},time:3650}),false);
assert.equal(api.captureCalibrationPulse(pulses,{pitch:{...pitch,note:71,cents:40},time:3650}),false);
assert.equal(api.captureCalibrationPulse(pulses,{pitch:{...pitch,note:71},time:4901}),false);
const backing=new Map(),storage={getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,value)};
const setup={key:'setup-1',input:'Fixture mic',output:'Fixture output',sampleRate:48000};
const profile={setup,correction:100,spread:20,used:9,detected:10,at:'2026-10-28T12:00:00Z'};
assert.equal(api.latestSavedCalibration(storage),null);
api.saveCalibration(profile,storage);assert.equal(api.latestSavedCalibration(storage).correction,100);assert.deepEqual(api.savedCalibration(setup,storage),profile);
assert.equal(api.savedCalibration({...setup,key:'different-device'},storage),null);
api.saveCalibration({...profile,correction:120},storage);assert.equal(api.parseCalibrationProfiles(storage.getItem(api.CALIBRATION_KEY)).length,1);
assert.equal(api.savedCalibration(setup,storage).correction,120);
const reloadedStorage={getItem:key=>backing.get(key)??null};
assert.equal(api.latestSavedCalibration(reloadedStorage).correction,120,'Last applied calibration restores before microphone access');
const other={...profile,setup:{...setup,key:'other-device'},correction:0};
api.saveCalibration(other,storage);
assert.equal(api.latestSavedCalibration(reloadedStorage).correction,0,'A saved zero offset is preserved');
assert.equal(api.savedCalibration(setup,storage).correction,120,'Other device profiles remain available');
api.saveCalibration(api.savedCalibration(setup,storage),storage);
assert.equal(api.latestSavedCalibration(reloadedStorage).setup.key,setup.key,'Last used setup is remembered');
assert.throws(()=>api.parseCalibrationProfiles(JSON.stringify([{...profile,correction:10000}])),/Invalid/);
storage.setItem(api.CALIBRATION_KEY,'broken');assert.equal(api.savedCalibration(setup,storage),null);
assert.throws(()=>api.saveCalibration(profile,storage));assert.equal(storage.getItem(api.CALIBRATION_KEY),'broken');
// Feed synthetic acoustic loopback through the actual live detector, stabilizer,
// onset tracker and timestamp convention; do not substitute ideal onset events.
for(const delay of [0,120,240]) {
  const plan=api.calibrationPulses(1000),samples=new Float32Array(api.PITCH_WINDOW),rate=48000;
  const stabilizer=new api.PitchStabilizer(),tracker=new api.EntranceTracker(1);let last=-Infinity;
  for(let now=0;now<plan.at(-1).time+1000;now+=1000/60) {
    if(now-last<api.PITCH_POLL_MS)continue;last=now;
    for(let i=0;i<samples.length;i++) {
      const time=now-(samples.length-i)/rate*1000;
      const pulse=plan.find(item=>time>=item.time+delay&&time<item.time+delay+220);
      if(!pulse){samples[i]=0;continue;}
      const elapsed=(time-pulse.time-delay)/1000;
      const envelope=Math.min(1,elapsed/.008,(.22-elapsed)/.03);
      samples[i]=Math.sin(2*Math.PI*440*2**((pulse.note-69)/12)*elapsed)*.12*envelope;
    }
    const time=api.capturedPitchTime(now,rate),stable=stabilizer.update(api.detectPitch(samples,rate),time);
    const onset=tracker.update(stable?.pitch??null,stable?.time??time);
    if(onset)api.captureCalibrationPulse(plan,onset);
  }
  const calibration=api.analyseCalibration(plan);
  assert.ok(Math.abs(calibration.correction-delay)<=40,`Expected roughly ${delay} ms; measured ${calibration.correction}`);
  assert.equal(calibration.used,10);
}
console.log('Passed timing calibration: real detector loopback at 0/120/240 ms, pulse matching, jitter/outlier rejection, bounds, and device-specific storage.');
