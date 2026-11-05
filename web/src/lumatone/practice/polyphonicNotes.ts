export type DetectedPolyphonicNote = {note: number; confidence: number; articulation: number};
export type PolyphonicReading = {notes: DetectedPolyphonicNote[]; started: DetectedPolyphonicNote[]; time: number; delayMs: number};

// Track identity per pitch: a sustained chord must not create new attacks each frame.
export class PolyphonicNoteTracker {
  private active = new Map<number, number>();
  private serial = 0;
  update(notes: {midi: number; prob: number}[], time: number, delayMs: number): PolyphonicReading {
    const previous = this.active;
    this.active = new Map();
    // Simultaneous notes share an articulation so a held chord cannot open
    // several consecutive free-time melody gates by cycling its pitches.
    let onsetArticulation: number | undefined;
    const detected = notes.filter(note => Number.isInteger(note.midi) && note.midi >= 35 && note.midi <= 100 && Number.isFinite(note.prob))
      .map(({midi, prob}) => {
        const articulation = previous.get(midi) ?? (onsetArticulation ??= ++this.serial);
        this.active.set(midi, articulation);
        return {note: midi, confidence: prob, articulation};
      });
    return {notes: detected, started: detected.filter(note => !previous.has(note.note)), time, delayMs};
  }
}
