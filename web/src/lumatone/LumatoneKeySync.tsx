// noinspection JSUnusedLocalSymbols

import {useEffect, useRef, useState} from 'react';
import {useAppSelector} from '../redux/hooks.ts';
import {LumatoneKeyPosition, LumatoneMapping} from './lumatoneTypes.ts';
import {NoteMessageEvent, WebMidi} from 'webmidi';
import {changePush, setColor, setColorRgb, setNote} from './luatoneCommunication.ts';
import _ from 'lodash-es';
import {current} from '@reduxjs/toolkit';


export interface LumatoneKeySyncProps {
  keyPosition: LumatoneKeyPosition,
  mapping: LumatoneMapping,
}

function LumatoneKeySync({
  keyPosition,
  mapping,
}: LumatoneKeySyncProps) {
  const lumatoneIn = useAppSelector(s => s.midi.lumatoneIn);
  const lumatoneOut = useAppSelector(s => s.midi.lumatoneOut);

  const isSomeLayerEditing = useRef(false);
  const timeoutIdIsMapped = useRef(-1);
  const timeoutId = useRef(-1);
  const velAtNoteOn = useRef(0);
  const isMapped = useRef(false);

  const layers = useAppSelector(s => s.lumatoneEditor.layers);
  isSomeLayerEditing.current = _.some(layers, l => l.isEditing);

  useEffect(() => {
    if (!lumatoneIn || !lumatoneOut) return;
    const deviceIn = WebMidi.getInputById(lumatoneIn);
    const deviceOut = WebMidi.getOutputById(lumatoneOut);
    if (!deviceIn || !deviceOut) return;

    const map = async () => {
      isMapped.current = false;
      clearTimeout(timeoutId.current);

      changePush(() => setColor(deviceIn, deviceOut, keyPosition, mapping));
      changePush(() => setNote(deviceIn, deviceOut, keyPosition, mapping));
    }

    map();

    const velToBrighness = (vel: number) => 0.5 + Math.max(0.3, vel / 255)

    const handleNoteOff = (e: NoteMessageEvent) => {
      if (isSomeLayerEditing.current) return;
      const {dataBytes: [nPlayed]} = e;


      const repeatCount = 7;
      if (nPlayed === mapping.noteNum) {
        window.dispatchEvent(new CustomEvent('lumatoneNoteOff', {detail: {note: nPlayed, mapping, keyPosition}}));

        let repeat = repeatCount - 1;
        const pushChanges = () => {
          const brighthness = velToBrighness(velAtNoteOn.current);
          const color = mapping.keyColor.clone().range('black')(brighthness * repeat / repeatCount).to('srgb');
          changePush(() => setColorRgb(deviceIn, deviceOut, keyPosition, color));

          if (repeat > 0) {
            repeat--;

            clearTimeout(timeoutId.current);
            timeoutId.current = setTimeout(pushChanges, 44 * repeat); // TODO: figure out how to avoid throttling when tab is not focused
          }
        };

        pushChanges();
      }
    };

    const handleNoteOn = (e: NoteMessageEvent) => {
      if (isSomeLayerEditing.current) return;
      const {dataBytes: [nPlayed, vPlayed]} = e;

      if (nPlayed === mapping.noteNum) {
        window.dispatchEvent(new CustomEvent('lumatoneNoteOn', {detail: {note: nPlayed, vel: vPlayed, mapping, keyPosition}}));
        velAtNoteOn.current = vPlayed;

        clearTimeout(timeoutId.current);
        const color = mapping.keyColor.clone().range('black')(velToBrighness(vPlayed)).to('srgb');
        changePush(() => setColorRgb(deviceIn, deviceOut, keyPosition, color));
      }
    };

    deviceIn.addListener('noteon', handleNoteOn);
    deviceIn.addListener('noteoff', handleNoteOff);

    return () => {
      clearTimeout(timeoutId.current);
      clearTimeout(timeoutIdIsMapped.current);
      deviceIn.removeListener('noteon', handleNoteOn);
      deviceIn.removeListener('noteoff', handleNoteOff);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lumatoneIn, lumatoneOut, keyPosition, JSON.stringify(mapping)]); // stringify mapping because mapping.keyColor doesn't pass reference equality check

  return null;
}

export default LumatoneKeySync;
