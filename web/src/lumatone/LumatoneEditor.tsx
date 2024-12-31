import {Button, Card, Stack} from '@chakra-ui/react';
import LumatoneBoard from './LumatoneBoard';
import {KeyType, LumatoneLayer, LumatoneMapping, MidiChannel} from './LumatoneKey.tsx';
import Color from 'colorjs.io';
import {Okhsl} from 'colorjs.io/fn';
import {scale} from './util';
import {useCallback, useState} from 'react';
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

export const nullMapping: LumatoneMapping = {
  channel: 1,
  keyColor: new Color('black'),
  keyType: KeyType.Disabled,
  noteNum: 0,
};

const selectedMapping: LumatoneMapping = {
  channel: 1,
  keyColor: new Color('black'),
  keyType: KeyType.Disabled,
  noteNum: 0,
};

const selectedLayer: LumatoneLayer = {
  layerName: 'New',
  layerColor: new Color('white'),
  mappingFn: () => selectedMapping,
  mappingFnName: '',
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
      noteNum,
    });
  };


export type Coord = { x: number; y: number };

type Layer = {
  ids: string[],
  lumatoneLayer: LumatoneLayer,
}

function LumatoneEditor() {

  const [layers, setLayers] = useState<Layer[]>([
    // {
    //   ids: ['0,0', '0,1', '1,2', '1,3', '2,3', '2,2'],
    //   lumatoneLayer: {
    //     layerName: 'Layer Blue',
    //     layerColor: new Color('blue'),
    //     mappingFn: wikiHayden(1, {x: 3, y: 0}),
    //     mappingFnName: wikiHayden.name,
    //   },
    // },
    // {
    //   ids: ['0,0', '0,1', '1,0', '1,1', '2,0', '2,1', '3,0', '3,1'],
    //   lumatoneLayer: {
    //     layerName: 'Layer Purple',
    //     layerColor: new Color('rebeccapurple'),
    //     mappingFn: wikiHayden(1, {x: 0, y: 0}),
    //     mappingFnName: wikiHayden.name,
    //   },
    // },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelect = useCallback((s: object[]) => {
    const next = s.map(s => s.id);
    const didChange = _.xor(selectedIds, next).length;
    if (didChange) setSelectedIds(next);
  }, [selectedIds]);

  const getLayer = ({x, y}: Coord): LumatoneLayer | null => {
    const id = `${x},${y}`;

    if (_.includes(selectedIds, id)) {
      return selectedLayer;
    }

    const layer = _.find<Layer>(layers, l => _.includes(l.ids, id));

    return layer
      ? layer.lumatoneLayer
      : null;
  };

  return (
    <Card.Root>
      <Card.Header>Lumatone</Card.Header>
      <Card.Body>

        <LumatoneBoard
          getLayer={getLayer}
          layout={wikiHayden}
          onSelect={handleSelect}
          pcSet={[]}
          pitchSet={[]}
        />

        <Stack>
          {!_.isEmpty(selectedIds) && (
            <Card.Root
              borderColor={selectedLayer.layerColor.toString({format: 'hex'})}
            >
              <Card.Header>{selectedLayer.layerName}</Card.Header>
              <Card.Body>
                <Button
                  onClick={() => {

                    // TODO: something more robust
                    const [x, y] = selectedIds[0].split(',').map(i => parseInt(i, 10));

                    setLayers([
                      {
                        ids: selectedIds,
                        lumatoneLayer: {
                          layerName: `Layer ${layers.length + 1}`,
                          layerColor: getNoteColorHsl(layers.length + 60),
                          mappingFn: wikiHayden(1, {x: -x, y: -y}),
                          mappingFnName: wikiHayden.name,
                        },
                      },
                      ...layers,
                    ]);
                    setSelectedIds([]);
                  }}
                >
                  Add
                </Button>
              </Card.Body>
            </Card.Root>
          )}

          {layers.map((layer: Layer, ix) => {
            const {
              lumatoneLayer: {
                layerName,
                layerColor,
                mappingFn,
                mappingFnName,
              },
            } = layer;
            return (
              <Card.Root
                key={ix}
                borderColor={layerColor.toString({format: 'hex'})}
              >
                <Card.Header>{layerName}</Card.Header>
                <Card.Body>{mappingFnName}</Card.Body>
              </Card.Root>
            );
          })}
        </Stack>


      </Card.Body>
    </Card.Root>
  );
}

export default LumatoneEditor;