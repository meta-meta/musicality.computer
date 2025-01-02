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

const wikiHayden = (channel: MidiChannel, offset: Coord = {x: 0, y: 0}) =>
  (key: Coord): LumatoneMapping => {

    const x = key.x + offset.x;
    const y = key.y + offset.y;

    const noteNum = y % 2 === 0
      ? ((12 - y) * 6 + x * 2) + (x > 12 ? 24 : 0)
      : (12 - y) * 6 + x * 2 + 1 + (x > 12 ? 24 : 0);

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
  'wikiHayden': wikiHayden,
};

export const mappingFnOptions = createListCollection({
  items: [
    {label: 'Wiki Hayden', value: 'wikiHayden', group: 'Note Layouts'},
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