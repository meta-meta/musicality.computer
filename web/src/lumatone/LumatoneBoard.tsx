import {gridPosToKeyPosition, lumatoneRowLengths, lumatoneRowStarts} from './layoutData.ts';
import _ from 'lodash-es';
import {Box, Flex} from '@chakra-ui/react';
import {Fragment, MutableRefObject, useCallback, useRef} from 'react';
import LumatoneKey from './LumatoneKey';
import {Coord, LumatoneLayer} from './lumatoneTypes.ts';
import {useAppSelector} from '../redux/hooks.ts';
import SelectionBox from './SelectionBox.tsx';
import Color from 'colorjs.io';
import {mappingFns, disabledMapping} from './mappingFunctions.ts';

const rotBoard = 343.6;

export type EditorKeyOffset = {
  gridPos: Coord,
  id: string,
  x: number,
  y: number,
}

interface LumatoneBoardProps {
  rowLengths?: number[],
  rowStarts?: number[],
}

export default function LumatoneBoard({
  rowLengths = lumatoneRowLengths,
  rowStarts = lumatoneRowStarts,
}: LumatoneBoardProps) {

  const keyPositions: MutableRefObject<{ [index: string]: EditorKeyOffset }> = useRef({});
  const onLumatoneKeyRef = (gridPos: Coord) => (el: HTMLDivElement) => {
    const {id} = gridPosToKeyPosition(gridPos);

    keyPositions.current[id] = el && ({
      gridPos: gridPos,
      id,
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    });
  };

  const layerAssignments = useAppSelector(s => s.lumatoneEditor.layers);

  const getLayer = useCallback((gridPos: Coord): LumatoneLayer | undefined => {
    const layers: { [index: string]: LumatoneLayer } =
      _.mapValues(layerAssignments, (layerAssignment) => ({
        layerColor: new Color(layerAssignment.layerColor),
        mappingFn: mappingFns[layerAssignment.mappingFnName](layerAssignment.layerChannel, {
          x: layerAssignment.mappingFnColOffset,
          y: layerAssignment.mappingFnRowOffset,
        }),
      }));

    const {id} = gridPosToKeyPosition(gridPos);
    const layerAssignment = _.findLast(_.orderBy(layerAssignments, 'order'), l => !!l.keys[id]);
    return layerAssignment && layers[layerAssignment.id];
  }, [layerAssignments]);

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
          {_.range(rowLengths.length)
            .map(y => {
              const isOdd = y % 2 === 1;
              const rowStartX = rowStarts[y];

              return (
                <Fragment key={y}>
                  {[
                    // Spacers before row starts
                    ..._.range(rowStartX)
                      .map(x =>
                        (
                          <LumatoneKey
                            isOdd={isOdd}
                            isSpacer
                            key={x}
                            mapping={disabledMapping}
                            rotBoard={rotBoard}
                          />)),

                    // Lumatone Keys
                    ..._.range(rowStartX, rowLengths[y] + rowStartX)
                      .map(x => {
                        const layer = getLayer({x, y});

                        return (
                          <LumatoneKey
                            isOdd={isOdd}
                            layer={layer}
                            mapping={layer ? layer.mappingFn({x, y}) : disabledMapping}
                            key={x}
                            onRef={onLumatoneKeyRef({x, y})}
                            rotBoard={rotBoard}
                            keyPosition={gridPosToKeyPosition({x, y})}
                          />
                        );
                      }),
                  ]}
                  <br/>
                </Fragment>
              );
            })}

          <SelectionBox keyPositions={keyPositions}/>
        </Box>
      </Box>
    </Flex>


  );
}