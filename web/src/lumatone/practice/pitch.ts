// Shared by live flute input and timing calibration.
export const PITCH_WINDOW = 2048;
export const PITCH_POLL_MS = 30;
export const capturedPitchTime = (now: number, sampleRate: number) => now - PITCH_WINDOW / sampleRate * 500;

export type Pitch = {frequency: number; note: number; cents: number; clarity: number; rms: number};

// YIN's cumulative mean normalized difference, with a parabolic lag estimate.
// de Cheveigné & Kawahara: https://iro.umontreal.ca/~pift6080/H09/documents/papers/yin_pitch_tracker.pdf
// Restrict the search to a monophonic flute register, not arbitrary room sound.
export function detectPitch(samples: Float32Array, sampleRate: number): Pitch | null {
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / samples.length);
  if (rms < 0.006) return null;
  const maxLag = Math.min(Math.floor(sampleRate / 180), Math.floor(samples.length / 2) - 1);
  const minLag = Math.floor(sampleRate / 2400);
  const differences = new Float32Array(maxLag + 1);
  let sum = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let difference = 0;
    for (let i = 0; i < samples.length / 2; i++) {
      const delta = samples[i] - samples[i + lag];
      difference += delta * delta;
    }
    sum += difference;
    differences[lag] = sum > 0 ? difference * lag / sum : 1;
  }
  for (let lag = Math.max(2, minLag); lag < maxLag; lag++) {
    if (differences[lag] >= 0.12) continue;
    while (lag + 1 < maxLag && differences[lag + 1] < differences[lag]) lag++;
    const left = differences[lag - 1], middle = differences[lag], right = differences[lag + 1];
    const denominator = left - 2 * middle + right;
    const refined = lag + (denominator ? (left - right) / (2 * denominator) : 0);
    const frequency = sampleRate / refined;
    if (frequency < 180 || frequency > 2400) return null;
    const midi = 69 + 12 * Math.log2(frequency / 440);
    const note = Math.round(midi);
    return {frequency, note, cents: (midi - note) * 100, clarity: 1 - middle, rms};
  }
  return null;
}

export type Entrance = {pitch: Pitch; time: number};

// Confirm changes with two readings. Near a semitone midpoint, allow a short
// 120ms settling period, rather than latching permanently to the previous note.
// Frequency/cents always describe the measurement, including during settling.
export class PitchStabilizer {
  private active: Pitch | null = null;
  private candidate: number | null = null;
  private candidateTime = 0;
  private count = 0;
  private quietSince: number | null = null;

  update(pitch: Pitch | null, time: number): Entrance | null {
    if (!pitch) {
      this.candidate = null;
      this.count = 0;
      this.quietSince ??= time;
      if (time - this.quietSince >= 25) this.active = null;
      return null;
    }
    this.quietSince = null;
    const midi = 69 + 12 * Math.log2(pitch.frequency / 440);
    if (this.active && pitch.note === this.active.note) {
      this.candidate = null;
      this.count = 0;
      this.active = {...pitch, note: this.active.note, cents: (midi - this.active.note) * 100};
      return {pitch: this.active, time};
    }
    if (pitch.note !== this.candidate) {
      this.candidate = pitch.note;
      this.candidateTime = time;
      this.count = 0;
    }
    const nearBoundary = this.active && Math.abs(midi - this.active.note) <= 0.65;
    if (++this.count >= 2 && (!nearBoundary || time - this.candidateTime >= 120)) {
      this.active = pitch;
      this.candidate = null;
      this.count = 0;
      return {pitch, time: this.candidateTime};
    }
    if (!this.active) return null;
    this.active = {...pitch, note: this.active.note, cents: (midi - this.active.note) * 100};
    return {pitch: this.active, time};
  }
}

// Require two consistent readings. A sustained pitch must not become a new
// entrance just because the score moves to another occurrence of that note.
export class EntranceTracker {
  constructor(private readonly requiredReadings = 2) {}

  private active: number | null = null;
  private candidate: number | null = null;
  private candidateTime = 0;
  private count = 0;
  private quietSince: number | null = null;

  update(pitch: Pitch | null, time: number): Entrance | null {
    if (!pitch) {
      this.candidate = null;
      this.count = 0;
      this.quietSince ??= time;
      if (time - this.quietSince >= 25) this.active = null;
      return null;
    }
    this.quietSince = null;
    if (pitch.note !== this.candidate) {
      this.candidate = pitch.note;
      this.candidateTime = time;
      this.count = 0;
    }
    this.count++;
    if (this.count < this.requiredReadings || this.active === pitch.note) return null;
    this.active = pitch.note;
    return {pitch, time: this.candidateTime};
  }
}
