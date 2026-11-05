export type PolyphonicTuning = {note: number; cents: number | null; confidence: number};
const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

// Use only isolated, mutually consistent partials. Shared harmonics cannot tell
// us which string is detuned, so omit them rather than inventing precision.
export function estimatePolyphonicTuning(spectrum: Float32Array, sampleRate: number, fftSize: number, notes: number[]): PolyphonicTuning[] {
  const binHz = sampleRate / fftSize;
  const floorSamples = Array.from(spectrum.filter((_, index) => index > 2 && index % 16 === 0))
    .filter(Number.isFinite).sort((a, b) => a - b);
  const noise = floorSamples[Math.floor(floorSamples.length / 2)] ?? -120;
  return [...new Set(notes)].map(note => {
    const fundamental = frequency(note);
    const partials: {cents: number; harmonic: number; prominence: number}[] = [];
    for (let harmonic = 1; harmonic <= 6; harmonic++) {
      const expected = fundamental * harmonic;
      if (expected >= Math.min(8000, sampleRate / 2 - binHz * 3)) break;
      const shared = notes.some(other => other !== note && Array.from({length: 12}, (_, h) => frequency(other) * (h + 1))
        .some(hz => Math.abs(hz - expected) < Math.max(binHz * 3, expected * 0.025)));
      if (shared) continue;
      const low = Math.max(2, Math.floor(expected * 2 ** (-45 / 1200) / binHz) - 1);
      const high = Math.min(spectrum.length - 2, Math.ceil(expected * 2 ** (45 / 1200) / binHz) + 1);
      let peak = -1;
      for (let bin = low; bin <= high; bin++) {
        if (spectrum[bin] > spectrum[bin - 1] && spectrum[bin] >= spectrum[bin + 1]
          && (peak < 0 || spectrum[bin] > spectrum[peak])) peak = bin;
      }
      if (peak < 0 || spectrum[peak] < Math.max(-95, noise + 18)) continue;
      const a = spectrum[peak - 1], b = spectrum[peak], c = spectrum[peak + 1];
      const curvature = a - 2 * b + c;
      if (!Number.isFinite(curvature) || curvature >= -0.01) continue;
      const offset = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / curvature));
      const cents = 1200 * Math.log2((peak + offset) * binHz / expected);
      if (Math.abs(cents) <= 45) partials.push({cents, harmonic, prominence: b - noise});
    }
    // Find agreement before averaging: one strong wrong harmonic must not pull
    // a string's tuning estimate away from the other partials.
    const groups = partials.map(p => partials.filter(other => Math.abs(other.cents - p.cents) <= 8));
    const consistent = groups.sort((a, b) => b.length - a.length)[0] ?? [];
    const soloFundamental = notes.length === 1 && consistent.length === 1 && consistent[0].harmonic === 1 && consistent[0].prominence >= 24;
    if ((!soloFundamental && consistent.length < 2) || !consistent.some(p => p.harmonic <= 3))
      return {note, cents: null, confidence: 0};
    const weight = consistent.reduce((sum, p) => sum + 1 / p.harmonic, 0);
    const cents = consistent.reduce((sum, p) => sum + p.cents / p.harmonic, 0) / weight;
    return {note, cents, confidence: Math.min(1, consistent.length / 3) * Math.min(1, Math.min(...consistent.map(p => p.prominence)) / 30)};
  });
}

export class PolyphonicTuningStabilizer {
  private previous = new Map<number, {cents: number; frames: number}>();
  update(readings: PolyphonicTuning[]): PolyphonicTuning[] {
    const next = new Map<number, {cents: number; frames: number}>();
    const result = readings.map(reading => {
      if (reading.cents === null) return reading;
      const old = this.previous.get(reading.note);
      const close = old && Math.abs(old.cents - reading.cents) <= 10;
      const state = {cents: close ? old.cents * 0.6 + reading.cents * 0.4 : reading.cents, frames: close ? old.frames + 1 : 1};
      next.set(reading.note, state);
      return {...reading, cents: state.frames >= 2 ? state.cents : null};
    });
    this.previous = next;
    return result;
  }
}
