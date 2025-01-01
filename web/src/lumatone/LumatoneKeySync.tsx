import {useEffect} from 'react';
import {useAppSelector} from '../redux/hooks.ts';
import {LumatoneKeyPosition, LumatoneMapping} from './lumatoneTypes.ts';
import {Input, NoteMessageEvent, Output, WebMidi} from 'webmidi';
import {sRGB} from 'colorjs.io/fn';

const setColor = (deviceIn: Input, deviceOut: Output, keyPosition: LumatoneKeyPosition, mapping: LumatoneMapping) =>
  new Promise<void>((res) => {
    const mfid = [0x00, 0x21, 0x50]; // Embodme according to https://www.midi.org/specifications-old/item/manufacturer-id-numbers
    const setKeyColor = 0x01;
    const normTo255 = (norm: number) => Math.max(0, Math.min(255, Math.floor(norm * 255)));

    const rgb = mapping.keyColor.clone().to(sRGB);

    const r = normTo255(rgb.r);
    const g = normTo255(rgb.g);
    const b = normTo255(rgb.b);

    deviceIn.addOneTimeListener('sysex', () => {
      res();
    });
    deviceOut.sendSysex(mfid, [keyPosition.boardNum, setKeyColor, keyPosition.note, r >> 4, r & 0xf, g >> 4, g & 0xf, b >> 4, b & 0xf]);
  });


const setNote = (deviceIn: Input, deviceOut: Output, keyPosition: LumatoneKeyPosition, mapping: LumatoneMapping) =>
  new Promise<void>((res) => {
    const mfid = [0x00, 0x21, 0x50]; // Embodme according to https://www.midi.org/specifications-old/item/manufacturer-id-numbers
    const setKeyNote = 0x00;
    deviceIn.addOneTimeListener('sysex', () => {
      res();
    });
    deviceOut.sendSysex(mfid, [keyPosition.boardNum, setKeyNote, keyPosition.note, mapping.noteNum, mapping.channel, mapping.keyType]);
  });

const changeBuffer: (() => Promise<void>)[] = [];
let isPopping = false;

const changePush = async (ch: () => Promise<void>) => {
  changeBuffer.push(ch);

  if (isPopping) return;

  let chPop;
  isPopping = true;
  while ((chPop = changeBuffer.shift())) {
    await chPop();
  }
  isPopping = false;
};


export interface LumatoneKeySyncProps {
  keyPosition: LumatoneKeyPosition,
  mapping: LumatoneMapping,
}

function LumatoneKeySync({
  keyPosition,
  mapping,
}: LumatoneKeySyncProps) {
  const lumatoneIn = useAppSelector(s => s.midiReducer.lumatoneIn);
  const lumatoneOut = useAppSelector(s => s.midiReducer.lumatoneOut);


  useEffect(() => {
    if (!lumatoneIn || !lumatoneOut) return;
    const deviceIn = WebMidi.getInputById(lumatoneIn);
    const deviceOut = WebMidi.getOutputById(lumatoneOut);
    if (!deviceIn || !deviceOut) return;

    changePush(() => setColor(deviceIn, deviceOut, keyPosition, mapping));
    // await setColor(lumaIn, lumaOut, boardNum, note, r, g, b);
    // await setNote(lumaIn, lumaOut, boardNum, note, n);

    // const typeByteCC =  (true << 4) | 2;   // (faderUpIsNull << 4) | keyType
    // await setNote(lumaIn, lumaOut, boardNum, note, n, 1, typeByteCC); // cc

    changePush(() => setNote(deviceIn, deviceOut, keyPosition, mapping));

    // let timeoutId : number;
    // const maxL = 1;
    //
    // const handleNoteOff = (e: NoteMessageEvent) => {
    //   const {dataBytes: [nPlayed, vPlayed]} = e;
    //
    //   const repeatCount = 1;
    //   if (nPlayed === n) {
    //     let repeat = repeatCount - 1;
    //     const pushChanges = () => {
    //
    //
    //       const {r,g,b} = window.culori ? window.culori.converter('rgb')({
    //         ...color,
    //         l: color.l + (maxL-color.l)*(repeat / repeatCount),
    //       }) : {r: 0, g: 0, b: 0};
    //
    //
    //       // const [r, g, b] = hslToRgb(h, s + (1-s)*(repeat / repeatCount), l + (maxL-l)*(repeat / repeatCount));
    //
    //       changePush(() => setColor(deviceIn, deviceOut, boardNum, note, r, g, b));
    //
    //       if (repeat > 0) {
    //         repeat--;
    //
    //         clearTimeout(timeoutId);
    //         timeoutId = setTimeout(pushChanges, 200 * repeat);
    //       }
    //     };
    //
    //     pushChanges();
    //   }
    // };
    //
    // const handleNoteOn = (e: NoteMessageEvent) => {
    //   const {dataBytes: [nPlayed, vPlayed]} = e;
    //
    //   if (nPlayed === n) {
    //     clearTimeout(timeoutId);
    //     const {r,g,b} = window.culori ? window.culori.converter('rgb')({
    //       ...color,
    //       l: color.l + .35,
    //     }) : {r: 0, g: 0, b: 0};
    //
    //     changePush(() => setColor(deviceIn, deviceOut, boardNum, note, r, g, b));
    //   }
    // };
    //
    // deviceIn.addListener('noteon', handleNoteOn);
    // deviceIn.addListener('noteoff', handleNoteOff);
    //
    // return () => {
    //   clearTimeout(timeoutId);
    //   deviceIn.removeListener('noteon', handleNoteOn);
    //   deviceIn.removeListener('noteoff', handleNoteOff);
    // }

  }, [lumatoneIn, lumatoneOut, keyPosition, mapping]);

  return null;
}

export default LumatoneKeySync;
