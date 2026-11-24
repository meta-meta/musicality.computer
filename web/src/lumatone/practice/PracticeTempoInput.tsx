/* eslint-disable react-refresh/only-export-components */
import {useEffect, useState} from 'react';
import {PopoverBody, PopoverContent, PopoverRoot, PopoverTrigger} from '../../components/chakra-ui/popover.tsx';
import RatePicker from '../../components/ratePicker/RatePicker.tsx';
import {defaultPickerSettings, validatePickerSettings} from '../../components/ratePicker/landmarks.ts';
import type {PickerSettings} from '../../components/ratePicker/landmarks.ts';
import type {RateUnit} from '../../components/ratePicker/frequency.ts';
import '../../components/ratePicker/ratePicker.css';

export const TEMPO_PICKER_KEY = 'musicality.tempo-picker.v1';
const MIN_BPM = 40, MAX_BPM = 180;
type Saved = {settings: PickerSettings; unit: RateUnit};

export function readTempoPicker(storage: Pick<Storage, 'getItem'>): Saved {
  try {
    const value = JSON.parse(storage.getItem(TEMPO_PICKER_KEY) ?? 'null');
    return {settings: validatePickerSettings(value.settings), unit: value.unit === 'Hz' ? 'Hz' : 'BPM'};
  } catch {
    return {settings: defaultPickerSettings('tempo'), unit: 'BPM'};
  }
}

// Mounted only while the popover is open, so each opening reads the saved
// mapping even when another tempo control changed it.
function TempoDial({bpm, onChange, label}: {bpm: number; onChange: (value: number) => void; label: string}) {
  const [saved, setSaved] = useState<Saved>(() => {
    try {return readTempoPicker(window.localStorage);} catch {return {settings: defaultPickerSettings('tempo'), unit: 'BPM'};}
  });
  useEffect(() => {
    try {window.localStorage.setItem(TEMPO_PICKER_KEY, JSON.stringify(saved));} catch { /* The mapping still applies while open. */ }
  }, [saved]);
  // The picker works in hertz; practice tempo stays in BPM.
  return <RatePicker label={label} kind="tempo" value={bpm / 60} min={MIN_BPM / 60} max={MAX_BPM / 60}
    settings={saved.settings} onSettingsChange={settings => setSaved(current => ({...current, settings}))}
    unit={saved.unit} onUnitChange={unit => setSaved(current => ({...current, unit}))}
    onChange={hertz => onChange(Number((hertz * 60).toFixed(6)))}/>;
}

export function PracticeTempoInput({bpm, onChange, disabled, label = 'Tempo'}: {
  bpm: number; onChange: (value: number) => void; disabled: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {if (disabled) setOpen(false);}, [disabled]);
  return <PopoverRoot open={open} onOpenChange={event => setOpen(event.open)} lazyMount unmountOnExit positioning={{placement: 'bottom-start'}}>
    <PopoverTrigger asChild>
      <button type="button" aria-label={`${label}: ${Number(bpm.toFixed(3))} BPM. Open tempo dial`} data-tempo-trigger="true" disabled={disabled}
        style={{minWidth: 65, padding: '2px 8px', border: '1px solid var(--chakra-colors-border)', borderRadius: 4, fontVariantNumeric: 'tabular-nums', textAlign: 'left', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1}}>
        {Number(bpm.toFixed(2))}
      </button>
    </PopoverTrigger>
    <PopoverContent width="300px" maxWidth="calc(100vw - 16px)">
      <PopoverBody className="rate-picker-scope" maxHeight="min(80vh, 720px)" overflowY="auto">
        <TempoDial bpm={bpm} onChange={onChange} label={label}/>
      </PopoverBody>
    </PopoverContent>
  </PopoverRoot>;
}
