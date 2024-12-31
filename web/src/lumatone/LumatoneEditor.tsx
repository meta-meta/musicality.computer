import {Button, Card, Stack} from '@chakra-ui/react';
import LumatoneBoard, {EditorKeyOffset} from './LumatoneBoard.tsx';
import Color from 'colorjs.io';
import {Okhsl} from 'colorjs.io/fn';
import {scale} from './util';
import {useCallback, useState} from 'react';
import _ from 'lodash-es';
import {gridPosToKeyPosition} from './layoutData.ts';
import {KeyType, LumatoneLayer, LumatoneMapping, MidiChannel} from './lumatoneTypes.ts';

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
  keys: {[index: string]: EditorKeyOffset},
  lumatoneLayer: LumatoneLayer,
}

function LumatoneEditor() {

  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<{[index: string]: EditorKeyOffset}>({});

  const handleSelect = useCallback((nextSelection: EditorKeyOffset[]) => {
    const nextIds = nextSelection.map(({id}) => id);
    const didChange = _.xor(_.keys(selectedKeys), nextIds).length;
    if (didChange) setSelectedKeys(_.fromPairs(nextSelection.map(sk => [sk.id, sk])));
  }, [selectedKeys]);

  const getLayer = (gridPos: Coord): LumatoneLayer | undefined => {
    const {id} = gridPosToKeyPosition(gridPos);

    if (selectedKeys[id]) {
      return selectedLayer;
    }

    const layer = _.find<Layer>(layers, l => !!l.keys[id]);
    return layer && layer.lumatoneLayer;
  };

  return (
    <Card.Root>
      <Card.Header>Lumatone</Card.Header>
      <Card.Body>

        <LumatoneBoard
          getLayer={getLayer}
          onSelect={handleSelect}
        />

        <Stack>
          {!_.isEmpty(selectedKeys) && (
            <Card.Root
              borderColor={selectedLayer.layerColor.toString({format: 'hex'})}
            >
              <Card.Header>{selectedLayer.layerName}</Card.Header>
              <Card.Body>
                <Button
                  onClick={() => {
                    const topLeft = _.orderBy(selectedKeys, ['gridpos.y', 'gridpos.x'])[0];
                    const {x,y} = topLeft.gridPos;

                    setLayers([
                      {
                        keys: selectedKeys,
                        lumatoneLayer: {
                          layerName: `Layer ${layers.length + 1}`,
                          layerColor: getNoteColorHsl(layers.length + 60),
                          mappingFn: wikiHayden(1, {x: -x, y: -y}),
                          mappingFnName: wikiHayden.name,
                        },
                      },
                      ...layers,
                    ]);
                    setSelectedKeys({});
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