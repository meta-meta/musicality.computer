import {startTransition, useCallback, useEffect, useRef, useState} from 'react';
import {END, exercise, harmonies, START} from './exercise.ts';
import {nextBeatTime, positionAtTime} from './transport.ts';
import type {Segment} from './transport.ts';
import {createFollower, followEntrance, tickFollower} from './fluteFollower.ts';
import type {FollowState} from './fluteFollower.ts';
import {sound} from './sound.ts';
import type {Voice} from './sound.ts';
import {useNoteAudition} from './useNoteAudition.ts';

type Options = {bpm: number; transpose: number; guide: boolean; metronome: boolean; loop: boolean; loopStart: number | null; loopEnd: number | null; harmonySound: boolean; harmonyVolume: number; followFlute: boolean; allowLowOctaveUp: boolean};
type Position = {beat: number; pass: number; entryBeat: number; endBeat: number};
type Transport = {context: AudioContext; harmonyGain: GainNode; segments: Segment[]; voices: Voice[]; frame: number; timer: number; nextId: number; scheduled: Set<string>; schedule: () => void; pending: {time: number; beat: number} | null};
type Follower = {context: AudioContext; harmonyGain: GainNode; state: FollowState; voices: Voice[]; frame: number; chord: number; guide: number; guideVoice?: Voice; tick: number};


export function useMelodyPlayback(options: Options) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedAt = useRef<number | null>(null);
  const [position, setPosition] = useState<Position>({beat: START, pass: 0, entryBeat: START, endBeat: END});
  const savedPosition = useRef(position);
  const [pendingBeat, setPendingBeat] = useState<number | null>(null);
  const [error, setError] = useState('');
  const {previewNote, setPreviewNote, releasePreview, playNote, playChord} = useNoteAudition(setError, options.harmonyVolume);
  const transport = useRef<Transport>();
  const follower = useRef<Follower>();
  const [waiting, setWaiting] = useState(false);
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
    pausedAt.current = null;
    setPaused(false);
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
  useEffect(() => {stop();}, [options.bpm, options.transpose, options.loop, options.loopStart, options.loopEnd, options.followFlute, stop]);
  useEffect(() => {
    const hidden = () => {if (document.hidden) stop();};
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [stop]);

  const positionAt = useCallback((time: number) => {
    if (pausedAt.current !== null) return null;
    if (follower.current) return {...follower.current.state, next: null};
    const current = transport.current;
    if (!current || current.context.state !== 'running') return null;
    const audioTime = current.context.currentTime + (time - performance.now()) / 1000;
    return positionAtTime(current.segments, audioTime, 60 / currentOptions.current.bpm);
  }, []);

  const pause = () => {
    const current = transport.current ?? follower.current;
    if (!current || pausedAt.current !== null) return;
    const position = positionAt(performance.now());
    if (position) publish(position);
    pausedAt.current = performance.now() / 1000;
    setPaused(true); setRunning(false);
    void current.context.suspend().catch(reason => {stop(); setError(String(reason));});
  };
  const resume = async () => {
    const current = transport.current ?? follower.current;
    if (!current || pausedAt.current === null) return;
    try {
      await current.context.resume();
      if (current !== (transport.current ?? follower.current) || pausedAt.current === null) return;
      if (follower.current) follower.current.state.anchorTime += performance.now() / 1000 - pausedAt.current;
      pausedAt.current = null;
      setPaused(false); setRunning(true);
    } catch (reason) {stop(); setError(String(reason));}
  };

  const seek = (requested: number) => {
    const beat = Math.max(START, Math.min(END, requested));
    if (pausedAt.current !== null || beat === END) {
      stop();
      publish({beat, pass: savedPosition.current.pass + 1, entryBeat: beat, endBeat: END});
      return;
    }
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


  const followPitch = (note: number, cents: number, time: number, articulation: number) => {
    if (pausedAt.current !== null) return null;
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
          if (pausedAt.current !== null) {following.frame = requestAnimationFrame(animateFollow); return;}
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
        if (pausedAt.current !== null) return;
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
        if (pausedAt.current !== null) {current.frame = requestAnimationFrame(animate); return;}
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
  return {running, paused, ...position, pendingBeat, previewNote, positionAt, seek, start, stop, pause, resume, playNote, playChord, followPitch, waiting, error};
}
