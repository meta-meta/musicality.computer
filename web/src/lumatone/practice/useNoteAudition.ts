import {useCallback, useEffect, useRef, useState} from 'react';
import {sound} from './sound.ts';

// Shared by the practice transport and transcription cards. No microphone or
// transport is created: the preview context starts only after a user action.
export function useNoteAudition(setError: (message: string) => void, harmonyVolume = 35) {
  const [previewNote, setPreviewNote] = useState<number | null>(null);
  const previewContext = useRef<AudioContext>();
  const previewVoice = useRef<() => void>();
  const previewRequest = useRef(0);
  const previewTimer = useRef<number>();
  const volume = useRef(harmonyVolume);
  useEffect(() => {volume.current = harmonyVolume;}, [harmonyVolume]);
  const releasePreview = useCallback(() => {
    previewRequest.current++;
    window.clearTimeout(previewTimer.current);
    previewVoice.current?.();
    previewVoice.current = undefined;
    const context = previewContext.current;
    previewContext.current = undefined;
    if (context) void context.close().catch(() => {});
  }, []);
  useEffect(() => releasePreview, [releasePreview]);

  const audition = async (notes: number[], duration: number, volume: number, attack = 0.008, releaseTime = 0.03, highlight: number | null = null) => {
    const request = ++previewRequest.current;
    const focusedElement = document.activeElement;
    setError('');
    try {
      const context = previewContext.current ??= new AudioContext();
      await context.resume();
      if (request !== previewRequest.current || context !== previewContext.current) return;
      window.clearTimeout(previewTimer.current);
      setPreviewNote(highlight);
      previewVoice.current?.();
      const at = context.currentTime;
      const voices = notes.map(note => sound(context, 440 * 2 ** ((note - 69) / 12), at,
        duration, volume / Math.sqrt(notes.length), context.destination, attack, releaseTime));
      previewVoice.current = () => voices.forEach(voice => voice.stopAt(context.currentTime + 0.02));
      previewTimer.current = window.setTimeout(() => {
        if (request !== previewRequest.current) return;
        setPreviewNote(null);
        if (document.activeElement === focusedElement && (focusedElement instanceof HTMLElement || focusedElement instanceof SVGElement)) focusedElement.blur();
      }, duration * 1000);
    } catch (reason) {
      if (request === previewRequest.current) {
        setPreviewNote(null);
        setError(reason instanceof Error ? reason.message : 'The guide tone could not play.');
      }
    }
  };
  const playNote = (note: number) => audition([note], 0.6, 0.07, 0.008, 0.03, note);
  const playChord = (notes: number[]) => audition(notes, 1.2, 0.08 * volume.current / 100, 0.07, 0.18);

  return {previewNote, setPreviewNote, releasePreview, playNote, playChord};
}
