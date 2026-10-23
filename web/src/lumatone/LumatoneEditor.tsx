import {Button, Card, Grid, GridItem} from '@chakra-ui/react';
import LumatoneBoard from './LumatoneBoard.tsx';
import * as _ from 'lodash-es';
import {useAppDispatch, useAppSelector} from '../redux/hooks.ts';
import {layerAddOrUpdate, LayerAssignment, selectionToolSetLayerId} from '../redux/lumatoneEditorReducer.ts';
import LumatoneLayerEdit from './LumatoneLayerEdit.tsx';
import LumatoneLayerView from './LumatoneLayerView.tsx';
import {getNoteColorHsl} from './colors.ts';


/*
 https://sjoerdvisscher.glitch.me/lumatone
 https://github.com/JeffreyBenjaminBrown/lumatone-isomorphic
 https://github.com/kbrandwijk/lumachromatic
 https://www.plainsound.org/hex



* */


function LumatoneEditor() {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(s => s.lumatoneEditor.layers);

  const maxExistingOrder = _.max(_.values(layers).map(l => l.order)) || 0;

  return (
    <Card.Root>
      <Card.Header>Lumatone</Card.Header>

      <Card.Body gap={2}>
        <LumatoneBoard/>

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
