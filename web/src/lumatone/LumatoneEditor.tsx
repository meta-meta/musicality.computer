import {Card} from '@chakra-ui/react';
import LumatoneBoard from './LumatoneBoard';
import {KeyType, LumatoneMapping, MidiChannel} from './LumatoneKey.tsx';
import Color from 'colorjs.io';
import {Okhsl} from 'colorjs.io/fn';
import {scale} from './util';
import {useState} from 'react';
import _ from 'lodash-es';

const getNoteColorHsl = (n: number): Color => {

  const oct = ((n - 60) / 12);

  // return new Color({
  //   space: Okhsl,
  //   coords: [
  //     28 + 360 * (((n * 5) % 12) / 12),
  //     0.95 - (oct > 0 ? oct * .2 : 0),
  //     0.4 + oct * .1,
  //   ],
  // });

  return new Color({
    space: Okhsl,
    coords: [
      28 + 360 * (((n * 5) % 12) / 12),
      scale(Math.max(0, oct), [0, 4], [1, 0]),
      scale(oct, [-4, 4], [0, 0.9]),
    ],
  });

  // return new Color({
  //   space: Okhsv,
  //   coords: [
  //     28 + 360 * (((n * 5) % 12) / 12),
  //     oct >= 0 ? 1 - oct / 4 : 1,
  //     oct <= 0 ? 1 + oct / 4 : 1,
  //   ],
  // });
};

const nullMapping: LumatoneMapping = {
  channel: 1,
  keyColor: new Color('black'),
  keyType: KeyType.Disabled,
  layerColor: new Color('black'),
  layerName: '',
  noteNum: 0,
};


const wikiHayden = (channel: MidiChannel, offset: Coord = {x: 0, y: 0}, layerName: string, layerColor: Color) =>
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
      layerColor,
      layerName,
      noteNum,
    });
  };


type Coord = { x: number; y: number };

type Layer = {
  rows: object,
  mappingFn: (arg: Coord) => LumatoneMapping,
}

function LumatoneEditor() {

  const [layers, setLayers] = useState<Layer[]>([
    {
      rows: {
        0: {0: true, 1: true},
        1: {2: true, 3: true},
        2: {2: true, 3: true},
        3: {2: true, 3: true},
      },
      mappingFn: wikiHayden(1, {x: 3, y: 0}, 'Layer 2', new Color('blue')),
    },
    {
      rows: {
        0: {0: true, 1: true},
        1: {0: true, 1: true},
        2: {0: true, 1: true},
        3: {0: true, 1: true},
      },
      mappingFn: wikiHayden(1, {x: 0, y: 0}, 'Layer 1', new Color('rebeccapurple')),
    },
  ]);

  const getMapping = ({x, y}: Coord): LumatoneMapping => {
    const layer = _.findLast<Layer>(layers, l => _.get(l.rows, [y, x]));

    return layer
      ? layer.mappingFn({x, y})
      : nullMapping;
  };

  return (
    <Card.Root>
      <Card.Header>Lumatone</Card.Header>
      <Card.Body>

        <LumatoneBoard
          getMapping={getMapping}
          layout={wikiHayden}
          pcSet={[]}
          pitchSet={[]}
        />


      </Card.Body>
    </Card.Root>
  );
}

export default LumatoneEditor;