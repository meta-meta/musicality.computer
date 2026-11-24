export const MIN_FREQUENCY = 20
export const MAX_FREQUENCY = 2000

export const wrapTurn = (turn: number) => ((turn % 1) + 1) % 1
export const frequencyPhase = (frequency: number) => wrapTurn(Math.log2(frequency))

// Unwrap the shortest motion between consecutive samples, including the top seam.
export function turnDelta(previous: number, next: number) {
  const delta = wrapTurn(next - previous + .5) - .5
  return delta === -.5 && next > previous ? .5 : delta
}

export const clampFrequency = (frequency: number, min = MIN_FREQUENCY, max = MAX_FREQUENCY) => Math.max(min, Math.min(max, frequency))
export const shiftFrequency = (frequency: number, cents: number, min = MIN_FREQUENCY, max = MAX_FREQUENCY) => clampFrequency(frequency * 2 ** (cents / 1200), min, max)

export function frequencyFromDrag(frequency: number, previousPhase: number, nextPhase: number, min = MIN_FREQUENCY, max = MAX_FREQUENCY) {
  return shiftFrequency(frequency, turnDelta(previousPhase, nextPhase) * 1200, min, max)
}

export const formatFrequency = (frequency: number) => frequency.toFixed(frequency < 100 ? 2 : frequency < 1000 ? 1 : 0)

export type RateUnit = 'Hz' | 'BPM'
export const rateInUnit = (hertz: number, unit: RateUnit) => unit === 'BPM' ? hertz * 60 : hertz
export const rateInHertz = (value: number, unit: RateUnit) => unit === 'BPM' ? value / 60 : value
export const formatRate = (hertz: number, unit: RateUnit) => formatFrequency(rateInUnit(hertz, unit))

// The readout is monospaced: map the hovered character to its decimal place.
export function decimalPlaceAt(text: string, fraction: number) {
  const index = Math.max(0, Math.min(text.length - 1, Math.floor(fraction * text.length)))
  if (text[index] === '.') return 0
  const decimal = text.indexOf('.') < 0 ? text.length : text.indexOf('.')
  return 10 ** (decimal - index - (index < decimal ? 1 : 0))
}
