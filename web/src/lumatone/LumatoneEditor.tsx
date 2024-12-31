import {Button, Card, createListCollection, Flex, Grid, GridItem, Input, Text} from '@chakra-ui/react';
import LumatoneBoard, {EditorKeyOffset} from './LumatoneBoard.tsx';
import Color from 'colorjs.io';
import {Okhsl, Okhsv} from 'colorjs.io/fn';
import {scale} from './util';
import {useCallback, useState} from 'react';
import _ from 'lodash-es';
import {gridPosToKeyPosition} from './layoutData.ts';
import {Coord, KeyType, LumatoneLayer, LumatoneMapping, MidiChannel} from './lumatoneTypes.ts';
import {Field} from '../components/ui/field.tsx';
import {
  SelectContent,
  SelectItem,
  SelectItemGroup,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '../components/ui/select.tsx';

const getNoteColorHsl = (n: number): Color => {

  const oct = ((n - 60) / 12);

  return new Color({
    space: Okhsl,
    coords: [
      28 + 360 * (((n * 5) % 12) / 12),
      0.95 - (oct > 0 ? oct * .2 : 0),
      0.4 + oct * .1,
    ],
  });

  // return new Color({
  //   space: Okhsl,
  //   coords: [
  //     28 + 360 * (((n * 5) % 12) / 12),
  //     scale(Math.max(0, oct), [0, 4], [1, 0]),
  //     scale(oct, [-4, 4], [0, 0.9]),
  //   ],
  // });

  // return new Color({
  //   space: Okhsv,
  //   coords: [
  //     28 + 360 * (((n * 5) % 12) / 12),
  //     oct >= 0 ? 1 - oct / 4 : 1,
  //     oct <= 0 ? 1 + oct / 4 : 1,
  //   ],
  // });
};

export const unmapped: LumatoneMapping = {
  channel: 1,
  keyColor: new Color('black'),
  keyType: KeyType.Disabled,
  noteNum: 0,
};

const blankLayer: LumatoneLayer = {
  layerName: 'New Layer',
  layerColor: getNoteColorHsl(60),
  mappingFn: () => unmapped,
  mappingFnName: 'unmapped',
  mappingFnRowOffset: 0,
  mappingFnColOffset: 0,
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

const mappingFns: {[index: string]: (channel: MidiChannel, offset?: Coord) => (key: Coord) => LumatoneMapping} = {
  'wikiHayden': wikiHayden,
};

const mappingFnOptions = createListCollection({
  items: [
    {label: 'Wiki Hayden', value: 'wikiHayden', group: 'Note Layouts'},
  ],
});

const mappingFnCategories = mappingFnOptions.items.reduce(
  (acc, item) => {
    const group = acc.find((group) => group.group === item.group)
    if (group) {
      group.items.push(item)
    } else {
      acc.push({ group: item.group, items: [item] })
    }
    return acc
  },
  [] as { group: string; items: (typeof mappingFnOptions)["items"] }[],
)



type LayerAssignment = {
  keys: { [index: string]: EditorKeyOffset },
  lumatoneLayer: LumatoneLayer,
}

function LumatoneEditor() {

  const [layers, setLayers] = useState<LayerAssignment[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LumatoneLayer>(blankLayer);
  const [selectedKeys, setSelectedKeys] = useState<{ [index: string]: EditorKeyOffset }>({});

  const nextLayer = () => ({
    ...blankLayer,
    layerColor: getNoteColorHsl(layers.length + 61),
    layerName: `Layer ${layers.length + 1}`,
  });

  const handleSelectionBoxUpdate = useCallback((nextSelection: EditorKeyOffset[]) => {
    const nextIds = nextSelection.map(({id}) => id);
    const didChange = _.xor(_.keys(selectedKeys), nextIds).length;
    if (didChange) {
      const nextSelectedKeys = _.fromPairs(nextSelection.map(sk => [sk.id, sk]));
      setSelectedKeys(nextSelectedKeys);

      const topLeft = _.orderBy(nextSelectedKeys, ['gridPos.y', 'gridPos.x'])[0];
      const {x, y} = topLeft.gridPos;
      setSelectedLayer(sl => ({
        ...sl,
        mappingFnColOffset: -x,
        mappingFnRowOffset: -y,
      }))
    }
  }, [selectedKeys]);

  const getLayer = (gridPos: Coord): LumatoneLayer | undefined => {
    const {id} = gridPosToKeyPosition(gridPos);

    if (selectedKeys[id]) {
      return selectedLayer;
    }

    const layer = _.find<LayerAssignment>(layers, l => !!l.keys[id]);
    return layer && layer.lumatoneLayer;
  };

  return (
    <Card.Root>
      <Card.Header>Lumatone</Card.Header>
      <Card.Body gap={2}>

        <LumatoneBoard
          getLayer={getLayer}
          onSelectionBoxUpdate={handleSelectionBoxUpdate}
        />

        <Grid templateColumns="repeat(4, 1fr)" gap="2">
          {!_.isEmpty(selectedKeys) && (
            <GridItem rowSpan={2}>
              <Card.Root
                borderColor={selectedLayer.layerColor.toString({format: 'hex'})}
              >
                <Card.Header>{selectedLayer.layerName}</Card.Header>
                <Card.Body gap={2}>
                  <Field label="Label">
                    <Input
                      value={selectedLayer.layerName}
                      onChange={(e) => {
                        setSelectedLayer(l => ({
                          ...l,
                          layerName: e.target.value,
                        }));
                      }}
                    />
                  </Field>

                  <SelectRoot
                    collection={mappingFnOptions} // TODO: categories https://www.chakra-ui.com/docs/components/select#option-group
                    value={[selectedLayer.mappingFnName]}
                    onValueChange={(e) => {
                      const mappingFnName = e.value[0];
                      setSelectedLayer(l => ({
                        ...l,
                        mappingFnName,
                        mappingFn: mappingFns[mappingFnName](1, {x: l.mappingFnColOffset, y: l.mappingFnRowOffset}),
                      }));
                    }}
                  >
                    <SelectLabel>Mapping Function</SelectLabel>
                    <SelectTrigger>
                      <SelectValueText placeholder="Select mapping fn" />
                    </SelectTrigger>

                    <SelectContent>
                      {mappingFnCategories.map((category) => (
                        <SelectItemGroup key={category.group} label={category.group}>
                          {mappingFnOptions.items.map((item) => (
                            <SelectItem item={item} key={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectItemGroup>
                      ))}
                    </SelectContent>
                  </SelectRoot>

                  <Field label="Col offset">
                    <Input
                      type="number"
                      value={selectedLayer.mappingFnColOffset}
                      onChange={(e) => {
                        const mappingFnColOffset = parseInt(e.target.value, 10);
                        setSelectedLayer(l => ({
                          ...l,
                          mappingFnColOffset,
                          mappingFn: mappingFns[l.mappingFnName](1, {x: mappingFnColOffset, y: l.mappingFnRowOffset}),
                        }));
                      }}
                    />
                  </Field>

                  <Flex gap={2}>
                    <Field label="Row offset">
                      <Input
                        type="number"
                        value={selectedLayer.mappingFnRowOffset}
                        onChange={(e) => {
                          const mappingFnRowOffset = parseInt(e.target.value, 10);
                          setSelectedLayer(l => ({
                            ...l,
                            mappingFnRowOffset,
                            mappingFn: mappingFns[l.mappingFnName](1, {x: l.mappingFnColOffset, y: mappingFnRowOffset}),
                          }));
                        }}
                      />
                    </Field>
                  </Flex>


                  <Button
                    onClick={() => {
                      setLayers([
                        {
                          keys: selectedKeys,
                          lumatoneLayer: selectedLayer,
                        },
                        ...layers,
                      ]);
                      setSelectedKeys({});
                      setSelectedLayer(nextLayer());
                    }}
                    variant="subtle"
                  >
                    Add
                  </Button>
                </Card.Body>
              </Card.Root>
            </GridItem>
          )}

          {layers.map((layer: LayerAssignment, ix) => {
            const {
              lumatoneLayer: {
                layerName,
                layerColor,
                mappingFnName,
              },
            } = layer;
            return (
              <GridItem key={ix}>
                <Card.Root
                  borderColor={layerColor.toString({format: 'hex'})}
                >
                  <Card.Header>{layerName}</Card.Header>
                  <Card.Body gap={2}>
                    <Text>{mappingFnOptions.items.find(({value}) => value === mappingFnName)?.label}</Text>
                    <Button
                      onClick={() => {
                        setLayers(_.filter(layers, (_l, i) => ix !== i));
                      }}
                      variant="subtle"
                    >
                      Remove
                    </Button>
                  </Card.Body>
                </Card.Root>
              </GridItem>

            );
          })}
        </Grid>


      </Card.Body>
    </Card.Root>
  );
}

export default LumatoneEditor;