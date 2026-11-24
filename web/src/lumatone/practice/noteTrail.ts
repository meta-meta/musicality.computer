export const NOTE_TRAIL_KEY = 'musicality.note-trails.v1';
export const trailCurves = ['linear', 'ease-out', 'ease-in-out'] as const;
export type NoteTrailSettings = {enabled: boolean; dropMs: number; level: number; fadeMs: number; dropCurve: typeof trailCurves[number]; fadeCurve: typeof trailCurves[number]};
export const defaultNoteTrail: NoteTrailSettings = {enabled: true, dropMs: 120, level: 0.7, fadeMs: 10000, dropCurve: 'ease-out', fadeCurve: 'linear'};
export function readNoteTrail(storage: Pick<Storage, 'getItem'>): NoteTrailSettings {
  try {
    const value = JSON.parse(storage.getItem(NOTE_TRAIL_KEY) ?? 'null');
    const bounded = (key: 'dropMs' | 'level' | 'fadeMs', max: number) => typeof value?.[key] === 'number' && Number.isFinite(value[key])
      ? Math.max(0, Math.min(max, value[key])) : defaultNoteTrail[key];
    return {enabled: typeof value?.enabled === 'boolean' ? value.enabled : true,
      dropMs: bounded('dropMs', 5000), level: bounded('level', 1), fadeMs: bounded('fadeMs', 120000),
      dropCurve: trailCurves.includes(value?.dropCurve) ? value.dropCurve : defaultNoteTrail.dropCurve,
      fadeCurve: trailCurves.includes(value?.fadeCurve) ? value.fadeCurve : defaultNoteTrail.fadeCurve};
  } catch {return {...defaultNoteTrail};}
}

export function noteTrailPlan(settings: NoteTrailSettings, elapsed: number, currentOpacity?: number) {
  const {dropMs, level, fadeMs, dropCurve, fadeCurve} = settings;
  const duration = dropMs + fadeMs - Math.max(0, elapsed);
  if (!settings.enabled || duration <= 0) return null;
  const remainingDrop = Math.max(0, dropMs - elapsed);
  const opacity = currentOpacity ?? (remainingDrop > 0 ? level + (1 - level) * remainingDrop / dropMs : fadeMs ? level * duration / fadeMs : 0);
  const frames: Keyframe[] = [{opacity, offset: 0, easing: remainingDrop > 0 ? dropCurve : fadeCurve}];
  if (remainingDrop > 0) frames.push({opacity: level, offset: remainingDrop / duration, easing: fadeCurve});
  frames.push({opacity: 0, offset: 1});
  return {frames, duration};
}
