import { clampFrequency, rateInUnit, wrapTurn, type RateUnit } from './frequency.ts'

export type RateKind = 'frequency' | 'tempo'
export type InstrumentReference = 'concert' | 'bb' | 'eb' | 'f' | 'custom'
export interface PickerSettings {
  reference: 'c' | 'one-hz' | 'custom'
  customReferenceHz: number
  a4Hz: number
  instrument: InstrumentReference
  customTranspose: number
  tuningRoot: 'c' | 'custom'
  customTuningHz: number
  landmarks: 'equal' | 'ratios' | 'bpm' | 'none'
  divisions: number
  ratios: number[]
  bpmStep: number
  precisionBand: number
}

export const MAX_PRECISION = 8
export const instrumentOffsets: Record<InstrumentReference, number> = { concert: 0, bb: -2, eb: -9, f: -7, custom: 0 }
export const defaultPickerSettings = (kind: RateKind): PickerSettings => ({
  reference: kind === 'frequency' ? 'c' : 'one-hz', customReferenceHz: 1,
  a4Hz: 440, instrument: 'concert', customTranspose: 0,
  tuningRoot: 'c', customTuningHz: 261.6255653005986,
  landmarks: kind === 'frequency' ? 'equal' : 'bpm', divisions: 12,
  ratios: [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8],
  bpmStep: 1, precisionBand: .35,
})

export function writtenCHz(settings: PickerSettings) {
  const transpose = settings.instrument === 'custom' ? settings.customTranspose : instrumentOffsets[settings.instrument]
  // This named-C preset is explicitly the 12-TET C4 relative to tuned A4.
  return settings.a4Hz * 2 ** ((-9 + transpose) / 12)
}

export const tuningRootHz = (settings: PickerSettings) => settings.tuningRoot === 'custom' ? settings.customTuningHz : writtenCHz(settings)

export function clockReferenceHz(settings: PickerSettings) {
  return settings.reference === 'c' ? writtenCHz(settings) : settings.reference === 'one-hz' ? 1 : settings.customReferenceHz
}

export const ratePhase = (hertz: number, settings: PickerSettings) => wrapTurn(Math.log2(hertz / clockReferenceHz(settings)))

export function precisionAtRadius(radius: number, trackRadius: number, band: number) {
  const edge = trackRadius + 10
  return radius <= edge ? 0 : Math.min(MAX_PRECISION, 1 + Math.floor((radius - edge) / (trackRadius * band)))
}

export function baseLandmarkPhases(settings: PickerSettings): number[] {
  if (settings.landmarks === 'equal') return Array.from({ length: settings.divisions }, (_, i) => i / settings.divisions)
  if (settings.landmarks === 'ratios') return [...new Set([0, ...settings.ratios.map(ratio => Math.log2(ratio)).filter(phase => phase >= 0 && phase < 1)])].sort((a, b) => a - b)
  return []
}

// Only neighbors of the current value and range boundaries are needed, even at 2^8 precision.
function frequencyCandidates(hertz: number, min: number, max: number, settings: PickerSettings, level: number) {
  const root = tuningRootHz(settings)
  const phases = baseLandmarkPhases(settings)
  const subdivisions = 2 ** level
  const low = Math.log2(min / root)
  const high = Math.log2(max / root)
  const current = Math.log2(hertz / root)
  const candidates: number[] = []
  for (let octave = Math.floor(low); octave <= Math.floor(high); octave++) {
    phases.forEach((phase, i) => {
      const start = octave + phase
      const end = octave + (phases[i + 1] ?? 1)
      const width = (end - start) / subdivisions
      const first = Math.max(0, Math.ceil((low - start) / width - 1e-9))
      const last = Math.min(subdivisions, Math.floor((high - start) / width + 1e-9))
      if (first > last) return
      const nearest = Math.round((current - start) / width)
      for (const index of [nearest - 1, nearest, nearest + 1, first, last]) {
        if (index >= first && index <= last) candidates.push(clampFrequency(root * 2 ** (start + index * width), min, max))
      }
    })
  }
  return candidates
}

function candidatesForRate(hertz: number, min: number, max: number, settings: PickerSettings, level: number) {
  if (settings.landmarks === 'none') return []
  if (settings.landmarks !== 'bpm') return frequencyCandidates(hertz, min, max, settings, level)
  const step = settings.bpmStep / 10 ** level
  const first = Math.ceil(min * 60 / step - 1e-7)
  const last = Math.floor(max * 60 / step + 1e-7)
  const nearest = Math.round(hertz * 60 / step)
  return [first, last, nearest - 1, nearest, nearest + 1].filter(index => index >= first && index <= last).map(index => clampFrequency(index * step / 60, min, max))
}

export function snapRate(hertz: number, min: number, max: number, settings: PickerSettings, level = 0) {
  const bounded = clampFrequency(hertz, min, max)
  const candidates = candidatesForRate(bounded, min, max, settings, level)
  const distance = (candidate: number) => settings.landmarks === 'bpm' ? Math.abs(candidate - bounded) : Math.abs(Math.log2(candidate / bounded))
  return candidates.reduce((best, candidate) => distance(candidate) < distance(best) ? candidate : best, candidates[0] ?? bounded)
}

export function nextLandmark(hertz: number, direction: number, min: number, max: number, settings: PickerSettings, level = 0) {
  if (settings.landmarks === 'none') return clampFrequency(hertz * 2 ** (direction / 1200), min, max)
  const candidates = candidatesForRate(hertz, min, max, settings, level)
    .filter(candidate => direction > 0 ? candidate - hertz > Number.EPSILON * Math.max(1, hertz) * 4 : hertz - candidate > Number.EPSILON * Math.max(1, hertz) * 4)
  return candidates.length ? (direction > 0 ? Math.min(...candidates) : Math.max(...candidates)) : hertz
}

export function precisionLabel(settings: PickerSettings, level: number) {
  if (settings.landmarks === 'none') return 'Free rate · no snapping'
  if (settings.landmarks === 'bpm') return `${Number((settings.bpmStep / 10 ** level).toPrecision(8))} BPM · 10^${level}`
  if (settings.landmarks === 'equal') return `${Number((1200 / settings.divisions / 2 ** level).toPrecision(8))} cents · 2^${level}`
  return `Ratio gaps ÷ ${2 ** level} · 2^${level}`
}

export interface LandmarkTick { phase: number; major: boolean }
export function landmarkTicks(hertz: number, min: number, max: number, settings: PickerSettings, level: number): LandmarkTick[] {
  if (settings.landmarks === 'none') return []
  const ticks: LandmarkTick[] = []
  if (settings.landmarks === 'bpm') {
    const reference = clockReferenceHz(settings)
    const start = reference * 2 ** Math.floor(Math.log2(hertz / reference)) * 60
    const end = start * 2
    const low = Math.max(min * 60, start), high = Math.min(max * 60, end)
    const count = Math.floor((high - low) / settings.bpmStep)
    const stride = Math.max(1, Math.ceil(count / 140))
    for (let index = Math.ceil(low / settings.bpmStep); index * settings.bpmStep <= high + 1e-9; index += stride) ticks.push({ phase: ratePhase(index * settings.bpmStep / 60, settings), major: true })
    if (level) {
      const fineStep = settings.bpmStep / 10 ** level
      const nearest = Math.round(hertz * 60 / fineStep)
      for (let i = -6; i <= 6; i++) {
        const bpm = (nearest + i) * fineStep
        if (bpm >= low && bpm <= high) ticks.push({ phase: ratePhase(bpm / 60, settings), major: false })
      }
    }
    return ticks
  }
  const root = tuningRootHz(settings)
  const phases = baseLandmarkPhases(settings)
  const subdivisions = 2 ** level
  phases.forEach((phase, i) => {
    const end = phases[i + 1] ?? 1
    ticks.push({ phase: wrapTurn(Math.log2(root / clockReferenceHz(settings)) + phase), major: true })
    if (phases.length * subdivisions <= 120) for (let k = 1; k < subdivisions; k++) ticks.push({ phase: wrapTurn(Math.log2(root / clockReferenceHz(settings)) + phase + (end - phase) * k / subdivisions), major: false })
  })
  if (phases.length * subdivisions > 120) {
    const base = Math.log2(hertz / root)
    const octave = Math.floor(base), phase = wrapTurn(base)
    let i = -1
    phases.forEach((p, index) => { if (p <= phase) i = index })
    const left = phases[Math.max(0, i)], right = phases[i + 1] ?? 1
    const width = (right - left) / subdivisions
    const center = Math.round((phase - left) / width)
    for (let k = -6; k <= 6; k++) ticks.push({ phase: ratePhase(root * 2 ** (octave + left + (center + k) * width), settings), major: false })
  }
  return ticks
}

export function parseRatios(text: string) {
  const tokens = text.split(/[\s,;]+/).filter(Boolean)
  if (!tokens.length || tokens.length > 72) throw new Error('Enter 1–72 ratios, such as 1, 5/4, 3/2.')
  const values = tokens.map(token => {
    const parts = token.split('/')
    const value = parts.length === 1 ? Number(parts[0]) : parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : NaN
    if (!Number.isFinite(value) || value < 1 || value > 2) throw new Error('Use octave ratios from 1 to 2; fractions such as 3/2 are supported.')
    return value === 2 ? 1 : value
  })
  return [...new Set([1, ...values])].sort((a, b) => a - b)
}

export function validatePickerSettings(value: unknown): PickerSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid picker settings.')
  const p = value as Record<string, unknown>
  if (!['c', 'one-hz', 'custom'].includes(String(p.reference)) || !['c', 'custom'].includes(String(p.tuningRoot)) || !['concert', 'bb', 'eb', 'f', 'custom'].includes(String(p.instrument)) || !['equal', 'ratios', 'bpm', 'none'].includes(String(p.landmarks))) throw new Error('Invalid picker mode.')
  for (const [key, low, high] of [['customReferenceHz', .000001, 1000000], ['customTuningHz', .000001, 1000000], ['a4Hz', 1, 20000], ['customTranspose', -48, 48], ['divisions', 2, 72], ['bpmStep', .001, 100], ['precisionBand', .15, 2]] as const) {
    const n = p[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < low || n > high) throw new Error(`Invalid ${key}.`)
  }
  if (!Number.isInteger(p.divisions) || !Array.isArray(p.ratios) || !p.ratios.length || p.ratios.length > 72 || p.ratios.some(r => typeof r !== 'number' || !Number.isFinite(r) || r < 1 || r >= 2)) throw new Error('Invalid landmark grid.')
  return { reference: p.reference as PickerSettings['reference'], instrument: p.instrument as InstrumentReference, landmarks: p.landmarks as PickerSettings['landmarks'], tuningRoot: p.tuningRoot as PickerSettings['tuningRoot'], customTuningHz: p.customTuningHz as number, customReferenceHz: p.customReferenceHz as number, a4Hz: p.a4Hz as number, customTranspose: p.customTranspose as number, divisions: p.divisions as number, ratios: [...p.ratios] as number[], bpmStep: p.bpmStep as number, precisionBand: p.precisionBand as number }
}

export const detailedRate = (hertz: number, unit: RateUnit) => String(Number(rateInUnit(hertz, unit).toPrecision(14)))
