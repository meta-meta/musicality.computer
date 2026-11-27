import {usePracticeScore} from './PracticeScoreContext.tsx';
import {startTransition, useCallback, useEffect, useRef, useState} from 'react';

import {COUNT_IN_BEATS, countInClicks, nextBeatTime, positionAtTime, retimeSegments} from './transport.ts';
import type {Segment} from './transport.ts';
import {createFollower, followEntrance, tickFollower} from './monophoneFollower.ts';
import type {FollowState} from './monophoneFollower.ts';
import {sound} from './sound.ts';
import type {Voice} from './sound.ts';
import {useNoteAudition} from './useNoteAudition.ts';

// With looping off, `chain` lists ranges to play one after another: playback
// starts in `ranges[index]` (the same range as loopStart/loopEnd), moves on to
// each later one as the previous ends, and stops after the last.
type Chain = {ranges: {start: number; end: number}[]; index: number};
type Options = {chain?: Chain | null; bpm: number; transpose: number; harmonyTranspose?: number; guide: boolean; metronome: boolean; loop: boolean; loopStart: number | null; loopEnd: number | null; harmonySound: boolean; harmonyVolume: number; followMonophone: boolean; allowLowOctaveUp: boolean};
type Position = {beat: number; pass: number; entryBeat: number; endBeat: number};
type Transport = {context: AudioContext; harmonyGain: GainNode; segments: Segment[]; voices: Voice[]; frame: number; timer: number; nextId: number; scheduled: Set<string>; schedule: () => void; tempo: number; pending: {time: number; beat: number} | null};
type Follower = {context: AudioContext; harmonyGain: GainNode; state: FollowState; voices: Voice[]; frame: number; chord: number; guide: number; guideVoice?: Voice; tick: number};


export function useMelodyPlayback(options: Options) {
  const {score, END, exercise, harmonies, START} = usePracticeScore();
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
  // Which chained range the most recently scheduled pass plays.
  const chainAt = useRef(-1);
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
  useEffect(() => {stop();}, [options.transpose, options.harmonyTranspose, options.followMonophone, stop]);
  // Turning looping on or off does not stop playback either. On: the current
  // pass ends at the loop end (if the playhead has not passed it) and repeats
  // from the loop start. Off: the current pass plays on to the end of the tune,
  // or, with sections chained, to the end of its section and into the next.
  // Free time reads the setting as it goes.
  const loopWas = useRef(options.loop);
  useEffect(() => {
    if (loopWas.current === options.loop) return;
    loopWas.current = options.loop;
    chainAt.current = options.chain?.index ?? -1;
    const current = transport.current;
    if (!current?.segments.length) return;
    const now = current.context.currentTime;
    let index = current.segments.length - 1;
    while (index > 0 && current.segments[index].time > now) index--;
    const segment = current.segments[index];
    const seconds = segment.seconds ?? current.tempo;
    const beat = segment.beat + (now - segment.time) / seconds;
    const rangeEnd = options.loopEnd ?? END;
    const endBeat = options.loop ? beat < rangeEnd - 1e-6 ? rangeEnd : segment.endBeat : options.chain ? segment.endBeat : END;
    const boundary = Math.min(segment.endTime, segment.time + (endBeat - segment.beat) * seconds);
    segment.endBeat = endBeat;
    segment.endTime = segment.time + (endBeat - segment.beat) * seconds;
    current.segments = current.segments.slice(0, index + 1);
    current.voices.forEach(voice => {if (voice.start >= boundary) voice.cancel();});
    current.schedule();
  }, [options.loop, options.chain, options.loopEnd, END]);
  // A tempo change does not stop playback. The playhead keeps its beat and
  // continues at the new tempo from a moment later; notes already sounding ring
  // on, and everything scheduled after that moment is rescheduled. Free time
  // reads the tempo as it goes and needs nothing here.
  useEffect(() => {
    const current = transport.current;
    if (!current?.segments.length) return;
    const seconds = 60 / options.bpm;
    const time = current.context.currentTime + 0.03;
    const retimed = retimeSegments(current.segments, time, seconds, seconds, current.nextId);
    if (!retimed) return;
    current.nextId++;
    current.segments = retimed.segments;
    if (!currentOptions.current.loop && chainAt.current >= 0) chainAt.current -= retimed.dropped;
    current.voices.forEach(voice => {if (voice.start >= time) voice.cancel();});
    current.tempo = seconds;
    current.schedule();
  }, [options.bpm]);
  // Changing the loop stops playback, except for a loop that was cued: that
  // change is already queued on the transport and takes over on the next beat.
  const cuedLoop = useRef<string | null>(null);
  useEffect(() => {
    const cued = cuedLoop.current === `${options.loopStart}:${options.loopEnd}`;
    cuedLoop.current = null;
    if (!cued) stop();
  }, [options.loopStart, options.loopEnd, stop]);
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
    return positionAtTime(current.segments, audioTime, current.tempo);
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

  // `range` is a loop being cued together with the jump; without it the jump
  // ends where the current loop setting says.
  const seek = (requested: number, range?: {start: number; end: number}) => {
    const beat = Math.max(START, Math.min(END, requested));
    const endFor = (settings: Options) => range ? range.end : (settings.loop || settings.chain) && beat < (settings.loopEnd ?? END) ? settings.loopEnd ?? END : END;
    if (range) chainAt.current = currentOptions.current.chain?.ranges.findIndex(item => item.start === range.start && item.end === range.end) ?? -1;
    if (pausedAt.current !== null || beat === END) {
      stop();
      publish({beat, pass: savedPosition.current.pass + 1, entryBeat: beat, endBeat: END});
      return;
    }
    const following = follower.current;
    if (following) {
      const end = endFor(currentOptions.current);
      following.voices.forEach(voice => voice.stopAt(following.context.currentTime + 0.012));
      following.state = createFollower(beat, end, following.state.pass + 1, performance.now() / 1000, 0, exercise);
      following.chord = following.guide = -1;
      publish(following.state);
      setWaiting(following.state.waiting);
      return;
    }
    const current = transport.current;
    if (!current?.segments.length) {publish({beat, pass: savedPosition.current.pass + 1, entryBeat: beat, endBeat: END}); return;}
    const seconds = current.tempo;
    const now = current.context.currentTime;
    const segment = [...current.segments].reverse().find(item => item.time <= now) ?? current.segments[0];
    const time = Math.min(segment.endTime, nextBeatTime(segment, now, seconds));
    current.segments = current.segments.filter(item => item === segment || item.time < time - 1e-7);
    const previous = current.segments[current.segments.length - 1];
    previous.endTime = time;
    previous.endBeat = previous.beat + (time - previous.time) / (previous.seconds ?? seconds);
    current.voices.forEach(voice => {if (voice.start >= time) voice.cancel(); else voice.stopAt(time);});
    const endBeat = endFor(currentOptions.current);
    current.segments.push({id: current.nextId++, time, beat, entryBeat: beat, endBeat, endTime: time + (endBeat - beat) * seconds, pass: segment.pass + 1, seconds});
    current.pending = {time, beat};
    setPendingBeat(beat);
    current.schedule();
  };


  // Switch to another loop without stopping: playback jumps to its start on the
  // next beat (at once in free time) and loops there from then on. Returns false
  // when nothing is playing or looping is off, so the caller can stop and switch.
  const cue = (start: number, end: number) => {
    const settings = currentOptions.current;
    if (pausedAt.current !== null || !(settings.loop || settings.chain) || !(transport.current ?? follower.current) || end <= start) return false;
    if (settings.loopStart !== start || settings.loopEnd !== end) cuedLoop.current = `${start}:${end}`;
    seek(start, {start, end});
    return true;
  };

  // The page is about to set these loop points to match a pass that is already
  // scheduled (the next chained range), so that change must not stop playback.
  const expectLoop = (start: number, end: number) => {
    const settings = currentOptions.current;
    if (settings.loopStart !== start || settings.loopEnd !== end) cuedLoop.current = `${start}:${end}`;
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
    const ranged = config.loop || Boolean(config.chain);
    chainAt.current = config.chain?.index ?? -1;
    if (from >= END - 0.001 || from < START || (ranged && (from < rangeStart || from >= rangeEnd))) from = ranged ? rangeStart : START;
    const context = new AudioContext();
    const harmonyGain = context.createGain();
    harmonyGain.gain.value = config.harmonySound ? config.harmonyVolume / 100 : 0;
    harmonyGain.connect(context.destination);
    const current: Transport = {context, harmonyGain, segments: [], voices: [], frame: 0, timer: 0, nextId: 1, scheduled: new Set(), schedule: () => {}, tempo: 60 / config.bpm, pending: null};
    transport.current = current;
    try {
      await context.resume();
      if (transport.current !== current) return;
      const seconds = 60 / config.bpm;
      const origin = context.currentTime + 0.1;
      const endBeat = ranged ? rangeEnd : END;
      if (config.followMonophone) {
        transport.current = undefined;
        const following: Follower = {context, harmonyGain,
          state: createFollower(from, endBeat, savedPosition.current.pass + 1, performance.now() / 1000 + 0.1, COUNT_IN_BEATS, exercise),
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
              following.voices.push(...chord.notes.map(note => sound(context, 440 * 2 ** ((note.note + (settings.harmonyTranspose ?? 0) - 69) / 12), now + 0.015,
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
          const tick = Math.floor(state.beat - state.entryBeat + 1e-7);
          if (state.countIn && performance.now() / 1000 >= state.anchorTime && tick !== following.tick) {
            following.tick = tick;
            following.voices.push(sound(context, tick === -COUNT_IN_BEATS ? 1200 : 850, now, 0.045, 0.045));
          }
          if (state.finished) {
            const after = settings.loop ? undefined : settings.chain?.ranges[chainAt.current + 1];
            if (!after) {stop(); return;}
            chainAt.current++;
            following.voices.forEach(voice => voice.stopAt(now + 0.012));
            following.state = createFollower(after.start, after.end, state.pass + 1, performance.now() / 1000, 0, exercise);
            following.chord = following.guide = -1;
          }
          following.frame = requestAnimationFrame(animateFollow);
        };
        following.frame = requestAnimationFrame(animateFollow);
        return;
      }
      current.segments.push({id: 0, time: origin, beat: from - COUNT_IN_BEATS, entryBeat: from, endBeat, endTime: origin + (endBeat - from + COUNT_IN_BEATS) * seconds, pass: savedPosition.current.pass + 1, seconds});
      publish({beat: from - COUNT_IN_BEATS, pass: savedPosition.current.pass + 1, entryBeat: from, endBeat});
      setRunning(true);
      current.schedule = () => {
        if (pausedAt.current !== null) return;
        const settings = currentOptions.current;
        const now = context.currentTime;
        const horizon = now + 0.25;
        let last = current.segments[current.segments.length - 1];
        while (last.endTime <= horizon) {
          const after = settings.loop ? {start: settings.loopStart ?? START, end: settings.loopEnd ?? END} : settings.chain?.ranges[chainAt.current + 1];
          if (!after) break;
          if (!settings.loop) chainAt.current++;
          const entry = after.start;
          const end = after.end;
          const next: Segment = {id: current.nextId++, time: last.endTime, beat: entry, entryBeat: entry, endBeat: end, endTime: last.endTime + (end - entry) * current.tempo, pass: last.pass + 1, seconds: current.tempo};
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
          const seconds = segment.seconds ?? current.tempo;
          const add = (key: string, onset: number, play: (at: number, duration: number) => Voice[], end: number) => {
            // After a tempo change, a note that began earlier is still sounding.
            if (segment.soundFrom !== undefined && onset < segment.soundFrom - 1e-7) return;
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
              sound(context, 440 * 2 ** ((note.note + (settings.harmonyTranspose ?? 0) - 69) / 12), at, duration, 0.08 / Math.sqrt(chord.notes.length), harmonyGain, 0.07, 0.18)), end);
          });
          for (const [index, tick] of countInClicks(segment.entryBeat).entries()) {
            if (tick < segment.beat - 1e-7) continue;
            add('count-in-' + index, tick, at => [sound(context, index === 0 ? 1200 : 850, at, 0.045, 0.045)], tick + 0.1);
          }
          const localNow = segment.beat + (now - segment.time) / seconds;
          for (let tick = Math.max(Math.ceil(segment.entryBeat), Math.floor(localNow)); tick < Math.min(segment.endBeat, localNow + 1); tick++) {
            if (!settings.metronome && tick >= segment.entryBeat) continue;
            add('tick-' + tick, tick, at => [sound(context, score.bars.some(start => Math.abs(start - tick) < 1e-6) ? 1200 : 850, at, 0.045, 0.045)], Math.min(tick + 0.1, segment.endBeat));
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
          if (!currentOptions.current.loop && context.currentTime >= last.endTime) {stop(); publish({...value, beat: currentOptions.current.chain ? last.endBeat : END}); return;}
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
  return {running, paused, ...position, pendingBeat, previewNote, positionAt, seek, cue, expectLoop, start, stop, pause, resume, playNote, playChord, followPitch, waiting, error, stopPreview: () => {releasePreview();setPreviewNote(null);}};
}
