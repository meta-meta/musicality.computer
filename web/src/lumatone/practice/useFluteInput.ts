import {startTransition, useCallback, useEffect, useRef, useState} from 'react';
import {detectPitch, EntranceTracker, PitchStabilizer} from './pitch.ts';
import type {Entrance, Pitch} from './pitch.ts';

type Input = {context: AudioContext; stream: MediaStream; source: MediaStreamAudioSourceNode; analyser: AnalyserNode; mute: GainNode; frame: number};

export function useFluteInput(onEntrance: (entrance: Entrance) => void,
  onReading?: (reading: Entrance | null, articulation: number) => void) {
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [status, setStatus] = useState<'off' | 'starting' | 'listening'>('off');
  const [error, setError] = useState('');
  const input = useRef<Input>();
  const generation = useRef(0);
  const callback = useRef(onEntrance);
  const readingCallback = useRef(onReading);
  useEffect(() => {callback.current = onEntrance;}, [onEntrance]);
  useEffect(() => {readingCallback.current = onReading;}, [onReading]);

  const release = useCallback(() => {
    generation.current++;
    const current = input.current;
    input.current = undefined;
    if (!current) return;
    cancelAnimationFrame(current.frame);
    current.stream.getTracks().forEach(track => track.stop());
    current.source.disconnect();
    current.analyser.disconnect();
    current.mute.disconnect();
    void current.context.close().catch(() => {});
  }, []);
  useEffect(() => release, [release]);

  const stop = useCallback(() => {
    release();
    setStatus('off');
    setPitch(null);
  }, [release]);

  const start = async () => {
    release();
    const token = generation.current;
    setStatus('starting');
    setError('');
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires localhost or HTTPS and a browser with microphone support.');
      stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1}});
      if (token !== generation.current) {stream.getTracks().forEach(track => track.stop()); return false;}
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(analyser);
      analyser.connect(mute);
      mute.connect(context.destination);
      const current: Input = {context, source, analyser, mute, stream, frame: 0};
      input.current = current;
      await context.resume();
      if (token !== generation.current) return false;
      const samples = new Float32Array(analyser.fftSize);
      const stabilizer = new PitchStabilizer();
      // The stabilizer already confirms two frames; don't add another delay.
      const tracker = new EntranceTracker(1);
      let articulation = 0;
      let lastFrame = -Infinity;
      const read = (now: number) => {
        if (input.current !== current) return;
        if (now - lastFrame >= 30) {
          lastFrame = now;
          analyser.getFloatTimeDomainData(samples);
          const detected = detectPitch(samples, current.context.sampleRate);
          // Timestamp the center of the captured waveform rather than the UI update.
          const time = now - samples.length / current.context.sampleRate * 500;
          const stable = stabilizer.update(detected, time);
          startTransition(() => setPitch(stable?.pitch ?? null));
          const entrance = tracker.update(stable?.pitch ?? null, stable?.time ?? time);
          if (entrance) {
            articulation++;
            callback.current(entrance);
          }
          // Continuous feedback lets free-time practice accept a held note
          // after count-in or a tuning correction, without another attack.
          readingCallback.current?.(stable, articulation);
        }
        current.frame = requestAnimationFrame(read);
      };
      current.frame = requestAnimationFrame(read);
      stream.getAudioTracks()[0]?.addEventListener('ended', stop, {once: true});
      setStatus('listening');
      return true;
    } catch (reason) {
      stream?.getTracks().forEach(track => track.stop());
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      if (token !== generation.current) return false;
      input.current = undefined;
      setStatus('off');
      setError(reason instanceof Error ? reason.message : 'The microphone could not start.');
      return false;
    }
  };
  return {pitch, status, error, start, stop};
}
