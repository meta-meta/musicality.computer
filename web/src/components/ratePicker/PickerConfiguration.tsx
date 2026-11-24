import { Input } from '@chakra-ui/react'
import { useState } from 'react'
import { rateInHertz, rateInUnit, type RateUnit } from './frequency.ts'
import { clockReferenceHz, parseRatios, validatePickerSettings, type PickerSettings, type RateKind } from './landmarks.ts'

interface Props {
  settings: PickerSettings
  kind: RateKind
  unit: RateUnit
  label: string
  disabled: boolean
  landmarkRootHz?: number
  onChange: (settings: PickerSettings) => void
}

function NumberSetting({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (value: number) => void }) {
  return <label className="field-label">{label}<Input className="text-input" key={value} type="number" step="any" defaultValue={Number(value.toPrecision(12))} min={min} max={max} disabled={disabled} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} onBlur={e => {
    const number = Number(e.target.value)
    if (e.target.value.trim() && Number.isFinite(number) && number >= min && number <= max) onChange(number)
    else e.target.value = String(value)
  }}/></label>
}

export default function PickerConfiguration({ settings, kind, unit, label, disabled, landmarkRootHz, onChange }: Props) {
  const [error, setError] = useState('')
  const update = (changes: Partial<PickerSettings>) => {
    try { onChange(validatePickerSettings({ ...settings, ...changes })); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Check the picker settings.') }
  }
  const numberProps = { disabled }
  return <details className="picker-configuration"><summary>{label} mapping & landmarks</summary><div className="picker-configuration-fields">
    <label className="field-label">Twelve o’clock<select className="text-input" value={settings.reference} disabled={disabled} onChange={e => update({ reference: e.target.value as PickerSettings['reference'] })}>
      {kind === 'frequency' && <option value="c">Written C · tuned from A4</option>}
      <option value="one-hz">1 Hz · 60 BPM</option><option value="custom">Custom reference</option>
    </select></label>
    {settings.reference === 'custom' && <NumberSetting {...numberProps} label={`Twelve o’clock reference (${unit})`} value={rateInUnit(settings.customReferenceHz, unit)} min={rateInUnit(.000001, unit)} max={rateInUnit(1000000, unit)} onChange={n => update({ customReferenceHz: rateInHertz(n, unit) })}/>}
    <p className="picker-setting-hint">Top = {Number(clockReferenceHz(settings).toPrecision(10))} Hz and its octave equivalents. Changing the reference does not retune the object.</p>
    <label className="field-label">Landmarks<select className="text-input" value={settings.landmarks} disabled={disabled} onChange={e => update({ landmarks: e.target.value as PickerSettings['landmarks'] })}>
      {kind === 'frequency' ? <><option value="equal">Equal divisions · 12-TET by default</option><option value="ratios">Custom octave ratios</option></> : <option value="bpm">BPM multiples · integers by default</option>}
      <option value="none">Off · continuous rate</option>
    </select></label>
    {settings.landmarks === 'equal' && <NumberSetting {...numberProps} label="Equal divisions per octave" value={settings.divisions} min={2} max={72} onChange={divisions => update({ divisions })}/>}
    {settings.landmarks === 'ratios' && <label className="field-label">Octave ratios (fractions or decimals)<Input className="text-input" key={settings.ratios.join(',')} defaultValue={settings.ratios.map(n => Number(n.toPrecision(12))).join(', ')} disabled={disabled} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} onBlur={e => {
      try { update({ ratios: parseRatios(e.target.value) }); setError('') }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the ratios.') }
    }}/></label>}
    {settings.landmarks === 'bpm' && <NumberSetting {...numberProps} label="Base BPM landmark step" value={settings.bpmStep} min={.001} max={100} onChange={bpmStep => update({ bpmStep })}/>}
    {kind === 'frequency' && <>
      <NumberSetting {...numberProps} label="Tuning A4 (Hz)" value={settings.a4Hz} min={1} max={20000} onChange={a4Hz => update({ a4Hz })}/>
      <label className="field-label">Written C sounds as<select className="text-input" value={settings.instrument} disabled={disabled} onChange={e => update({ instrument: e.target.value as PickerSettings['instrument'] })}><option value="concert">Concert C · no transposition</option><option value="bb">B♭ · two semitones below</option><option value="eb">E♭ · nine semitones below</option><option value="f">F · seven semitones below</option><option value="custom">Custom transposition</option></select></label>
      {settings.instrument === 'custom' && <NumberSetting {...numberProps} label="Written-to-sounding offset (semitones)" value={settings.customTranspose} min={-48} max={48} onChange={customTranspose => update({ customTranspose })}/>}
      {landmarkRootHz !== undefined ? <p className="picker-setting-hint">Landmarks follow the scene base: {Number(landmarkRootHz.toPrecision(10))} Hz. Clock orientation remains independent.</p> : <>
        <label className="field-label">Landmark tuning root<select className="text-input" value={settings.tuningRoot} disabled={disabled} onChange={e => update({ tuningRoot: e.target.value as PickerSettings['tuningRoot'] })}><option value="c">Written C from A4 and transposition</option><option value="custom">Custom sounding frequency</option></select></label>
        {settings.tuningRoot === 'custom' && <NumberSetting {...numberProps} label="Landmark root (Hz)" value={settings.customTuningHz} min={.000001} max={1000000} onChange={customTuningHz => update({ customTuningHz })}/>}
      </>}
    </>}
    <NumberSetting {...numberProps} label="Outward band width (track radii)" value={settings.precisionBand} min={.15} max={2} onChange={precisionBand => update({ precisionBand })}/>
    <p className="picker-setting-hint">On track: base landmarks. Pull outward to subdivide {kind === 'frequency' ? 'each interval by 2, 4, 8…' : 'each BPM step by 10, 100, 1000…'}. Units do not change the grid.</p>
    {error && <p className="frequency-error" role="alert">{error}</p>}
  </div></details>
}
