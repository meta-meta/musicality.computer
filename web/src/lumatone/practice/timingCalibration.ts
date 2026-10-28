import type {Entrance} from './pitch.ts';

export const CALIBRATION_KEY='musicality.timing-calibration.v1';
export type AudioSetup={key:string;input:string;output:string;sampleRate:number};
export type CalibrationProfile={setup:AudioSetup;correction:number;spread:number;used:number;detected:number;at:string};
export type CalibrationPulse={note:number;time:number;offset?:number};

export async function audioSetup(context:AudioContext,stream:MediaStream):Promise<AudioSetup> {
  const track=stream.getAudioTracks()[0],settings=track.getSettings();
  const devices=await navigator.mediaDevices.enumerateDevices().catch(()=>[]);
  const output=devices.find(device=>device.kind==='audiooutput'&&device.deviceId==='default');
  const sink=(context as AudioContext&{sinkId?:string}).sinkId??'default';
  const outputLabel=output?.label||'System default output';
  return {key:JSON.stringify(['yin2048-poll30-v1',settings.deviceId??'',settings.groupId??'',track.label,context.sampleRate,sink,output?.groupId??'',outputLabel]),
    input:track.label||'Microphone',output:outputLabel,sampleRate:context.sampleRate};
}

export function calibrationPulses(origin:number):CalibrationPulse[] {
  return [69,74,71,76,72,77,69,74,71,76].map((note,index)=>({note,time:origin+index*1250}));
}

// Match one onset per tone, allowing slow audio devices without confusing the next pulse.
export function captureCalibrationPulse(pulses:CalibrationPulse[],entrance:Entrance) {
  if (Math.abs(entrance.pitch.cents)>25 || entrance.pitch.clarity<.9) return false;
  const pulse=pulses.find(item=>item.offset===undefined && item.note===entrance.pitch.note
    && entrance.time-item.time>=-100 && entrance.time-item.time<=900);
  if (!pulse) return false;
  pulse.offset=entrance.time-pulse.time;return true;
}
const median=(values:number[])=>{
  const sorted=[...values].sort((a,b)=>a-b),middle=sorted.length>>>1;
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
};
export function analyseCalibration(pulses:CalibrationPulse[]) {
  const offsets=pulses.flatMap(pulse=>pulse.offset===undefined?[]:[pulse.offset]).filter(Number.isFinite);
  if (offsets.length<6) throw new Error('Too few test tones were detected. Bring the speaker or earcup closer to the mic, adjust test volume, and retry.');
  const center=median(offsets),mad=median(offsets.map(value=>Math.abs(value-center)));
  const kept=offsets.filter(value=>Math.abs(value-center)<=Math.max(30,3*mad)).sort((a,b)=>a-b);
  if (kept.length<6) throw new Error('Not enough consistent detections. Keep the room quiet and retry.');
  const spread=kept[Math.ceil((kept.length-1)*.9)]-kept[Math.floor((kept.length-1)*.1)];
  if (spread>90 || median(kept.map(value=>Math.abs(value-median(kept))))>25)
    throw new Error('The delay varied too much for a reliable correction. Keep this tab visible, reduce background sound, and retry.');
  const correction=Math.round(median(kept)/10)*10;
  if (correction < -300 || correction > 500) throw new Error('The measured delay is outside the supported −300 to 500 ms range. Try a lower-latency audio setup and retry.');
  return {correction,spread:Math.round(spread),used:kept.length,detected:offsets.length};
}

export function parseCalibrationProfiles(raw:string):CalibrationProfile[] {
  if(raw.length>100000)throw new Error('Saved calibration is too large.');
  const value:unknown=JSON.parse(raw);
  if (!Array.isArray(value)||value.length>20) throw new Error('Invalid saved calibration.');
  const profiles=value.filter((profile):profile is CalibrationProfile=>{
    const p=profile as Partial<CalibrationProfile>|null;
    return Boolean(p&&typeof p.at==='string'&&Number.isFinite(Date.parse(p.at))&&p.setup&&typeof p.setup.key==='string'&&p.setup.key.length<3000
      &&typeof p.setup.input==='string'&&typeof p.setup.output==='string'&&p.setup.input.length<500&&p.setup.output.length<500&&Number.isFinite(p.setup.sampleRate)&&p.setup.sampleRate>=8000&&p.setup.sampleRate<=384000
      &&typeof p.correction==='number'&&Number.isFinite(p.correction)&&p.correction>=-300&&p.correction<=500
      &&typeof p.spread==='number'&&p.spread>=0&&p.spread<=90&&typeof p.used==='number'&&p.used>=6&&p.used<=10
      &&typeof p.detected==='number'&&p.detected>=p.used&&p.detected<=10);
  });
  if(profiles.length!==value.length)throw new Error('Invalid saved calibration profile.');
  return profiles;
}
export function latestSavedCalibration(storage:Pick<Storage,'getItem'>):CalibrationProfile|null {
  try {return parseCalibrationProfiles(storage.getItem(CALIBRATION_KEY)??'[]')[0]??null;}
  catch {return null;}
}
export function savedCalibration(setup:AudioSetup,storage:Pick<Storage,'getItem'>):CalibrationProfile|null {
  try {return parseCalibrationProfiles(storage.getItem(CALIBRATION_KEY)??'[]').find(profile=>profile.setup.key===setup.key)??null;}
  catch {return null;}
}
export function saveCalibration(profile:CalibrationProfile,storage:Pick<Storage,'getItem'|'setItem'>) {
  const raw=storage.getItem(CALIBRATION_KEY);
  // Don't overwrite malformed saved data silently.
  const profiles=raw?parseCalibrationProfiles(raw):[];
  storage.setItem(CALIBRATION_KEY,JSON.stringify([profile,...profiles.filter(item=>item.setup.key!==profile.setup.key)].slice(0,20)));
}
