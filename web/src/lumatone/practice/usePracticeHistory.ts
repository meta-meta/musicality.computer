import {usePracticeScore} from './PracticeScoreContext.tsx';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {Attempt} from './exercise.ts';
import {emptyHistory, HISTORY_KEY, mergePracticeHistories, parsePracticeHistory} from './practiceHistory.ts';
import type {HistoryJudgement, HistorySettings, PracticeSession} from './practiceHistory.ts';

function load() {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(HISTORY_KEY);
    return {data: raw ? parsePracticeHistory(raw) : emptyHistory(), error: '', recovery: ''};
  } catch {
    return {data: emptyHistory(), error: raw ? 'Saved history could not be read. It has been left untouched; download the recovery copy before importing a backup.' : 'Local storage is unavailable. History can still be exported from this tab.', recovery: raw ?? ''};
  }
}

export function usePracticeHistory(settings: HistorySettings) {
  const {exercise, score} = usePracticeScore();
  const [initial] = useState(load);
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const latest = useRef(initial.data);
  const config = useRef(settings); config.current = settings;
  const active = useRef<PracticeSession>();
  const dedup = useRef('');
  const timer = useRef<number>();
  const dirty = useRef(false);
  const mounted = useRef(true);
  const blocked = useRef(Boolean(initial.recovery));
  const [activeId, setActiveId] = useState<string | null>(null);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current); timer.current = undefined;
    if (!dirty.current) return;
    if (mounted.current) setData(latest.current);
    if (blocked.current) return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(latest.current));
      dirty.current = false;
      if (mounted.current) setError('');
    } catch {
      if (mounted.current) setError('History could not be saved locally (storage may be full or blocked). Export a backup; the results are still available in this tab.');
    }
  }, []);

  const finish = useCallback(() => {
    const current = active.current;
    active.current = undefined; dedup.current = '';
    if (mounted.current) setActiveId(null);
    if (current?.judgements.length) {
      const endedAt = new Date().toISOString();
      latest.current = {...latest.current, sessions: latest.current.sessions.map(s => s.id === current.id ? {...s, updatedAt: endedAt, endedAt} : s)};
      dirty.current = true;
    }
    flush();
  }, [flush]);

  const begin = useCallback(() => {
    finish();
    const at = new Date().toISOString();
    active.current = {id: crypto.randomUUID(), piece: score.id, title: score.title, tonic: score.tonic, startedAt: at, updatedAt: at, endedAt: null, settings: {...config.current}, judgements: []};
    dedup.current = '';
  }, [finish, score]);

  const record = useCallback((attempt: Attempt, articulation?: number) => {
    if (!active.current) begin();
    const current = active.current!;
    const key = `${attempt.cycle}:${attempt.index}:${articulation ?? ''}:${attempt.note}:${attempt.correctPitch}`;
    // Flute-follow receives continuous samples. Record a new articulation,
    // stable pitch change, or correction, rather than thirty copies a second.
    if (attempt.freeTime && key === dedup.current) return;
    dedup.current = key;
    const note = exercise[attempt.index];
    if (!note) return;
    const at = new Date().toISOString();
    const judgement: HistoryJudgement = {...attempt, freeTime: Boolean(attempt.freeTime), id: crypto.randomUUID(), at,
      expectedNote: note.note + current.settings.transpose, location: note.location, start: note.start, duration: note.duration, latencyMs: config.current.latencyMs};
    const session = {...current, updatedAt: at, judgements: [...current.judgements, judgement]};
    active.current = session;
    const exists = latest.current.sessions.some(s => s.id === session.id);
    latest.current = {...latest.current, sessions: exists ? latest.current.sessions.map(s => s.id === session.id ? session : s) : [session, ...latest.current.sessions]};
    dirty.current = true;
    if (mounted.current) setActiveId(session.id);
    // Batch storage/summary updates independently of the audio and pitch clocks.
    if (timer.current === undefined) timer.current = window.setTimeout(flush, 750);
  }, [begin, flush, exercise]);

  const exportJSON = useCallback(() => {
    flush();
    return JSON.stringify({...latest.current, exportedAt: new Date().toISOString()}, null, 2);
  }, [flush]);

  const importJSON = useCallback((raw: string) => {
    const imported = parsePracticeHistory(raw);
    const merged = mergePracticeHistories(latest.current, imported);
    // Commit storage before changing in-memory data: failed imports never
    // replace existing results. Reimporting a backup merges by stable IDs.
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
    latest.current = merged; dirty.current = false; blocked.current = false;
    window.clearTimeout(timer.current); timer.current = undefined;
    if (active.current) active.current = merged.sessions.find(s => s.id === active.current!.id);
    setData(merged); setError('');
    return {sessions: imported.sessions.length, total: merged.sessions.length};
  }, []);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => {if (document.hidden) flush();};
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mounted.current = false; finish();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [finish, flush]);

  return {data, error, recovery: initial.recovery, activeId, begin, finish, record, flush, exportJSON, importJSON};
}
