import {useCallback, useEffect, useRef, useState} from 'react';
import {WebMidi} from 'webmidi';
import type {MessageEvent} from 'webmidi';
import {useAppSelector} from '../../redux/hooks.ts';
import {MidiStatus} from '../../redux/midiReducer.ts';
import {EwiTracker} from './ewi.ts';
import type {EwiReading} from './ewi.ts';
import type {Entrance} from './pitch.ts';
import type {AudioSetup} from './timingCalibration.ts';

// A MIDI wind controller as a stand-in for the microphone: the same entrance
// and continuous-reading callbacks, with event timestamps on the
// performance.now() timeline. The device handle stays out of Redux.
export function useEwiInput(onEntrance: (entrance: Entrance) => void,
  onReading: ((reading: Entrance | null, articulation: number) => void) | undefined, bendRange: number, active: boolean) {
  const inputId = useAppSelector(s => s.midi.ewiIn);
  const midiStatus = useAppSelector(s => s.midi.midiStatus);
  const inputs = useAppSelector(s => s.midi.inputs);
  const [reading, setReading] = useState<EwiReading | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const callback = useRef(onEntrance);
  const readingCallback = useRef(onReading);
  useEffect(() => {callback.current = onEntrance;}, [onEntrance]);
  useEffect(() => {readingCallback.current = onReading;}, [onReading]);
  const available = midiStatus === MidiStatus.Enabled && Boolean(inputId) && inputs.some(input => input.value === inputId);
  const listening = active && enabled && available;

  useEffect(() => {
    setReading(null);
    if (!listening || !WebMidi.enabled || !inputId) return;
    const input = WebMidi.getInputById(inputId);
    if (!input) return;
    const tracker = new EwiTracker(bendRange);
    const message = (event: MessageEvent) => {
      if (!tracker.handle(event.message.data)) return;
      const current = tracker.reading();
      if (current) callback.current({pitch: current.pitch, time: event.timestamp});
    };
    const clear = () => tracker.reset();
    // Breath and bend arrive far faster than the display needs: publish once
    // per frame, and only when something visible changed.
    let frame = 0, shown: EwiReading | null = null;
    const publish = (now: number) => {
      const current = tracker.reading();
      if (current?.note !== shown?.note || current?.bend !== shown?.bend || current?.breath !== shown?.breath) {
        shown = current;
        setReading(current);
      }
      readingCallback.current?.(current ? {pitch: current.pitch, time: now} : null, tracker.articulation);
      frame = requestAnimationFrame(publish);
    };
    frame = requestAnimationFrame(publish);
    input.addListener('midimessage', message);
    input.addListener('disconnected', clear);
    return () => {
      cancelAnimationFrame(frame);
      input.removeListener('midimessage', message);
      input.removeListener('disconnected', clear);
    };
  }, [listening, inputId, bendRange]);

  useEffect(() => {if (available) setError('');}, [available]);
  const start = useCallback(async () => {
    setEnabled(true);
    if (!available) setError('Select a connected EWI In device under MIDI configuration.');
    return available;
  }, [available]);
  const stop = useCallback(() => setEnabled(false), []);
  return {pitch: reading?.pitch ?? null, reading, status: listening ? 'listening' as const : 'off' as const,
    error, setup: null as AudioSetup | null, start, stop};
}
