import type {Pitch} from './pitch.ts';

// MIDI wind-controller state, kept free of browser APIs so it can be tested.
// Assumptions: twelve-tone equal temperament at A4 = 440 Hz; one player, so
// MIDI channels are merged; the controller's bend range is not transmitted and
// must be supplied (±2 semitones is the common synth default).
export const EWI_BEND_RANGES = [1, 2, 12];
export const DEFAULT_EWI_BEND_RANGE = 2;
// Breath arrives on different messages depending on the controller's setup.
const BREATH_CONTROLLERS = [2, 7, 11];

// `note` is the fingered MIDI note; `bend` is in semitones; `breath` is 0–1.
// `pitch` is the sounding pitch (fingered note plus bend) in the same form as a
// microphone reading: nearest note, cents from it, and breath as the level.
export type EwiReading = {note: number; bend: number; breath: number; pitch: Pitch};

export class EwiTracker {
  articulation = 0;
  private held: number[] = [];
  private velocity = 0;
  private breath: number | null = null;
  private bend = 0;
  constructor(public bendRange = DEFAULT_EWI_BEND_RANGE) {}

  reset() {
    this.held = [];
    this.velocity = 0;
    this.breath = null;
    this.bend = 0;
  }

  // Returns true when a different note starts sounding (an entrance).
  handle(data: ArrayLike<number>): boolean {
    const status = data[0] & 0xf0, first = data[1] ?? 0, second = data[2] ?? 0;
    if (status === 0x90 && second > 0) {
      this.held = [...this.held.filter(note => note !== first), first];
      this.velocity = second;
      this.articulation++;
      return true;
    }
    if (status === 0x80 || status === 0x90) {
      const current = this.held[this.held.length - 1];
      this.held = this.held.filter(note => note !== first);
      // Releasing the sounding note while an earlier one is still held returns to it.
      if (current !== first || !this.held.length) return false;
      this.articulation++;
      return true;
    }
    if (status === 0xb0) {
      if (BREATH_CONTROLLERS.includes(first)) this.breath = second / 127;
      else if (first === 120 || first === 123) this.held = [];
    } else if (status === 0xd0) this.breath = first / 127;
    else if (status === 0xe0) this.bend = Math.max(-1, ((second << 7 | first) - 8192) / 8191);
    return false;
  }

  reading(): EwiReading | null {
    const note = this.held[this.held.length - 1];
    if (note === undefined) return null;
    const bend = this.bend * this.bendRange;
    // Until a breath message arrives, the attack velocity stands in for it.
    const breath = this.breath ?? this.velocity / 127;
    const midi = note + bend, nearest = Math.round(midi);
    return {note, bend, breath, pitch: {frequency: 440 * 2 ** ((midi - 69) / 12), note: nearest, cents: (midi - nearest) * 100, clarity: 1, rms: breath}};
  }
}

// A guess from the port name only, used to preselect EWI In; the user can
// always choose another input under MIDI configuration.
export function looksLikeWindController(label: string): boolean {
  return /\b(ewi|aerophone|nuwind|nurad|sylphyo|travel ?sax|wx-?[57]|yds-?\d+|elefue|robkoo|wind ?(controller|synth|instrument))/i.test(label);
}
