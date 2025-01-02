import {Button, Card, Flex, Grid, GridItem, Text} from '@chakra-ui/react';
import LumatoneBoard from './LumatoneBoard.tsx';
import _ from 'lodash-es';
import MidiDeviceSelect, {SelectionType} from '../MidiDeviceSelect.tsx';
import {lumatoneInSet, lumatoneOutSet} from '../redux/midiReducer.ts';
import {useAppDispatch, useAppSelector} from '../redux/hooks.ts';
import {layerAddOrUpdate, LayerAssignment, selectionToolSetLayerId} from '../redux/lumatoneEditorReducer.ts';
import LumatoneLayerEdit from './LumatoneLayerEdit.tsx';
import LumatoneLayerView from './LumatoneLayerView.tsx';
import {getNoteColorHsl} from './colors.ts';


function LumatoneEditor() {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(s => s.lumatoneEditor.layers);

  const maxExistingOrder = _.max(_.values(layers).map(l => l.order)) || 0;

  return (
    <Card.Root>
      <Card.Header>
        <Flex gap={4}>
          <Text>Lumatone</Text>

          <MidiDeviceSelect
            label="Lumatone In"
            selectionType={SelectionType.Input}
            onSelect={val => dispatch(lumatoneInSet(val))}
            value={useAppSelector(s => s.midi.lumatoneIn)}
          />

          <MidiDeviceSelect
            label="Lumatone Out"
            selectionType={SelectionType.Output}
            onSelect={val => dispatch(lumatoneOutSet(val))}
            value={useAppSelector(s => s.midi.lumatoneOut)}
          />
        </Flex>

      </Card.Header>

      <Card.Body gap={2}>
        <LumatoneBoard />

        <Button
          onClick={() => {
            const id = _.uniqueId('layer');
            dispatch(layerAddOrUpdate({
              id,
              isEditing: true,
              keys: {},
              layerChannel: 1,
              layerColor: getNoteColorHsl(maxExistingOrder + 60).toJSON(),
              layerName: `Layer ${maxExistingOrder + 1}`,
              mappingFnColOffset: 0,
              mappingFnName: 'unmapped',
              mappingFnRowOffset: 0,
              order: maxExistingOrder + 1,
            }));
            dispatch(selectionToolSetLayerId(id));
          }}
          variant="subtle"
        >
          New Layer
        </Button>

        <Grid templateColumns="repeat(4, 1fr)" gap="2">
          {_.orderBy(_.values(layers), 'order', 'desc')
            .map((layer: LayerAssignment, ix) => (
              <GridItem key={ix}>
                {layer.isEditing
                  ? <LumatoneLayerEdit layerAssignment={layer}/>
                  : <LumatoneLayerView layerAssignment={layer}/>}
              </GridItem>
            ))}
        </Grid>


      </Card.Body>
    </Card.Root>
  );
}

export default LumatoneEditor;