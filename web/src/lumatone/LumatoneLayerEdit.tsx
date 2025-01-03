import {
  layerAddOrUpdate,
  LayerAssignment,
  selectionToolSetLayerId,
  SelectionToolType,
} from '../redux/lumatoneEditorReducer.ts';
import {Button, Card, Flex, GridItem, IconButton, Input} from '@chakra-ui/react';
import {Field} from '../components/chakra-ui/field.tsx';
import {
  SelectContent,
  SelectItem,
  SelectItemGroup,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '../components/chakra-ui/select.tsx';
import {MidiChannel} from './lumatoneTypes.ts';
import {PiSelection} from 'react-icons/pi';
import {useAppDispatch, useAppSelector} from '../redux/hooks.ts';
import {mappingFnCategories, mappingFnOptions} from './mappingFunctions.ts';
import Color from 'colorjs.io';

export interface LumatoneLayerEditorProps {
  layerAssignment: LayerAssignment;
}

function LumatoneLayerEdit({layerAssignment}: LumatoneLayerEditorProps) {

  const dispatch = useAppDispatch();

  const {layerAssignmentId, type} = useAppSelector(s => s.lumatoneEditor.selectionTool);
  const isSelectionBoxThisLayer = (type === SelectionToolType.Box) && layerAssignmentId === layerAssignment.id;

  const color = new Color(layerAssignment.layerColor).toString({format: 'hex'});

  return (
    <GridItem rowSpan={2}>
      <Card.Root
        borderColor={color}
      >
        <Card.Header>
          <Field label="Label">
            <Input
              value={layerAssignment.layerName}
              onChange={(e) => {
                dispatch(layerAddOrUpdate({
                  ...layerAssignment,
                  layerName: e.target.value,
                }));
              }}
            />
          </Field>
        </Card.Header>
        <Card.Body gap={2}>

          <Field
            label="Select Keys"
            helperText={isSelectionBoxThisLayer
              ? 'Click and drag on Lumatone keys to select a region.'
              : 'Click to enable select tool for this layer.'}
          >
            <IconButton
              color={isSelectionBoxThisLayer ? color : undefined}
              border={isSelectionBoxThisLayer ? `2px solid ${color}` : undefined}
              size="sm"
              variant="subtle"
              disabled={isSelectionBoxThisLayer}
              onClick={() => {
                dispatch(selectionToolSetLayerId(layerAssignment.id));
              }}
            >
              <PiSelection />
            </IconButton>
          </Field>

          <SelectRoot
            collection={mappingFnOptions} // TODO: categories https://www.chakra-ui.com/docs/components/select#option-group
            value={[layerAssignment.mappingFnName]}
            onValueChange={(e) => {
              const mappingFnName = e.value[0];
              dispatch(layerAddOrUpdate({
                ...layerAssignment,
                mappingFnName,
              }));
            }}
          >
            <SelectLabel>Mapping Function</SelectLabel>
            <SelectTrigger>
              <SelectValueText placeholder="Select mapping fn"/>
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
              value={layerAssignment.mappingFnColOffset}
              onChange={(e) => {
                const mappingFnColOffset = parseInt(e.target.value, 10);
                dispatch(layerAddOrUpdate({
                  ...layerAssignment,
                  mappingFnColOffset,
                }));
              }}
            />
          </Field>

          <Flex gap={2}>
            <Field label="Row offset">
              <Input
                type="number"
                value={layerAssignment.mappingFnRowOffset}
                onChange={(e) => {
                  const mappingFnRowOffset = parseInt(e.target.value, 10);
                  dispatch(layerAddOrUpdate({
                    ...layerAssignment,
                    mappingFnRowOffset,
                  }));
                }}
              />
            </Field>
          </Flex>

          <Flex gap={2}>
            <Field label="Channel">
              <Input
                type="number"
                min={1}
                max={16}
                value={layerAssignment.layerChannel}
                onChange={(e) => {
                  const layerChannel = parseInt(e.target.value, 10) as MidiChannel;
                  dispatch(layerAddOrUpdate({
                    ...layerAssignment,
                    layerChannel,
                  }));
                }}
              />
            </Field>
          </Flex>

          <Button
            onClick={() => {
              dispatch(layerAddOrUpdate({
                ...layerAssignment,
                isEditing: false,
              }));
              if (isSelectionBoxThisLayer) dispatch(selectionToolSetLayerId(''));
            }}
            variant="subtle"
          >
            Done
          </Button>

        </Card.Body>
      </Card.Root>
    </GridItem>
  );
}

export default LumatoneLayerEdit;