const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({entryPoints:['src/lumatone/practice/polyphonicTuning.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports',built.outputFiles[0].text)(mod,mod.exports);
const {estimatePolyphonicTuning:estimate,PolyphonicTuningStabilizer}=mod.exports;
// Independent audio fixture: synthesize detuned strings, Blackman-window them,
// and FFT into the dB spectrum specified by Web Audio's AnalyserNode.
function spectrumFor(tones,rate=48000,size=16384,{noise=0,missingFundamental=false}={}) {
 const re=new Float64Array(size),im=new Float64Array(size);let seed=12345;
 for(let i=0;i<size;i++) {
  let sample=0;
  for(const [note,cents] of tones)for(let h=missingFundamental?2:1;h<=6;h++)sample+=Math.sin(2*Math.PI*440*2**((note-69+cents/100)/12)*h*i/rate+0.2*h)*0.06/h**1.3;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  sample+=noise*(seed/4294967296*2-1);
  re[i]=sample*(.42-.5*Math.cos(2*Math.PI*i/size)+.08*Math.cos(4*Math.PI*i/size));
 }
 for(let i=1,j=0;i<size;i++){let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
 for(let length=2;length<=size;length<<=1)for(let start=0;start<size;start+=length)for(let j=0;j<length/2;j++) {
  const a=start+j,b=a+length/2,angle=-2*Math.PI*j/length,wr=Math.cos(angle),wi=Math.sin(angle);
  const tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;
  re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
 }
 return Float32Array.from({length:size/2},(_,i)=>20*Math.log10(Math.max(1e-12,Math.hypot(re[i],im[i])/size)));
}
for(const rate of [44100,48000,96000])for(const note of [35,40,57,76])for(const cents of [-25,0,23]) {
 const size=rate>48000?32768:16384;
 const reading=estimate(spectrumFor([[note,cents]],rate,size),rate,size,[note])[0];
 assert.notEqual(reading.cents,null,`Estimate ${note} @ ${cents} cents / ${rate}`);
 assert.ok(Math.abs(reading.cents-cents)<3,`${note}: expected ${cents}, got ${reading.cents}`);
}
const tones=[[40,18],[47,-16],[56,9]];
const chord=estimate(spectrumFor(tones,48000,16384,{noise:0.001}),48000,16384,tones.map(t=>t[0]));
for(const [index,reading] of chord.entries()) {assert.notEqual(reading.cents,null);assert.ok(Math.abs(reading.cents-tones[index][1])<4,JSON.stringify(reading));}
assert.equal(estimate(spectrumFor([]),48000,16384,[40])[0].cents,null,'Silence cannot produce tuning');
assert.equal(estimate(spectrumFor([],48000,16384,{noise:0.03}),48000,16384,[40])[0].cents,null,'Noise is not tuning evidence');
assert.equal(estimate(spectrumFor([[40,0],[52,0]]),48000,16384,[40,52])[1].cents,null,'Shared octave harmonics cannot establish upper-string tuning');
const missing=estimate(spectrumFor([[40,-15]],48000,16384,{missingFundamental:true}),48000,16384,[40])[0];
assert.ok(Math.abs(missing.cents+15)<3,'Higher partials recover a missing fundamental');
const tracker=new PolyphonicTuningStabilizer();
assert.equal(tracker.update([{note:40,cents:20,confidence:1}])[0].cents,null);
assert.equal(tracker.update([{note:40,cents:20,confidence:1}])[0].cents,20);
assert.equal(tracker.update([{note:40,cents:-20,confidence:1}])[0].cents,null,'Large tuning changes need confirmation');
tracker.update([]);assert.equal(tracker.update([{note:40,cents:-20,confidence:1}])[0].cents,null,'Silence clears tuning confidence');
console.log('Polyphonic tuning passes synthetic audio: low B1, sample rates, sharp/flat strings, independently detuned chords, noise, silence, shared-octave ambiguity, missing fundamentals and stability.');
