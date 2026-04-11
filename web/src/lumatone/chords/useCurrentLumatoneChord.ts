import _ from 'lodash-es';
import {useEffect, useRef, useState} from 'react';
import {convertCoords} from '../mappingFunctions.ts';
import type {CoordAxial, CoordOffset, LumatoneChordData} from '../lumatoneTypes.ts';

type LiveKey = {
  vel: number;
  axial: CoordAxial;
  mapping: unknown;
};

type LumatoneNoteOnDetail = {
  note: number;
  vel: number;
  mapping: unknown;
  keyPosition: {
    gridPos: CoordOffset;
  };
};

type LumatoneNoteOffDetail = {
  note: number;
  keyPosition: {
    gridPos: CoordOffset;
  };
};

export function useCurrentLumatoneChord() {
  const luma = useRef<Record<number, LiveKey>>({});
  const lumaRoot = useRef<{axial: CoordAxial; note: number} | null>(null);
  const [currentChord, setCurrentChord] = useState<LumatoneChordData | null>(null);

  useEffect(() => {
    const onNoteOff = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<LumatoneNoteOffDetail>;
      const {note, keyPosition: {gridPos}} = event.detail;

      delete luma.current[note];

      const axial = convertCoords(gridPos, {x: 0, y: 0});
      const {axial: rootAxial} = lumaRoot.current || {axial: {q: 0, r: 0}, note: 0};
      if (rootAxial.q === axial.q && rootAxial.r === axial.r) {
        lumaRoot.current = null;
      }

      const {note: rootNote} = lumaRoot.current || {note: 0};

      if (lumaRoot.current) {
        setCurrentChord({
          root: rootNote,
          intervals: _.map(luma.current, ({axial: {q, r}}) => [q, r]),
          fromRootInterval: [0, 0],
          fromIntervals: [],
        });
      } else {
        setCurrentChord(null);
      }

      console.log(luma.current);
    };

    const onNoteOn = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<LumatoneNoteOnDetail>;
      const {note, vel, mapping, keyPosition: {gridPos}} = event.detail;

      if (luma.current[note]) {
        console.log('already playing', note);
        return;
      }

      const axial = convertCoords(gridPos, {x: 0, y: 0});

      console.log('axial', axial, note);

      if (!lumaRoot.current) {
        lumaRoot.current = {
          axial,
          note,
        };
      }

      const {axial: rootAxial, note: rootNote} = lumaRoot.current;

      if (rootNote !== note) {
        luma.current = {
          ...luma.current,
          [note]: {
            vel,
            axial,
            mapping,
          },
        };
      }

      setCurrentChord({
        root: rootNote,
        intervals: _.map(luma.current, ({axial: {q, r}}) => [q - rootAxial.q, r - rootAxial.r]),
        fromRootInterval: [0, 0],
        fromIntervals: [],
      });
    };

    window.addEventListener('lumatoneNoteOff', onNoteOff);
    window.addEventListener('lumatoneNoteOn', onNoteOn);

    return () => {
      window.removeEventListener('lumatoneNoteOff', onNoteOff);
      window.removeEventListener('lumatoneNoteOn', onNoteOn);
    };
  }, []);

  return currentChord;
}
