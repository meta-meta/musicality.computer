import {useCallback,useEffect,useState} from 'react';
import {practiceInstrument, transposingInstruments} from './instruments.ts';
import type {InstrumentId} from './instruments.ts';
import {HISTORY_KEY, parsePracticeHistory} from './practiceHistory.ts';

export const PRACTICE_SETTINGS_KEY='musicality.practice-settings.v1';
export type PracticeSettings={bpm:number;loop:boolean;instrumentId:InstrumentId;concertKey:number|null;register:number};
export const defaultPracticeSettings:PracticeSettings={bpm:80,loop:true,instrumentId:'flute',concertKey:null,register:0};
const registers=[-12,0,12,24];
export function readPracticeSettings(storage:Pick<Storage,'getItem'>):PracticeSettings {
  let value:Partial<PracticeSettings>|null=null;
  try {value=JSON.parse(storage.getItem(PRACTICE_SETTINGS_KEY)??'null');} catch { /* Try history even if preferences cannot be read. */ }
  const settings:PracticeSettings={
    bpm:typeof value?.bpm==='number'&&Number.isFinite(value.bpm)&&value.bpm>=40&&value.bpm<=180?value.bpm:80,
    loop:typeof value?.loop==='boolean'?value.loop:true,
    instrumentId:practiceInstrument(value?.instrumentId).id,
    concertKey:typeof value?.concertKey==='number'&&Number.isInteger(value.concertKey)&&value.concertKey>=0&&value.concertKey<12?value.concertKey:null,
    register:typeof value?.register==='number'&&registers.includes(value.register)?value.register:0,
  };
  // A recorded practice session takes precedence over unpracticed control edits.
  // Read once on page mount; never overwrite history or change a running session.
  try {
    const history=storage.getItem(HISTORY_KEY);
    if(history) {
      const latest=parsePracticeHistory(history).sessions.filter(session=>session.judgements.length>0)
        .sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||Date.parse(b.startedAt)-Date.parse(a.startedAt))[0];
      if(latest) {
        const keyShift=latest.settings.keyTranspose??0;
        settings.bpm=latest.settings.bpm;
        settings.concertKey=((latest.tonic??10)+keyShift+12)%12;
        const register=latest.settings.transpose-keyShift;
        if(registers.includes(register))settings.register=register;
        if(transposingInstruments.some(instrument=>instrument.id===latest.settings.instrumentId))
          settings.instrumentId=practiceInstrument(latest.settings.instrumentId).id;
      }
    }
  } catch { /* Unavailable/malformed history stays untouched; use preferences. */ }
  return settings;
}
export function usePracticeSettings() {
  const [settings,setSettings]=useState<PracticeSettings>(()=>{
    try{return readPracticeSettings(window.localStorage);}catch{return {...defaultPracticeSettings};}
  });
  const [settingsError,setSettingsError]=useState('');
  useEffect(()=>{
    try {window.localStorage.setItem(PRACTICE_SETTINGS_KEY,JSON.stringify(settings));setSettingsError('');}
    catch {setSettingsError('Practice settings could not be saved in this browser.');}
  },[settings]);
  const setBpm=useCallback((bpm:number)=>{
    if(!Number.isFinite(bpm))return;
    const value=Math.max(40,Math.min(180,bpm));
    setSettings(current=>current.bpm===value?current:{...current,bpm:value});
  },[]);
  const setLoop=useCallback((loop:boolean)=>setSettings(current=>current.loop===loop?current:{...current,loop}),[]);
  const setInstrumentId=useCallback((instrumentId:InstrumentId)=>setSettings(current=>({...current,instrumentId:practiceInstrument(instrumentId).id})),[]);
  const setConcertKey=useCallback((concertKey:number)=>{
    if(Number.isInteger(concertKey)&&concertKey>=0&&concertKey<12)setSettings(current=>({...current,concertKey}));
  },[]);
  const setRegister=useCallback((register:number)=>{
    if(registers.includes(register))setSettings(current=>({...current,register}));
  },[]);
  return {...settings,setBpm,setLoop,setInstrumentId,setConcertKey,setRegister,settingsError};
}
