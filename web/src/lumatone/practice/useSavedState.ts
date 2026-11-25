/* eslint-disable react-refresh/only-export-components */
import {useEffect, useState} from 'react';
import type {Dispatch, SetStateAction} from 'react';

// Practice controls that are not part of a recorded session (display, sound and
// input options, the chosen tune) share one saved object in this browser.
export const PRACTICE_VIEW_KEY = 'musicality.practice-view.v1';

export function readSavedView(storage: Pick<Storage, 'getItem'>): Record<string, unknown> {
  try {
    const value = JSON.parse(storage.getItem(PRACTICE_VIEW_KEY) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function savedValue<T>(storage: Pick<Storage, 'getItem'>, name: string, fallback: T, valid: (value: unknown) => boolean): T {
  const view = readSavedView(storage);
  return name in view && valid(view[name]) ? view[name] as T : fallback;
}

export const isBoolean = (value: unknown) => typeof value === 'boolean';
export const oneOf = (...options: unknown[]) => (value: unknown) => options.includes(value);
export const numberBetween = (low: number, high: number, whole = false) => (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high && (!whole || Number.isInteger(value));
export const booleanRecord = (keys: string[]) => (value: unknown) => Boolean(value) && typeof value === 'object'
  && keys.every(key => typeof (value as Record<string, unknown>)[key] === 'boolean');

// useState that remembers its value. An invalid or missing saved value falls
// back to the default, and a browser that refuses storage still works for the visit.
export function useSavedState<T>(name: string, fallback: T, valid: (value: unknown) => boolean): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {return savedValue(window.localStorage, name, fallback, valid);} catch {return fallback;}
  });
  useEffect(() => {
    try {
      const view = readSavedView(window.localStorage);
      if (JSON.stringify(view[name]) === JSON.stringify(value)) return;
      window.localStorage.setItem(PRACTICE_VIEW_KEY, JSON.stringify({...view, [name]: value}));
    } catch { /* The value still applies for this visit. */ }
  }, [name, value]);
  return [value, setValue];
}
