import {startTransition, useCallback, useEffect, useRef, useState} from 'react';
import {END, exercise, harmonies, START} from './exercise.ts';
import {nextBeatTime, positionAtTime} from './transport.ts';
import type {Segment} from './transport.ts';
import {createFollower, followEntrance, tickFollower} from './fluteFollower.ts';
import type {FollowState} from './fluteFollower.ts';

type Options = {bpm: number; transpose: number; guide: boolean; metronome: boolean; loop: boolean; loopStart: number | null; loopEnd: number | null; harmonySound: boolean; harmonyVolume: number; followFlute: boolean; allowLowOctaveUp: boolean};
type Position = {beat: number; pass: number; entryBeat: number; endBeat: number};
type Voice = {start: number; end: number; stopAt: (time: number) => void; cancel: () => void};
type Transport = {context: AudioContext; harmonyGain: GainNode; segments: Segment[]; voices: Voice[]; frame: number; timer: number; nextId: number; scheduled: Set<string>; schedule: () => void; pending: {time: number; beat: number} | null};
type Follower = {context: AudioContext; harmonyGain: GainNode; state: FollowState; voices: Voice[]; frame: number; chord: number; guide: number; guideVoice?: Voice; tick: number};

function sound(context: AudioContext, frequency: number, at: number, duration: number, volume: number, output: AudioNode = context.destination, attack = 0.008, release = 0.03): Voice {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  attack = Math.min(attack, duration / 3);
  release = Math.min(release, duration / 3);
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + attack);
  gain.gain.setValueAtTime(volume, at + duration - release);
  gain.gain.linearRampToValueAtTime(0, at + duration);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.onended = () => {oscillator.disconnect(); gain.disconnect();};
  oscillator.start(at);
  oscillator.stop(at + duration + 0.01);
  const voice: Voice = {start: at, end: at + duration,
    stopAt: time => {
      if (voice.end <= time) return;
      if (voice.start >= time) {voice.cancel(); return;}
      const fade = Math.max(context.currentTime, time - 0.012);
      const elapsed = fade - at;
      const level = elapsed < attack ? volume * Math.max(0, elapsed / attack)
        : elapsed > duration - release ? volume * Math.max(0, (duration - elapsed) / release) : volume;
      gain.gain.cancelScheduledValues(fade);
      gain.gain.setValueAtTime(level, fade);
      gain.gain.linearRampToValueAtTime(0, time);
      oscillator.stop(time);
      voice.end = time;
    },
    cancel: () => {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      oscillator.stop(context.currentTime);
      voice.end = context.currentTime;
    },
  };
  return voice;
}

export function useMelodyPlayback(options: Options) {
  const [running, setRunning] = useState(false);
  const [position, setPosition] = useState<Position>({beat: START, pass: 0, entryBeat: START, endBeat: END});
  const savedPosition = useRef(position);
  const [pendingBeat, setPendingBeat] = useState<number | null>(null);
  const [previewNote, setPreviewNote] = useState<number | null>(null);
  const [error, setError] = useState('');
  const transport = useRef<Transport>();
  const follower = useRef<Follower>();
  const [waiting, setWaiting] = useState(false);
  const previewContext = useRef<AudioContext>();
  const previewVoice = useRef<() => void>();
  const previewRequest = useRef(0);
  const previewTimer = useRef<number>();
  const currentOptions = useRef(options);
  useEffect(() => {currentOptions.current = options;}, [options]);
  const lastPublished = useRef(-Infinity);
  const publish = useCallback((next: Position, animation = false) => {
    savedPosition.current = next;
    const now = performance.now();
    // The audio clock stays precise; the React view only needs 30fps.
    if (animation && now - lastPublished.current < 1000 / 30) return;
    lastPublished.current = now;
    if (animation) startTransition(() => setPosition(next));
    else setPosition(next);
  }, []);
  useEffect(() => {
    const current = transport.current ?? follower.current;
    if (current) current.harmonyGain.gain.setTargetAtTime(options.harmonySound ? options.harmonyVolume / 100 : 0, current.context.currentTime, 0.025);
  }, [options.harmonySound, options.harmonyVolume]);
  const release = useCallback(() => {
    const following = follower.current;
    follower.current = undefined;
    if (following) {
      cancelAnimationFrame(following.frame);
      void following.context.close().catch(() => {});
    }
    setWaiting(false);
    const current = transport.current;
    transport.current = undefined;
    if (!current) return;
    cancelAnimationFrame(current.frame);
    clearInterval(current.timer);
    void current.context.close().catch(() => {});
  }, []);
  const stop = useCallback(() => {
    release();
    setRunning(false);
    setPendingBeat(null);
    const saved = savedPosition.current;
    if (saved.beat < saved.entryBeat) publish({...saved, beat: saved.entryBeat});
  }, [release, publish]);
  useEffect(() => release, [release]);
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
  useEffect(() => {stop();}, [options.bpm, options.transpose, options.loop, options.loopStart, options.loopEnd, options.followFlute, stop]);
  useEffect(() => {
    const hidden = () => {if (document.hidden) stop();};
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [stop]);

  const positionAt = useCallback((time: number) => {
    if (follower.current) return {...follower.current.state, next: null};
    const current = transport.current;
    if (!current || current.context.state !== 'running') return null;
    const audioTime = current.context.currentTime + (time - performance.now()) / 1000;
    return positionAtTime(current.segments, audioTime, 60 / currentOptions.current.bpm);
  }, []);

  const seek = (requested: number) => {
    const beat = Math.max(START, Math.min(END - 1e-6, requested));
    const following = follower.current;
    if (following) {
      const settings = currentOptions.current;
      const end = settings.loop && beat < (settings.loopEnd ?? END) ? settings.loopEnd ?? END : END;
      following.voices.forEach(voice => voice.stopAt(following.context.currentTime + 0.012));
      following.state = createFollower(beat, end, following.state.pass + 1, performance.now() / 1000, 0);
      following.chord = following.guide = -1;
      publish(following.state);
      setWaiting(following.state.waiting);
      return;
    }
    const current = transport.current;
    if (!current?.segments.length) {publish({beat, pass: savedPosition.current.pass + 1, entryBeat: beat, endBeat: END}); return;}
    const seconds = 60 / currentOptions.current.bpm;
    const now = current.context.currentTime;
    const segment = [...current.segments].reverse().find(item => item.time <= now) ?? current.segments[0];
    const time = Math.min(segment.endTime, nextBeatTime(segment, now, seconds));
    current.segments = current.segments.filter(item => item === segment || item.time < time - 1e-7);
    const previous = current.segments[current.segments.length - 1];
    previous.endTime = time;
    previous.endBeat = previous.beat + (time - previous.time) / seconds;
    current.voices.forEach(voice => {if (voice.start >= time) voice.cancel(); else voice.stopAt(time);});
    const endBeat = currentOptions.current.loop && beat < (currentOptions.current.loopEnd ?? END) ? currentOptions.current.loopEnd ?? END : END;
    current.segments.push({id: current.nextId++, time, beat, entryBeat: beat, endBeat, endTime: time + (endBeat - beat) * seconds, pass: segment.pass + 1});
    current.pending = {time, beat};
    setPendingBeat(beat);
    current.schedule();
  };

  const audition = async (notes: number[], duration: number, volume: number, attack = 0.008, releaseTime = 0.03, highlight: number | null = null) => {
    const request = ++previewRequest.current;
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
        if (request === previewRequest.current) setPreviewNote(null);
      }, duration * 1000);
    } catch (reason) {
      if (request === previewRequest.current) {
        setPreviewNote(null);
        setError(reason instanceof Error ? reason.message : 'The guide tone could not play.');
      }
    }
  };
  const playNote = (note: number) => audition([note], 0.6, 0.07, 0.008, 0.03, note);
  const playChord = (notes: number[]) => audition(notes, 1.2, 0.08 * currentOptions.current.harmonyVolume / 100, 0.07, 0.18);

  const followPitch = (note: number, cents: number, time: number, articulation: number) => {
    const current = follower.current;
    if (!current || time / 1000 < current.state.anchorTime) return null;
    const settings = currentOptions.current;
    const now = performance.now() / 1000;
    const bounds = settings.loop ? {start: settings.loopStart ?? START, end: settings.loopEnd ?? END} : null;
    current.state = tickFollower(current.state, now, settings.bpm, bounds);
    const result = followEntrance(current.state, note, cents, settings.transpose, now, settings.allowLowOctaveUp, articulation);
    if (!result) return null;
    current.state = result.state;
    publish(current.state);
    setWaiting(current.state.waiting);
    return result.attempt;
  };

  const start = async () => {
    release();
    releasePreview();
    setPreviewNote(null);
    setError('');
    setPendingBeat(null);
    const config = currentOptions.current;
    const rangeStart = config.loopStart ?? START, rangeEnd = config.loopEnd ?? END;
    let from = savedPosition.current.beat;
    if (from >= END - 0.001 || from < START || (config.loop && (from < rangeStart || from >= rangeEnd))) from = config.loop ? rangeStart : START;
    const context = new AudioContext();
    const harmonyGain = context.createGain();
    harmonyGain.gain.value = config.harmonySound ? config.harmonyVolume / 100 : 0;
    harmonyGain.connect(context.destination);
    const current: Transport = {context, harmonyGain, segments: [], voices: [], frame: 0, timer: 0, nextId: 1, scheduled: new Set(), schedule: () => {}, pending: null};
    transport.current = current;
    try {
      await context.resume();
      if (transport.current !== current) return;
      const seconds = 60 / config.bpm;
      const origin = context.currentTime + 0.1;
      const endBeat = config.loop ? rangeEnd : END;
      if (config.followFlute) {
        transport.current = undefined;
        const following: Follower = {context, harmonyGain,
          state: createFollower(from, endBeat, savedPosition.current.pass + 1, performance.now() / 1000 + 0.1),
          voices: [], frame: 0, chord: -1, guide: -1, tick: -Infinity};
        follower.current = following;
        publish(following.state);
        setRunning(true);
        const animateFollow = () => {
          if (follower.current !== following) return;
          const settings = currentOptions.current;
          const previousPass = following.state.pass;
          following.state = tickFollower(following.state, performance.now() / 1000, settings.bpm,
            settings.loop ? {start: settings.loopStart ?? START, end: settings.loopEnd ?? END} : null);
          const state = following.state;
          if (previousPass !== state.pass) following.chord = following.guide = -1;
          publish(state, true);
          setWaiting(state.waiting);
          const now = context.currentTime;
          following.voices = following.voices.filter(voice => voice.end > now);
          const chordIndex = state.countIn ? -1 : harmonies.findIndex(chord => state.beat >= chord.start && state.beat < chord.start + chord.duration);
          if (chordIndex !== following.chord) {
            following.voices.forEach(voice => voice.stopAt(now + 0.012));
            following.chord = chordIndex;
            if (chordIndex >= 0) {
              const chord = harmonies[chordIndex];
              const duration = Math.max(0.05, (Math.min(chord.start + chord.duration, state.endBeat) - state.beat) * seconds);
              following.voices.push(...chord.notes.map(note => sound(context, 440 * 2 ** ((note.note - 69) / 12), now + 0.015,
                duration, 0.08 / Math.sqrt(chord.notes.length), harmonyGain, 0.07, 0.18)));
            }
          }
          const activeIndex = state.countIn ? -1 : exercise.findIndex(note => state.beat >= note.start - 1e-7 && state.beat < note.start + note.duration - 1e-7);
          if (activeIndex !== following.guide) {
            following.guideVoice?.stopAt(now + 0.012);
            following.guide = activeIndex;
            if (settings.guide && activeIndex >= 0) {
              const note = exercise[activeIndex];
              following.guideVoice = sound(context, 440 * 2 ** ((note.note + settings.transpose - 69) / 12), now,
                Math.max(0.05, (Math.min(note.start + note.duration, state.endBeat) - state.beat) * seconds * 0.97), 0.07);
              following.voices.push(following.guideVoice);
            }
          }
          const tick = Math.floor(state.beat);
          if (state.countIn && tick !== following.tick) {
            following.tick = tick;
            following.voices.push(sound(context, tick % 4 === 0 ? 1200 : 850, now, 0.045, 0.045));
          }
          if (state.finished) {stop(); return;}
          following.frame = requestAnimationFrame(animateFollow);
        };
        following.frame = requestAnimationFrame(animateFollow);
        return;
      }
      current.segments.push({id: 0, time: origin, beat: from - 4, entryBeat: from, endBeat, endTime: origin + (endBeat - from + 4) * seconds, pass: savedPosition.current.pass + 1});
      publish({beat: from - 4, pass: savedPosition.current.pass + 1, entryBeat: from, endBeat});
      setRunning(true);
      current.schedule = () => {
        const settings = currentOptions.current;
        const now = context.currentTime;
        const horizon = now + 0.25;
        let last = current.segments[current.segments.length - 1];
        while (settings.loop && last.endTime <= horizon) {
          const entry = settings.loopStart ?? START;
          const end = settings.loopEnd ?? END;
          const next: Segment = {id: current.nextId++, time: last.endTime, beat: entry, entryBeat: entry, endBeat: end, endTime: last.endTime + (end - entry) * seconds, pass: last.pass + 1};
          current.segments.push(next);
          last = next;
        }
        current.voices = current.voices.filter(voice => voice.end > now - 0.1);
        while (current.segments.length > 2 && current.segments[1].endTime < now - 1) current.segments.shift();
        if (current.scheduled.size > 4096) {
          const live = new Set(current.segments.map(segment => segment.id));
          current.scheduled = new Set([...current.scheduled].filter(key => live.has(Number(key.split('-')[0]))));
        }
        for (const segment of current.segments) {
          if (segment.endTime < now || segment.time > horizon) continue;
          const add = (key: string, onset: number, play: (at: number, duration: number) => Voice[], end: number) => {
            const at = segment.time + (onset - segment.beat) * seconds;
            const id = segment.id + '-' + key;
            const until = segment.time + (end - segment.beat) * seconds;
            if (at > horizon || until <= now || current.scheduled.has(id) || end <= onset) return;
            current.scheduled.add(id);
            // After a delayed scheduler tick, recover the remaining sustain
            // instead of dropping the entire note or shifting the score clock.
            const start = Math.max(now, at);
            current.voices.push(...play(start, until - start));
          };
          exercise.forEach((note, index) => {
            if (!settings.guide) return;
            const onset = Math.max(note.start, segment.entryBeat), end = Math.min(note.start + note.duration, segment.endBeat);
            add('note-' + index, onset, (at, duration) => [sound(context, 440 * 2 ** ((note.note + settings.transpose - 69) / 12), at, duration * 0.97, 0.07)], end);
          });
          harmonies.forEach((chord, index) => {
            const onset = Math.max(chord.start, segment.entryBeat), end = Math.min(chord.start + chord.duration, segment.endBeat);
            add('chord-' + index, onset, (at, duration) => chord.notes.map(note =>
              sound(context, 440 * 2 ** ((note.note - 69) / 12), at, duration, 0.08 / Math.sqrt(chord.notes.length), harmonyGain, 0.07, 0.18)), end);
          });
          const localNow = segment.beat + (now - segment.time) / seconds;
          for (let tick = Math.max(Math.ceil(segment.beat), Math.floor(localNow)); tick < Math.min(segment.endBeat, localNow + 1); tick++) {
            if (!settings.metronome && tick >= segment.entryBeat) continue;
            add('tick-' + tick, tick, at => [sound(context, tick % 4 === 0 ? 1200 : 850, at, 0.045, 0.045)], Math.min(tick + 0.1, segment.endBeat));
          }
        }
      };
      const animate = () => {
        if (transport.current !== current) return;
        const value = positionAt(performance.now());
        if (value) {
          publish(value, true);
          if (current.pending && context.currentTime >= current.pending.time) {current.pending = null; setPendingBeat(null);}
          const last = current.segments[current.segments.length - 1];
          if (!currentOptions.current.loop && context.currentTime >= last.endTime) {stop(); publish({...value, beat: END}); return;}
        }
        current.frame = requestAnimationFrame(animate);
      };
      current.schedule();
      current.timer = window.setInterval(current.schedule, 25);
      current.frame = requestAnimationFrame(animate);
    } catch (reason) {
      if (transport.current !== current && follower.current?.context !== context) return;
      stop();
      setError(reason instanceof Error ? reason.message : 'Playback could not start.');
    }
  };
  return {running, ...position, pendingBeat, previewNote, positionAt, seek, start, stop, playNote, playChord, followPitch, waiting, error};
}
