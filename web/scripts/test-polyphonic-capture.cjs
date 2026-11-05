const assert=require('node:assert/strict');
const esbuild=require('esbuild');
(async()=>{
 const result=await esbuild.build({entryPoints:['src/lumatone/practice/usePolyphonicInput.ts'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],plugins:[{name:'test-detector',setup(build){build.onResolve({filter:/^@markusstrasser\/pitchplease$/},()=>({path:'mock',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const create = options => globalThis.fixtureCreate(options);',loader:'js'}));}}]});
 const contexts=[],tracks=[],detectors=[];
 let failContext=false, pendingCapture=null, pendingStart=null;
 class Context {
  constructor(){if(failContext)throw Error('No context');this.state='running';this.sampleRate=48000;this.currentTime=0;contexts.push(this);}
  node(){return {connect(){},disconnect(){}};}
  createMediaStreamSource(){return this.node();}
  createAnalyser(){return {...this.node(),frequencyBinCount:8192,getFloatFrequencyData(data){data.fill(-120);}};}
  createGain(){return {...this.node(),gain:{value:1}};}
  async resume(){}
  async close(){this.state='closed';}
 }
 function stream(){const track={stops:0,stop(){this.stops++;},addEventListener(){}};tracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]};}
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>pendingCapture?await pendingCapture:stream()}}});
 globalThis.AudioContext=Context;
 globalThis.fixtureCreate=()=>{const d={stops:0,start:async()=>pendingStart?await pendingStart:true,stop(){this.stops++;}};detectors.push(d);return d;};
 function hook(){const effects=[];const react={useState:value=>[value,()=>{}],useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn())};const mod={exports:{}};new Function('module','exports','require',result.outputFiles[0].text)(mod,mod.exports,id=>id==='react'?react:require(id));return {api:mod.exports.usePolyphonicInput(()=>{}),unmount:()=>effects.forEach(fn=>fn?.())};}
 let instance=hook();assert.equal(await instance.api.start(),true);instance.api.stop();assert.equal(tracks.at(-1).stops,1);assert.equal(contexts.at(-1).state,'closed');assert.equal(detectors.at(-1).stops,1);
 instance=hook();await instance.api.start();instance.unmount();assert.equal(tracks.at(-1).stops,1);assert.equal(contexts.at(-1).state,'closed');
 failContext=true;instance=hook();assert.equal(await instance.api.start(),false);assert.equal(tracks.at(-1).stops,1,'Context failure releases the opened stream');failContext=false;
 let resolve;pendingCapture=new Promise(done=>resolve=done);instance=hook();const opening=instance.api.start();await new Promise(setImmediate);instance.api.stop();resolve(stream());assert.equal(await opening,false);assert.equal(tracks.at(-1).stops,1);pendingCapture=null;
 pendingStart=new Promise(done=>resolve=done);instance=hook();const warming=instance.api.start();await new Promise(setImmediate);instance.api.stop();resolve(true);assert.equal(await warming,false);assert.equal(tracks.at(-1).stops,1);assert.equal(contexts.at(-1).state,'closed');
 console.log('Polyphonic capture lifecycle passes: shared stream, stop/unmount cleanup, context failure, permission cancellation and detector startup cancellation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
