import Color from 'colorjs.io';
import {Coord} from './LumatoneEditor.tsx';

export type LumatoneKeyPosition = {
  boardNum: number,
  id: string,
  note: number,
}

export interface LumatoneMapping {
  channel: MidiChannel,
  keyColor: Color,
  keyType: KeyType,
  noteNum: number,
}

export interface LumatoneLayer {
  layerColor: Color,
  layerName: string,
  mappingFn: (c: Coord) => LumatoneMapping,
  mappingFnName: string,
}

export type MidiChannel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export enum KeyType {
  NoteOnOff,
  ContinuousController,
  Lumatouch,
  Disabled,
}