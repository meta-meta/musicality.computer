import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {WebMidi} from 'webmidi';
import type {MessageEvent} from 'webmidi';
import {useAppSelector} from '../../redux/hooks.ts';
import {MidiStatus} from '../../redux/midiReducer.ts';
import {EwiTracker} from './ewi.ts';
import type {EwiReading, WindSource} from './ewi.ts';
import type {Entrance, Pitch} from './pitch.ts';
import type {AudioSetup} from './timingCalibration.ts';

// A MIDI wind controller as a stand-in for the microphone: the same entrance
// and continuous-reading callbacks, with event timestamps on the
// performance.now() timeline. The device handle stays out of Redux.
export function useEwiInput(onEntrance: (entrance: Entrance) => void,
  onReading: ((reading: Entrance | null, articulation: number) => void) | undefined, bendRange: number, active: boolean) {
  const inputId = useAppSelector(s => s.midi.ewiIn);
  const midiStatus = useAppSelector(s => s.midi.midiStatus);
  const inputs = useAppSelector(s => s.midi.inputs);
  // The reading is not React state: see WindSource.
  const store = useRef({note: null as number | null, pitch: null as Pitch | null, wind: null as {breath: number; bend: number} | null, listeners: new Set<() => void>()});
  const source = useMemo<WindSource>(() => ({
    subscribe: listener => {store.current.listeners.add(listener); return () => {store.current.listeners.delete(listener);};},
    getNote: () => store.current.note, getPitch: () => store.current.pitch, getWind: () => store.current.wind,
  }), []);
  const show = useCallback((current: EwiReading | null) => {
    const state = store.current;
    const note = current?.note ?? null;
    const noteChanged = note !== state.note, bendChanged = (current?.bend ?? 0) !== (state.wind?.bend ?? 0);
    const windChanged = bendChanged || (current === null) !== (state.wind === null) || current?.breath !== state.wind?.breath;
    if (!noteChanged && !windChanged) return;
    state.note = note;
    if (noteChanged || bendChanged || (current === null) !== (state.pitch === null)) state.pitch = current?.pitch ?? null;
    if (windChanged) state.wind = current ? {breath: current.breath, bend: current.bend} : null;
    state.listeners.forEach(listener => listener());
  }, []);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const callback = useRef(onEntrance);
  const readingCallback = useRef(onReading);
  useEffect(() => {callback.current = onEntrance;}, [onEntrance]);
  useEffect(() => {readingCallback.current = onReading;}, [onReading]);
  const available = midiStatus === MidiStatus.Enabled && Boolean(inputId) && inputs.some(input => input.value === inputId);
  const listening = active && enabled && available;

  useEffect(() => {
    show(null);
    if (!listening || !WebMidi.enabled || !inputId) return;
    const input = WebMidi.getInputById(inputId);
    if (!input) return;
    const tracker = new EwiTracker(bendRange);
    const message = (event: MessageEvent) => {
      const entered = tracker.handle(event.message.data);
      const current = tracker.reading();
      // A note starting or stopping is shown at once, without waiting for a frame.
      if ((current?.note ?? null) !== store.current.note) show(current);
      if (entered && current) callback.current({pitch: current.pitch, time: event.timestamp});
    };
    const clear = () => {tracker.reset(); show(null);};
    // Breath and bend arrive far faster than the display needs: publish once
    // per frame, and only when something visible changed.
    let frame = 0;
    const publish = (now: number) => {
      const current = tracker.reading();
      show(current);
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
  }, [listening, inputId, bendRange, show]);

  useEffect(() => {if (available) setError('');}, [available]);
  const start = useCallback(async () => {
    setEnabled(true);
    if (!available) setError('Select a connected EWI In device under MIDI configuration.');
    return available;
  }, [available]);
  const stop = useCallback(() => setEnabled(false), []);
  return {pitch: null as Pitch | null, source, status: listening ? 'listening' as const : 'off' as const,
    error, setup: null as AudioSetup | null, start, stop};
}
