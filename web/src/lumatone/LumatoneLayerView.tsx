import {layerAddOrUpdate, LayerAssignment, layerRemove} from '../redux/lumatoneEditorReducer.ts';
import {Button, Card, Text} from '@chakra-ui/react';
import * as _ from 'lodash-es';
import Color from 'colorjs.io';
import {mappingFnOptions} from './mappingFunctions.ts';
import {useAppDispatch} from '../redux/hooks.ts';

export interface LumatoneLayerViewProps {
  layerAssignment: LayerAssignment;
}

function LumatoneLayerView({layerAssignment}: LumatoneLayerViewProps) {

  const {
    layerName,
    layerColor,
    mappingFnName,
    layerChannel,
  } = layerAssignment;

  const color = new Color(layerColor).toString({format: 'hex'});

  const dispatch = useAppDispatch();

  return (
    <Card.Root
      borderColor={color}
    >
      <Card.Header>{layerName}</Card.Header>
      <Card.Body gap={2}>
        <Text>{mappingFnOptions.items.find(({value}) => value === mappingFnName)?.label ?? '<Not Mapped>'}</Text>
        <Text>Channel {layerChannel}</Text>
        <Button
          onClick={() => {
            dispatch(layerAddOrUpdate({
              ...layerAssignment,
              isEditing: true,
            }));
          }}
          variant="subtle"
        >
          Edit
        </Button>

        <Button
          onClick={() => {
            dispatch(layerRemove(layerAssignment));
          }}
          variant="subtle"
        >
          Remove
        </Button>
      </Card.Body>
    </Card.Root>
  );
}

export default LumatoneLayerView;