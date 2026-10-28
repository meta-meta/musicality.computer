import {useCallback,useEffect,useState} from 'react';

export const PRACTICE_SETTINGS_KEY='musicality.practice-settings.v1';
export type PracticeSettings={bpm:number;loop:boolean};
export const defaultPracticeSettings:PracticeSettings={bpm:80,loop:true};
export function readPracticeSettings(storage:Pick<Storage,'getItem'>):PracticeSettings {
  const raw=storage.getItem(PRACTICE_SETTINGS_KEY);
  if(!raw)return {...defaultPracticeSettings};
  const value=JSON.parse(raw) as Partial<PracticeSettings>|null;
  return {bpm:typeof value?.bpm==='number'&&Number.isFinite(value.bpm)&&value.bpm>=40&&value.bpm<=180?value.bpm:80,
    loop:typeof value?.loop==='boolean'?value.loop:true};
}
export function usePracticeSettings() {
  const [settings,setSettings]=useState<PracticeSettings>(()=>{
    try{return readPracticeSettings(window.localStorage);}catch{return {...defaultPracticeSettings};}
  });
  const [settingsError,setSettingsError]=useState('');
  useEffect(()=>{
    try {window.localStorage.setItem(PRACTICE_SETTINGS_KEY,JSON.stringify(settings));setSettingsError('');}
    catch {setSettingsError('Tempo and loop settings could not be saved in this browser.');}
  },[settings]);
  const setBpm=useCallback((bpm:number)=>{
    if(!Number.isFinite(bpm))return;
    const value=Math.max(40,Math.min(180,bpm));
    setSettings(current=>current.bpm===value?current:{...current,bpm:value});
  },[]);
  const setLoop=useCallback((loop:boolean)=>setSettings(current=>current.loop===loop?current:{...current,loop}),[]);
  return {...settings,setBpm,setLoop,settingsError};
}
