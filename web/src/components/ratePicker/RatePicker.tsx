// Ported from the MusicalityVR interface lab (musicality.meta/web/src); keep the two in step when the picker's behaviour changes.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clampFrequency, decimalPlaceAt, rateInHertz, rateInUnit, shiftFrequency, turnDelta, wrapTurn, type RateUnit } from './frequency.ts'
import { clockReferenceHz, detailedRate, landmarkTicks, nextLandmark, precisionAtRadius, precisionLabel, ratePhase, snapRate, type PickerSettings, type RateKind } from './landmarks.ts'
import PickerConfiguration from './PickerConfiguration.tsx'

interface Props {
  value: number
  min: number
  max: number
  label: string
  kind: RateKind
  settings: PickerSettings
  onSettingsChange: (settings: PickerSettings) => void
  unit: RateUnit
  onUnitChange: (unit: RateUnit) => void
  disabled?: boolean
  rateContext?: ReactNode
  valueDescription?: string
  landmarkRootHz?: number
  onChange: (frequency: number, historyGroup?: string) => void
}

const CENTER = 120
const RADIUS = 93
const point = (phase: number, radius = RADIUS) => ({ x: CENTER + Math.sin(phase * Math.PI * 2) * radius, y: CENTER - Math.cos(phase * Math.PI * 2) * radius })
interface PointerPreview { x: number; y: number; centerX: number; centerY: number; trackRadius: number }

// The sounding rate, clock orientation, and snapping grid are independent quantities.
export default function RatePicker({ value, min, max, label, kind, settings: configuredSettings, onSettingsChange, unit, onUnitChange, disabled = false, rateContext, valueDescription, landmarkRootHz, onChange }: Props) {
  const settings = landmarkRootHz === undefined ? configuredSettings : { ...configuredSettings, tuningRoot: 'custom' as const, customTuningHz: landmarkRootHz }
  const id = useId()
  const valueRef = useRef(value)
  valueRef.current = value
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const dialRef = useRef<SVGSVGElement>(null)
  const readoutRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ phase: number; group: string; rawHz: number; level: number } | null>(null)
  const wheel = useRef({ group: '', at: 0, residual: 0 })
  const [precision, setPrecision] = useState(0)
  const [pointer, setPointer] = useState<PointerPreview | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const cancelled = useRef(false)

  const emit = (frequency: number, group?: string) => {
    if (disabled || !Number.isFinite(frequency)) return
    const next = clampFrequency(frequency, min, max)
    if (Math.abs(next - valueRef.current) <= Number.EPSILON * Math.max(1, next) * 4) return
    valueRef.current = next
    setError('')
    changeRef.current(next, group)
  }

  const geometry = (clientX: number, clientY: number) => {
    const rect = dialRef.current!.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2
    const dx = clientX - centerX, dy = clientY - centerY
    const radius = Math.hypot(dx, dy) * 240 / rect.width
    return {
      phase: wrapTurn(Math.atan2(dx, -dy) / (2 * Math.PI)), radius,
      level: precisionAtRadius(radius, RADIUS, settings.precisionBand),
      preview: { x: clientX, y: clientY, centerX, centerY, trackRadius: RADIUS * rect.width / 240 },
    }
  }

  useEffect(() => {
    if (disabled) { drag.current = null; setPointer(null); setEditing(false) }
  }, [disabled])

  useEffect(() => {
    const dial = dialRef.current
    const readout = readoutRef.current
    wheel.current = { group: '', at: 0, residual: 0 }
    const group = () => {
      const now = Date.now()
      if (now - wheel.current.at > 250 || !wheel.current.group) wheel.current = { group: crypto.randomUUID(), at: now, residual: 0 }
      wheel.current.at = now
      return wheel.current.group
    }
    const pixels = (event: WheelEvent) => event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1)
    const dialWheel = (event: WheelEvent) => {
      if (disabled || event.ctrlKey || event.metaKey || !event.deltaY) return
      event.preventDefault()
      event.stopPropagation()
      const currentGroup = group()
      const { level } = geometry(event.clientX, event.clientY)
      setPrecision(level)
      if (settings.landmarks === 'none') { emit(shiftFrequency(valueRef.current, -pixels(event) / 100, min, max), currentGroup); return }
      wheel.current.residual -= pixels(event) / 100
      const count = Math.max(-20, Math.min(20, Math.trunc(wheel.current.residual)))
      wheel.current.residual -= count
      let next = valueRef.current
      for (let i = 0; i < Math.abs(count); i++) next = nextLandmark(next, Math.sign(count), min, max, settings, level)
      emit(next, currentGroup)
    }
    const digitWheel = (event: WheelEvent) => {
      if (disabled || event.ctrlKey || event.metaKey || !event.deltaY) return
      event.preventDefault()
      event.stopPropagation()
      const rect = readout!.getBoundingClientRect()
      const place = decimalPlaceAt(detailedRate(valueRef.current, unit), (event.clientX - rect.left) / rect.width)
      emit(rateInHertz(rateInUnit(valueRef.current, unit) - place * pixels(event) / 100, unit), group())
    }
    dial?.addEventListener('wheel', dialWheel, { passive: false })
    readout?.addEventListener('wheel', digitWheel, { passive: false })
    return () => { dial?.removeEventListener('wheel', dialWheel); readout?.removeEventListener('wheel', digitWheel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as in the lab source: emit and geometry are rebuilt every render
  }, [disabled, editing, unit, min, max, settings])

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled) return
    const location = geometry(event.clientX, event.clientY)
    setPrecision(location.level)
    const gesture = drag.current
    if (!gesture) return
    if (location.radius < 12) return
    // Preserve the current landmark when pulling straight outward; don't reveal a hidden unsnapped offset.
    if (location.level !== gesture.level) gesture.rawHz = valueRef.current
    gesture.rawHz = clampFrequency(gesture.rawHz * 2 ** turnDelta(gesture.phase, location.phase), min, max)
    gesture.phase = location.phase
    gesture.level = location.level
    setPointer(location.preview)
    emit(snapRate(gesture.rawHz, min, max, settings, location.level), gesture.group)
  }

  const finishDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    move(event)
    drag.current = null
    setPointer(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const keyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (disabled || event.ctrlKey || event.metaKey || event.altKey) return
    const directions: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }
    if (event.key in directions) {
      event.preventDefault()
      const level = event.shiftKey ? Math.max(1, precision) : precision
      setPrecision(level)
      emit(nextLandmark(value, directions[event.key], min, max, settings, level))
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      emit(shiftFrequency(value, event.key === 'PageUp' ? 1200 : -1200, min, max))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      emit(snapRate(event.key === 'Home' ? min : max, min, max, settings, precision))
    }
  }

  const finishEntry = () => {
    setEditing(false)
    if (cancelled.current) { cancelled.current = false; return }
    const number = rateInHertz(Number(draft.trim()), unit)
    if (!draft.trim() || !Number.isFinite(number) || number < min || number > max) {
      setError(`Enter a rate from ${Number(rateInUnit(min, unit).toFixed(6))} to ${Number(rateInUnit(max, unit).toFixed(6))} ${unit}.`)
      return
    }
    emit(number)
  }

  const handle = point(ratePhase(value, settings))
  const ticks = landmarkTicks(value, min, max, settings, precision)
  const readout = detailedRate(value, unit)
  const precisionText = precisionLabel(settings, precision)
  const portalTarget = dialRef.current?.closest('dialog') ?? (typeof document !== 'undefined' ? document.body : null)
  const dragLength = pointer ? Math.max(1, Math.hypot(pointer.x - pointer.centerX, pointer.y - pointer.centerY)) : 1

  return <div className={`frequency-picker ${disabled ? 'frequency-picker-disabled' : ''}`}>
    <div className="frequency-picker-heading"><span>{label}</span><span className="frequency-scale">log₂</span></div>
    <div className="rate-clock-label">12:00 = {settings.reference === 'c' ? 'written C · ' : ''}{Number(clockReferenceHz(settings).toPrecision(8))} Hz</div>
    <div className="frequency-dial-container">
      <svg ref={dialRef} className={`frequency-dial ${pointer ? 'dragging' : ''}`} viewBox="0 0 240 240" role="slider" aria-label={label} aria-valuemin={rateInUnit(min, unit)} aria-valuemax={rateInUnit(max, unit)} aria-valuenow={rateInUnit(value, unit)} aria-valuetext={`${readout} ${unit}; ${valueDescription ? `${valueDescription}; ` : ''}${precisionText}`} aria-describedby={`${id}-help`} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
        onKeyDown={keyDown}
        onPointerDown={event => {
          if (disabled || !event.isPrimary || event.button !== 0) return
          const location = geometry(event.clientX, event.clientY)
          if (location.radius < RADIUS - 24 || location.radius > RADIUS + 24) return
          event.preventDefault()
          event.currentTarget.focus()
          event.currentTarget.setPointerCapture(event.pointerId)
          const rawHz = clampFrequency(valueRef.current * 2 ** turnDelta(ratePhase(valueRef.current, settings), location.phase), min, max)
          const group = crypto.randomUUID()
          drag.current = { phase: location.phase, group, rawHz, level: location.level }
          setPrecision(location.level)
          setPointer(location.preview)
          emit(snapRate(rawHz, min, max, settings, location.level), group)
        }}
        onPointerMove={move} onPointerUp={finishDrag}
        onPointerCancel={() => { drag.current = null; setPointer(null) }}
        onLostPointerCapture={() => { drag.current = null; setPointer(null) }}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="frequency-ring-back"/>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="frequency-ring"/>
        <path d="M 116 13 L 120 7 L 124 13 Z" className="rate-clock-notch"/>
        {ticks.map((tick, i) => {
          const inner = point(tick.phase, tick.major ? 77 : 82)
          const outer = point(tick.phase, 86)
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className={tick.major ? 'frequency-tick-major' : 'frequency-tick'}/>
        })}
        <circle cx={handle.x} cy={handle.y} r="10" className="frequency-handle"/>
        <circle cx={handle.x} cy={handle.y} r="3" className="frequency-handle-center"/>
      </svg>
      <div className="frequency-center">
        <span className="frequency-center-label">RATE</span>
        {editing ? <input className="frequency-entry" aria-label={`${label} in ${unit}`} autoFocus inputMode="decimal" value={draft} maxLength={24} onFocus={e => e.currentTarget.select()} onChange={e => setDraft(e.target.value)} onBlur={finishEntry} onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelled.current = true; e.currentTarget.blur() }
        }}/> : <button ref={readoutRef} className="frequency-readout" style={{ fontSize: readout.length > 10 ? 16 : readout.length > 8 ? 21 : 30 }} disabled={disabled} aria-label={`Edit ${label.toLowerCase()}, ${readout} ${unit}`} title={`Click to enter ${unit}; scroll over a digit to adjust its place`} onClick={() => { setDraft(String(Number(rateInUnit(value, unit).toPrecision(15)))); setEditing(true); setError('') }}>{readout}</button>}
        <div className="rate-unit-switch" role="group" aria-label={`${label} units`}>{(['BPM', 'Hz'] as const).map(option => <button key={option} disabled={disabled} aria-pressed={unit === option} onClick={() => { onUnitChange(option); setError('') }}>{option}</button>)}</div>
      </div>
    </div>
    <div className="rate-precision-status" role="status">{precisionText}</div>
    <div className="frequency-octaves"><button disabled={disabled || value / 2 < min} aria-label={`Halve ${label.toLowerCase()}`} onClick={() => emit(shiftFrequency(value, -1200, min, max))}>÷ 2</button><span>1 turn = double rate</span><button disabled={disabled || value * 2 > max} aria-label={`Double ${label.toLowerCase()}`} onClick={() => emit(shiftFrequency(value, 1200, min, max))}>× 2</button></div>
    {rateContext}
    <p id={`${id}-help`} className="frequency-help">On track: snap to landmarks.<br/>Hold and pull outward for finer steps.<br/>Arrows: step · Shift: finer · Page: ×2/÷2.<br/>Click the value for unsnapped {unit} entry.</p>
    <PickerConfiguration settings={settings} kind={kind} unit={unit} label={label} disabled={disabled} landmarkRootHz={landmarkRootHz} onChange={next => { setPrecision(0); onSettingsChange(next) }}/>
    {error && <p className="frequency-error" role="alert">{error}</p>}
    {pointer && portalTarget && createPortal(<div className="rate-drag-overlay" aria-hidden="true">
      <svg><line x1={pointer.centerX + (pointer.x - pointer.centerX) / dragLength * pointer.trackRadius} y1={pointer.centerY + (pointer.y - pointer.centerY) / dragLength * pointer.trackRadius} x2={pointer.x} y2={pointer.y}/><circle cx={pointer.x} cy={pointer.y} r="6"/></svg>
      <div className="rate-drag-caption" style={{ left: Math.max(8, Math.min(window.innerWidth - 210, pointer.x + 18)), top: Math.max(8, Math.min(window.innerHeight - 75, pointer.y + 18)) }}><strong>{precisionText}</strong><span>{readout} {unit}</span></div>
    </div>, portalTarget)}
  </div>
}
