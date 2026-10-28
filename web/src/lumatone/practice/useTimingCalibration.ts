import {useCallback,useEffect,useRef,useState} from 'react';
import {capturedPitchTime,detectPitch,EntranceTracker,PITCH_POLL_MS,PITCH_WINDOW,PitchStabilizer} from './pitch.ts';
import {analyseCalibration,audioSetup,calibrationPulses,captureCalibrationPulse} from './timingCalibration.ts';
import type {CalibrationProfile} from './timingCalibration.ts';
import {sound} from './sound.ts';

type Capture={stream:MediaStream;context:AudioContext;frame:number;timer:number;measuring:boolean;setupKey:string};
export function useTimingCalibration() {
  const [phase,setPhase]=useState<'idle'|'starting'|'measuring'|'done'|'error'>('idle');
  const [error,setError]=useState('');
  const [detected,setDetected]=useState(0);
  const [result,setResult]=useState<CalibrationProfile|null>(null);
  const capture=useRef<Capture|null>(null),generation=useRef(0);
  const release=useCallback(()=>{
    generation.current++;
    const current=capture.current;capture.current=null;
    if(current) {
      cancelAnimationFrame(current.frame);clearTimeout(current.timer);
      current.stream.getTracks().forEach(track=>track.stop());
      void current.context.close().catch(()=>{});
    }
  },[]);
  const cancel=useCallback(()=>{release();setPhase('idle');setError('');setResult(null);},[release]);
  useEffect(()=>release,[release]);
  useEffect(()=>{
    const hidden=()=>{
      if(document.hidden&&capture.current) {release();setPhase('error');setError('Calibration stopped because this tab was hidden. Keep it visible during the test.');}
    };
    const changed=()=>{
      const current=capture.current;
      if(!current?.measuring)return;
      void audioSetup(current.context,current.stream).then(next=>{
        if(capture.current===current&&next.key!==current.setupKey) {
          release();setPhase('error');setError('Audio devices changed during the test. Check your setup and retry.');
        }
      }).catch(()=>{});
    };
    document.addEventListener('visibilitychange',hidden);
    navigator.mediaDevices?.addEventListener('devicechange',changed);
    return ()=>{document.removeEventListener('visibilitychange',hidden);navigator.mediaDevices?.removeEventListener('devicechange',changed);};
  },[release]);
  const start=async(volume:number)=>{
    release();const token=generation.current;
    setPhase('starting');setError('');setResult(null);setDetected(0);
    let stream:MediaStream|undefined;
    let context:AudioContext|undefined;
    const fail=(message:string)=>{if(token!==generation.current)return;release();setError(message);setPhase('error');};
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access requires localhost or HTTPS.');
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
      if(token!==generation.current) {stream.getTracks().forEach(track=>track.stop());return;}
      context=new AudioContext();
      const current:Capture={stream,context,frame:0,timer:0,measuring:false,setupKey:''};capture.current=current;
      await context.resume();
      if(token!==generation.current)return;
      if(context.state!=='running')throw new Error('Audio could not start. Retry after allowing audio playback.');
      const setup=await audioSetup(context,stream);
      if(token!==generation.current)return;
      if(document.hidden)throw new Error('Keep this tab visible during calibration.');
      const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser(),mute=context.createGain();
      analyser.fftSize=PITCH_WINDOW;mute.gain.value=0;
      source.connect(analyser);analyser.connect(mute);mute.connect(context.destination);
      const samples=new Float32Array(PITCH_WINDOW),stabilizer=new PitchStabilizer(),tracker=new EntranceTracker(1);
      // Use the transport's schedule-clock convention, so the resulting value
      // corrects the same output + capture + pitch-detector path used in practice.
      const origin=performance.now()+800,audioOrigin=context.currentTime+.8;
      const pulses=calibrationPulses(origin);
      pulses.forEach((pulse,index)=>sound(context!,440*2**((pulse.note-69)/12),audioOrigin+index*1.25,.22,volume));
      current.setupKey=setup.key;current.measuring=true;setPhase('measuring');
      let lastFrame=-Infinity;
      const read=(now:number)=>{
        if(capture.current!==current)return;
        if(now-lastFrame>=PITCH_POLL_MS) {
          lastFrame=now;
          analyser.getFloatTimeDomainData(samples);
          const time=capturedPitchTime(now,current.context.sampleRate);
          const stable=stabilizer.update(detectPitch(samples,current.context.sampleRate),time);
          const entrance=tracker.update(stable?.pitch??null,stable?.time??time);
          if(entrance&&captureCalibrationPulse(pulses,entrance))setDetected(pulses.filter(pulse=>pulse.offset!==undefined).length);
        }
        current.frame=requestAnimationFrame(read);
      };
      current.frame=requestAnimationFrame(read);
      current.timer=window.setTimeout(()=>{
        if(token!==generation.current)return;
        try {
          const measured=analyseCalibration(pulses);
          release();setResult({...measured,setup,at:new Date().toISOString()});setPhase('done');
        } catch(reason) {fail(reason instanceof Error?reason.message:'The timing test could not be measured.');}
      },Math.max(0,pulses[pulses.length-1].time+1000-performance.now()));
      stream.getAudioTracks()[0]?.addEventListener('ended',()=>fail('The microphone disconnected during calibration.'),{once:true});
      context.addEventListener('statechange',()=>{if(capture.current===current&&current.context.state!=='running')fail('Audio was interrupted during calibration. Please retry.');});
    } catch(reason) {
      stream?.getTracks().forEach(track=>track.stop());
      if(context&&context.state!=='closed')void context.close().catch(()=>{});
      fail(reason instanceof Error?reason.message:'Calibration could not start.');
    }
  };
  return {phase,error,detected,result,start,cancel,busy:phase==='starting'||phase==='measuring'};
}
