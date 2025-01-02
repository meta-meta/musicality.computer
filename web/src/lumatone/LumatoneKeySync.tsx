import {useEffect} from 'react';
import {useAppSelector} from '../redux/hooks.ts';
import {LumatoneKeyPosition, LumatoneMapping} from './lumatoneTypes.ts';
import {WebMidi} from 'webmidi';
import {changePush, setColor, setNote} from './luatoneCommunication.ts';


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
