import {Input, Output} from 'webmidi';
import {LumatoneKeyPosition, LumatoneMapping} from './lumatoneTypes.ts';

/* Derived from
https://github.com/vsicurella/TerpstraSysEx.2014
* */

// TODO: https://github.com/kbrandwijk/lumachromatic/tree/%40kbrandwijk/driver-per-board
// it should be possible to speed this up by pushing to each board in parallel but
// my attempt in branch lumatone-comm-per-board drops messages.
// might want to eventually switch to lumachromatic's driver since it is a more complete port of OG editor


export const setColor = (deviceIn: Input, deviceOut: Output, keyPosition: LumatoneKeyPosition, mapping: LumatoneMapping) =>
  new Promise<void>((res) => {
    const mfid = [0x00, 0x21, 0x50]; // Embodme according to https://www.midi.org/specifications-old/item/manufacturer-id-numbers
    const setKeyColor = 0x01;
    const normTo255 = (norm: number) =>
      Math.max(0, Math.min(255, Math.floor(norm * 255)));

    const rgb = mapping.keyColor.clone().to('srgb');

    const r = normTo255(rgb.r);
    const g = normTo255(rgb.g);
    const b = normTo255(rgb.b);

    deviceIn.addOneTimeListener('sysex', () => {
      res();
    });
    deviceOut.sendSysex(mfid, [keyPosition.boardNum, setKeyColor, keyPosition.note, r >> 4, r & 0xf, g >> 4, g & 0xf, b >> 4, b & 0xf]);
  });


export const setNote = (deviceIn: Input, deviceOut: Output, keyPosition: LumatoneKeyPosition, mapping: LumatoneMapping) =>
  new Promise<void>((res) => {
    const mfid = [0x00, 0x21, 0x50]; // Embodme according to https://www.midi.org/specifications-old/item/manufacturer-id-numbers
    const setKeyNote = 0x00;
    deviceIn.addOneTimeListener('sysex', () => {
      res();
    });
    deviceOut.sendSysex(mfid, [keyPosition.boardNum, setKeyNote, keyPosition.note, mapping.noteNum, mapping.channel - 1, mapping.keyType]);
  });

const changeBuffer: (() => Promise<void>)[] = [];
let isPopping = false;


export const changePush = async (ch: () => Promise<void>) => {
  changeBuffer.push(ch);

  if (isPopping) return;

  let chPop;
  isPopping = true;
  while ((chPop = changeBuffer.shift())) {
    await chPop();
  }
  isPopping = false;
};