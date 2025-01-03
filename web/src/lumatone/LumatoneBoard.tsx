import {gridPosToKeyPosition} from './layoutData.ts';
import * as _ from 'lodash-es';
import {Box, Flex} from '@chakra-ui/react';
import {MutableRefObject, useCallback, useEffect, useRef} from 'react';
import {Coord, LumatoneLayer} from './lumatoneTypes.ts';
import {useAppDispatch, useAppSelector} from '../redux/hooks.ts';
import SelectionBox from './SelectionBox.tsx';
import Color from 'colorjs.io';
import {mappingFns} from './mappingFunctions.ts';
import LumatoneKeys from './LumatoneKeys.tsx';
import {forceUpdate} from '../redux/lumatoneEditorReducer.ts';

const rotBoard = 343.6;

export type EditorKeyOffset = {
  gridPos: Coord,
  id: string,
  x: number,
  y: number,
}

export default function LumatoneBoard() {

  const dispatch = useAppDispatch();

  const keyPositions: MutableRefObject<{ [index: string]: EditorKeyOffset }> = useRef({});
  const handleLumatoneKeyRef = useCallback((gridPos: Coord) => (el: HTMLDivElement) => {
    const {id} = gridPosToKeyPosition(gridPos);

    keyPositions.current[id] = el && ({
      gridPos: gridPos,
      id,
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    });
  }, []);

  const layerAssignments = useAppSelector(s => s.lumatoneEditor.layers);
  const keyIdToLumatoneLayer: MutableRefObject<{[index: string]: LumatoneLayer | undefined}> = useRef({});

  useEffect(() => {
    const layers: { [index: string]: LumatoneLayer } =
      _.mapValues(layerAssignments, (layerAssignment) => ({
        layerColor: new Color(layerAssignment.layerColor),
        mappingFn: mappingFns[layerAssignment.mappingFnName](
          layerAssignment.layerChannel,
          {
            x: layerAssignment.mappingFnColOffset,
            y: layerAssignment.mappingFnRowOffset,
          }),
      }));

    _.forEach(_.keys(keyPositions.current), (keyId) => {
      const sortedLayerAssignments = _.orderBy(layerAssignments, 'order');
      const layerAssignment = _.findLast(sortedLayerAssignments, lA => !!lA.keys[keyId]);
      keyIdToLumatoneLayer.current[keyId] = layerAssignment && layers[layerAssignment.id];
    })

    dispatch(forceUpdate());

  }, [dispatch, layerAssignments]);

  return (
    <Flex
      bg="#333"
      borderRadius="2xl"
      justifyContent="center"
      p="1em"
      css={{
        userSelect: 'none',
      }}
    >
      <Box
        h="16.5em"
        overflow="hidden"
        position="relative"
        w="59.2em"
      >
        <Box
          left="-1em"
          position="absolute"
          top="-9.5em"
          transform={`rotate(${rotBoard}deg) scale(0.85)`}
          w="65em"
        >
          <LumatoneKeys
            keyIdToLumatoneLayer={keyIdToLumatoneLayer}
            onLumatoneKeyRef={handleLumatoneKeyRef}
            rotBoard={rotBoard}
          />
          <SelectionBox keyPositions={keyPositions}/>
        </Box>
      </Box>
    </Flex>


  );
}