import {useEffect, useState} from 'react';
import {defaultNoteTrail, NOTE_TRAIL_KEY, readNoteTrail} from './noteTrail.ts';
import type {NoteTrailSettings} from './noteTrail.ts';

export function useNoteTrailSettings() {
  const [settings, setSettings] = useState<NoteTrailSettings>(() => {
    try {return readNoteTrail(window.localStorage);} catch {return {...defaultNoteTrail};}
  });
  const [error, setError] = useState('');
  useEffect(() => {
    try {window.localStorage.setItem(NOTE_TRAIL_KEY, JSON.stringify(settings)); setError('');}
    catch {setError('Note trail settings could not be saved in this browser.');}
  }, [settings]);
  return {settings, setSettings, error};
}
