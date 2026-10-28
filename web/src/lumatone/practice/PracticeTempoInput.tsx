import {useEffect,useState} from 'react';

export function PracticeTempoInput({bpm,onChange,disabled,label='Tempo'}:{
  bpm:number;onChange:(value:number)=>void;disabled:boolean;label?:string;
}) {
  const [draft,setDraft]=useState(String(bpm));
  useEffect(()=>setDraft(String(bpm)),[bpm]);
  return <input aria-label={label} type="number" min={40} max={180} step={1} value={draft} disabled={disabled} style={{width:65}}
    onChange={event=>{
      const raw=event.target.value;setDraft(raw);
      const value=Number(raw);
      if(raw!==''&&Number.isFinite(value)&&value>=40&&value<=180)onChange(value);
    }}
    onBlur={()=>{
      const value=draft.trim()===''?bpm:Math.max(40,Math.min(180,Number(draft)||bpm));
      onChange(value);setDraft(String(value));
    }} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>;
}
