import {Coord, KeyType, LumatoneMapping, Midi7Bit, MidiChannel} from './lumatoneTypes.ts';
import {getNoteColorHsl} from './colors.ts';
import {createListCollection} from '@chakra-ui/react';
import Color from 'colorjs.io';

export const disabledMapping: LumatoneMapping = {
  channel: 1,
  keyColor: new Color('black'),
  keyType: KeyType.DisabledDefault,
  noteNum: 0,
};

// https://www.redblobgames.com/grids/hexagons/
const oddrToAxial = ({x, y}: Coord) => {
  const q = x - (y - (y & 1)) / 2;
  const r = y;
  return {q, r};
};

const convertCoords = (key: Coord, offset: Coord) => {
  const oddRowOffset = offset.y % 2 !== 0;
  const offsetFactor = oddRowOffset ? 1 : 0;
  const {q: qKey, r: rKey} = oddrToAxial({x: key.x, y: -key.y});
  const {q: qOffset, r: rOffset} = oddrToAxial({x: offset.x - offsetFactor, y: -offset.y});
  const q = qKey + qOffset;
  const r = rKey + rOffset;
  return {q, r};
};

const harmonicTable = (channel: MidiChannel, offset: Coord = {x: 0, y: 0}) =>
  (key: Coord): LumatoneMapping => {

    const {q, r} = convertCoords(key, offset);
    const startingNote = 72;
    const noteNum = startingNote + q * 3 + r * 7;

    return ({
      channel,
      keyColor: getNoteColorHsl(noteNum),
      keyType: KeyType.NoteOnOff,
      noteNum: Math.max(Math.min(noteNum, 127), 0) as Midi7Bit,
    });
  };

const janko = (channel: MidiChannel, offset: Coord = {x: 0, y: 0}) =>
  (key: Coord): LumatoneMapping => {

    const {q, r} = convertCoords(key, offset);
    const startingNote = 36;
    const noteNum = startingNote + q * 2 + r * 1;

    return ({
      channel,
      keyColor: getNoteColorHsl(noteNum),
      keyType: KeyType.NoteOnOff,
      noteNum: Math.max(Math.min(noteNum, 127), 0) as Midi7Bit,
    });
  };

const wikiHayden = (channel: MidiChannel, offset: Coord = {x: 0, y: 0}) =>
  (key: Coord): LumatoneMapping => {
    const {q, r} = convertCoords(key, offset);
    const startingNote = 60;
    const noteNum = startingNote + q * 2 + r * 7;

    return ({
      channel,
      keyColor: getNoteColorHsl(noteNum),
      keyType: KeyType.NoteOnOff,
      noteNum: Math.max(Math.min(noteNum, 127), 0) as Midi7Bit,
    });
  };

export const mappingFns: {
  [index: string]: (channel: MidiChannel, offset?: Coord) => (key: Coord) => LumatoneMapping
} = {
  'unmapped': () => () => disabledMapping,
  'harmonicTable': harmonicTable,
  'janko': janko,
  'wikiHayden': wikiHayden,
};

export const mappingFnOptions = createListCollection({
  items: [
    {label: 'Harmonic Table', value: 'harmonicTable', group: '» Note Layouts'},
    {label: 'Jankó', value: 'janko', group: '» Note Layouts'},
    {label: 'Wiki-Hayden', value: 'wikiHayden', group: '» Note Layouts'},
  ],
});

export const mappingFnCategories = mappingFnOptions.items.reduce(
  (acc, item) => {
    const group = acc.find((group) => group.group === item.group);
    if (group) {
      group.items.push(item);
    } else {
      acc.push({group: item.group, items: [item]});
    }
    return acc;
  },
  [] as { group: string; items: (typeof mappingFnOptions)['items'] }[],
);