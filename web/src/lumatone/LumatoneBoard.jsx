import {lumatoneRowLengths, lumatoneRowStarts} from './layoutData.js';
import _ from 'lodash-es';
import {Box, Flex} from '@chakra-ui/react';
import {Fragment, useRef} from 'react';
import LumatoneKey from './LumatoneKey';
import {nullMapping} from './LumatoneEditor';

const rotBoard = 343.6;

export default function LumatoneBoard({
  getLayer,
  layout,
  onSelect,
  pcSet,
  pitchSet,
  rowLengths = lumatoneRowLengths,
  rowStarts = lumatoneRowStarts,
}) {

  const selectionBox = useRef({
    el: null,
    isEnabled: false,
    x: 0,
    y: 0,
    h: 0,
    w: 0,
  });

  const positions = useRef({});

  const updateSelectionBox = () => {
    const sb = selectionBox.current;
    const {style} = sb.el;
    style.top =`${sb.y}px`;
    style.left =`${sb.x}px`;
    style.height =`${sb.h}px`;
    style.width =`${sb.w}px`;
    style.visibility = sb.isEnabled ? 'visible' : 'hidden';

    if (!sb.isEnabled) return;
    const selected = _.filter(positions.current, p => p.x > sb.x && p.x < sb.x + sb.w && p.y > sb.y && p.y < sb.y + sb.h);
    onSelect(selected);
  }

  const onLumatoneKeyRef = (x, y) => (el) => {
    const id = `${x},${y}`;

    positions.current[id] = el && ({
      coord: { x, y },
      id,
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    });
  }

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
                            mapping={nullMapping}
                            rotBoard={rotBoard}
                          />)),

                    // Lumatone Keys
                    ..._.range(rowStartX, rowLengths[y] + rowStartX)
                      .map(x => {

                        const layer = getLayer({x, y});

                        // const isInPcSet = _.includes(pcSet, n % 12);
                        // const isInPitchSet = _.includes(pitchSet, n);
                        // const colorHsl = getNoteColorHsl(n, isInPitchSet, false/* !isInPcSet*/);

                        return (
                          <LumatoneKey
                            isOdd={isOdd}
                            layer={layer}
                            mapping={layer ? layer.mappingFn({x, y}) : nullMapping}
                            key={x}
                            onRef={onLumatoneKeyRef(x, y)}
                            rotBoard={rotBoard}
                          />
                        );
                      }),
                  ]}
                  <br/>
                </Fragment>
              );
            })}

          <Box
            position="absolute"
            left={0}
            top={0}
            w="full"
            h="full"

            onPointerDown={(e) => {
              const {offsetX, offsetY} = e.nativeEvent;
              selectionBox.current.isEnabled = true;
              selectionBox.current.x = offsetX;
              selectionBox.current.y = offsetY;
              updateSelectionBox();
            }}

            onPointerMove={(e) => {
              const sb = selectionBox.current;
              if (!sb.isEnabled) return;
              const {offsetX, offsetY} = e.nativeEvent;
              sb.h = offsetY - sb.y;
              sb.w = offsetX - sb.x;
              updateSelectionBox();
            }}

            onPointerUp={(e) => {
              const sb = selectionBox.current;
              sb.isEnabled = false;
              sb.h = 0;
              sb.w = 0;
              updateSelectionBox();
            }}
          >

            <Box
              ref={(el) => {
                selectionBox.current.el = el;
              }}
              bg="whiteAlpha.400"
              border="2px dashed white"
              pointerEvents="none"
              position="absolute"
              visibility="hidden"
            />
          </Box>

        </Box>
      </Box>
    </Flex>


  );
}