import {useCallback, useEffect, useRef, useState} from 'react';
import type {Detector} from '@markusstrasser/pitchplease';
import {estimatePolyphonicTuning, PolyphonicTuningStabilizer} from './polyphonicTuning.ts';
import type {PolyphonicTuning} from './polyphonicTuning.ts';
import {PolyphonicNoteTracker} from './polyphonicNotes.ts';
import type {PolyphonicReading} from './polyphonicNotes.ts';

export function usePolyphonicInput(onReading: (reading: PolyphonicReading) => void) {
  const [notes, setNotes] = useState<number[]>([]);
  const [tunings, setTunings] = useState<PolyphonicTuning[]>([]);
  const audio = useRef<{context: AudioContext; stream: MediaStream; source: MediaStreamAudioSourceNode; analyser: AnalyserNode; mute: GainNode}>();
  const [status, setStatus] = useState<'off' | 'starting' | 'listening'>('off');
  const [error, setError] = useState('');
  const [delayMs, setDelayMs] = useState<number | null>(null);
  const detector = useRef<Detector>();
  const generation = useRef(0);
  const callback = useRef(onReading); callback.current = onReading;
  const stop = useCallback(() => {
    generation.current++;
    detector.current?.stop(); detector.current = undefined;
    const capture = audio.current; audio.current = undefined;
    if (capture) {
      capture.stream.getTracks().forEach(track => track.stop());
      capture.source.disconnect(); capture.analyser.disconnect(); capture.mute.disconnect();
      void capture.context.close().catch(() => {});
    }
    setTunings([]); setNotes([]); setDelayMs(null); setStatus('off');
  }, []);
  useEffect(() => stop, [stop]);
  const start = async () => {
    stop(); setStatus('starting'); setError('');
    const token = generation.current;
    try {
      const {create} = await import('@markusstrasser/pitchplease');
      if (token !== generation.current) return false;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires localhost or HTTPS.');
      const stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1}});
      if (token !== generation.current) {stream.getTracks().forEach(track => track.stop()); return false;}
      let context: AudioContext;
      try {context = new AudioContext();}
      catch (reason) {stream.getTracks().forEach(track => track.stop()); throw reason;}
      // Both detectors share one capture stream. No audio is routed to speakers.
      let source: MediaStreamAudioSourceNode | undefined;
      try {
        source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = Math.min(32768, 2 ** Math.ceil(Math.log2(context.sampleRate * 0.3)));
        analyser.smoothingTimeConstant = 0;
        const mute = context.createGain(); mute.gain.value = 0;
        source.connect(analyser); analyser.connect(mute); mute.connect(context.destination);
        audio.current = {context, stream, source, analyser, mute};
        await context.resume();
      } catch (reason) {
        source?.disconnect(); stream.getTracks().forEach(track => track.stop());
        if (context.state !== 'closed') void context.close().catch(() => {});
        throw reason;
      }
      if (token !== generation.current) return false;
      stream.getAudioTracks()[0]?.addEventListener('ended', stop, {once: true});
      const capture = audio.current!;
      const spectrum = new Float32Array(capture.analyser.frequencyBinCount);
      const readyAt = context.currentTime + capture.analyser.fftSize / context.sampleRate;
      const tuningStabilizer = new PolyphonicTuningStabilizer();
      let lastTuning = -Infinity;
      const tracker = new PolyphonicNoteTracker();
      let signature = '', lastStats = -Infinity, clockOffset = Infinity;
      const current = create({
        model: 'piano',
        onNotes: (detected, frame) => {
          if (token !== generation.current) return;
          const now = performance.now();
          // The minimum receipt offset removes main-thread queue jitter while
          // retaining the model's capture time, rather than its delivery time.
          clockOffset = Math.min(clockOffset, now - frame.emitTime * 1000);
          const delay = Math.max(0, (frame.emitTime - frame.time) * 1000);
          const reading = tracker.update(detected, clockOffset + frame.time * 1000, delay);
          const next = reading.notes.map(note => note.note).join(',');
          if (signature !== next) {signature = next; setNotes(reading.notes.map(note => note.note)); setTunings(current => current.filter(tuning => reading.notes.some(note => note.note === tuning.note)));}
          if (now - lastTuning >= 100 && context.currentTime >= readyAt) {
            lastTuning = now;
            capture.analyser.getFloatFrequencyData(spectrum);
            const estimates = estimatePolyphonicTuning(spectrum, context.sampleRate, capture.analyser.fftSize, reading.notes.map(note => note.note));
            setTunings(tuningStabilizer.update(estimates));
          }
          if (now - lastStats >= 1000) {lastStats = now; setDelayMs(Math.round(delay));}
          callback.current(reading);
        },
        onError: reason => {
          if (token !== generation.current) return;
          stop(); setError(reason.message);
        },
      });
      detector.current = current;
      const running = await current.start(stream);
      if (token !== generation.current) {current.stop(); return false;}
      if (!running) {stop(); return false;}
      setStatus('listening'); return true;
    } catch (reason) {
      if (token !== generation.current) return false;
      stop(); setError(reason instanceof Error ? reason.message : 'Polyphonic input could not start.'); return false;
    }
  };
  return {notes, tunings, status, error, delayMs, start, stop, pitch: null, setup: null};
}
