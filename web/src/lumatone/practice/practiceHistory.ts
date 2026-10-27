import {isPracticeHit} from './exercise.ts';
import type {Attempt} from './exercise.ts';

export const HISTORY_KEY = 'musicality.practice-history.v1';
export const HISTORY_FORMAT = 'musicality.practice-history';
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export type HistorySettings = {
  bpm: number; transpose: number; freeTime: boolean; allowLowOctaveUp: boolean;
  loop: boolean; loopStart: number | null; loopEnd: number | null; latencyMs: number;
};
export type HistoryJudgement = Attempt & {
  id: string; at: string; expectedNote: number; location: string; start: number; duration: number; latencyMs: number;
};
export type PracticeSession = {
  id: string; piece: 'stella-by-starlight'; startedAt: string; updatedAt: string; endedAt: string | null;
  settings: HistorySettings; judgements: HistoryJudgement[];
};
export type PracticeHistoryData = {format: typeof HISTORY_FORMAT; version: 1; sessions: PracticeSession[]};
export const emptyHistory = (): PracticeHistoryData => ({format: HISTORY_FORMAT, version: 1, sessions: []});
const sameFields = (a: object, b: object) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => value === (b as Record<string, unknown>)[key]);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a history object.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 200): string {
  if (typeof value !== 'string' || !value.length || value.length > max) throw new Error('Invalid history text.');
  return value;
}
function number(value: unknown, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error('Invalid history number.');
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid history flag.');
  return value;
}
function date(value: unknown): string {
  const result = text(value, 40);
  if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid history date.');
  return new Date(result).toISOString();
}
function boundary(value: unknown): number | null {return value === null ? null : number(value, -1, 128);}

// Build fresh known-field objects: imported JSON cannot inject markup, settings,
// object properties, or storage keys into the app.
export function parsePracticeHistory(raw: string): PracticeHistoryData {
  if (raw.length > MAX_IMPORT_BYTES) throw new Error('History file is too large (maximum 10 MB).');
  const root = object(JSON.parse(raw));
  if (root.format !== HISTORY_FORMAT || root.version !== 1 || !Array.isArray(root.sessions)) throw new Error('This is not a supported musicality practice-history export.');
  if (root.sessions.length > 10000) throw new Error('Too many sessions in this file.');
  const ids = new Set<string>();
  let total = 0;
  const sessions = root.sessions.map(value => {
    const s = object(value), config = object(s.settings);
    if (s.piece !== 'stella-by-starlight' || !Array.isArray(s.judgements)) throw new Error('Invalid session data.');
    total += s.judgements.length;
    if (total > 100000) throw new Error('Too many judgements in this file.');
    const id = text(s.id, 100);
    if (ids.has(id)) throw new Error('Duplicate session ID in the file.');
    ids.add(id);
    const settings: HistorySettings = {
      bpm: number(config.bpm, 40, 180), transpose: number(config.transpose, -48, 48, true),
      freeTime: bool(config.freeTime), allowLowOctaveUp: bool(config.allowLowOctaveUp), loop: bool(config.loop),
      loopStart: boundary(config.loopStart), loopEnd: boundary(config.loopEnd), latencyMs: number(config.latencyMs, -300, 500),
    };
    if (settings.loopStart !== null && settings.loopEnd !== null && settings.loopStart >= settings.loopEnd) throw new Error('Invalid loop range.');
    const eventIds = new Set<string>();
    const judgements: HistoryJudgement[] = s.judgements.map(value => {
      const a = object(value), id = text(a.id, 100);
      if (eventIds.has(id)) throw new Error('Duplicate judgement ID in the file.');
      eventIds.add(id);
      return {
        id, at: date(a.at), index: number(a.index, 0, 10000, true), cycle: number(a.cycle, 0, 10000000, true),
        note: number(a.note, 0, 127, true), cents: number(a.cents, -100, 100), errorMs: number(a.errorMs, -10000, 10000),
        correctPitch: bool(a.correctPitch), freeTime: bool(a.freeTime), expectedNote: number(a.expectedNote, 0, 127, true),
        location: text(a.location), start: number(a.start, -1, 128), duration: number(a.duration, 0.001, 129), latencyMs: number(a.latencyMs, -300, 500),
      };
    }).sort((a, b) => a.at.localeCompare(b.at));
    const session: PracticeSession = {id, piece: 'stella-by-starlight', startedAt: date(s.startedAt), updatedAt: date(s.updatedAt), endedAt: s.endedAt === null ? null : date(s.endedAt), settings, judgements};
    if (session.updatedAt < session.startedAt || (session.endedAt && session.endedAt < session.startedAt) || judgements.some(a => a.at < session.startedAt || a.at > session.updatedAt)) throw new Error('Inconsistent session dates.');
    return session;
  });
  return {format: HISTORY_FORMAT, version: 1, sessions};
}

export function mergePracticeHistories(local: PracticeHistoryData, incoming: PracticeHistoryData): PracticeHistoryData {
  const sessions = new Map(local.sessions.map(session => [session.id, session]));
  for (const session of incoming.sessions) {
    const old = sessions.get(session.id);
    if (!old) {sessions.set(session.id, session); continue;}
    if (old.piece !== session.piece || old.startedAt !== session.startedAt || !sameFields(old.settings, session.settings)) throw new Error('A session ID conflicts with different saved settings. Nothing was imported.');
    const events = new Map(old.judgements.map(event => [event.id, event]));
    for (const event of session.judgements) {
      const existing = events.get(event.id);
      if (existing && !sameFields(existing, event)) throw new Error('A judgement ID conflicts with different saved data. Nothing was imported.');
      events.set(event.id, event);
    }
    sessions.set(session.id, {...old, updatedAt: old.updatedAt > session.updatedAt ? old.updatedAt : session.updatedAt,
      endedAt: old.endedAt && session.endedAt ? old.endedAt > session.endedAt ? old.endedAt : session.endedAt : old.endedAt ?? session.endedAt,
      judgements: [...events.values()].sort((a, b) => a.at.localeCompare(b.at))});
  }
  return {...local, sessions: [...sessions.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))};
}

export function summarisePracticeSession(session: PracticeSession) {
  const notes = new Map<string, HistoryJudgement[]>();
  for (const a of session.judgements) {
    const key = `${a.cycle}-${a.index}`;
    notes.set(key, [...(notes.get(key) ?? []), a]);
  }
  const groups = [...notes.values()], first = groups.map(group => group[0]);
  const timed = first.filter(a => !a.freeTime);
  const pitch = first.filter(a => a.correctPitch).length;
  return {
    notes: groups.length, judgements: session.judgements.length, pitch,
    recovered: groups.filter(group => group.some(a => a.correctPitch)).length,
    timed: timed.length, onTime: timed.filter(a => Math.abs(a.errorMs) <= 120).length,
    hits: first.filter(a => isPracticeHit(a)).length,
    meanTiming: timed.length ? timed.reduce((sum, a) => sum + Math.abs(a.errorMs), 0) / timed.length : null,
  };
}
