import Pc from './pc.jsx';
import {lumatoneRowLengths, lumatoneRowStarts} from './layoutData.js';
import Cell from './cell.jsx';
import _ from 'lodash-es';
import {Box, Flex} from '@chakra-ui/react';
import Color from 'colorjs.io';
import {Okhsl} from 'colorjs.io/fn';

const clamp01 = n => Math.max(0, Math.min(n, 1));

const getNoteColorHsl = (n) => {

  const oct = ((n - 60) / 12);

  return new Color({
    space: Okhsl,
    coords: [
      30 + 360 * (((n * 5) % 12) / 12),
      0.95 - (oct > 0 ? oct * .2 : 0),
      0.4 + oct * .1,
    ],
  });
};

const rotBoard = 342.6;

const spacerColor = new Color('white');

export default function LumatoneBoard({layout, pcSet, pitchSet, rows = lumatoneRowLengths}) {

  return (
    <Flex
      bg="#333"
      borderRadius="2xl"
      p="1em"
      justifyContent="center"
    >
      <Box
        h="16.5em"
        w="59.2em"
        overflow="hidden"
        position="relative"
      >
        <Box
          w="65em"
          position="absolute"
          left="-1em"
          top="-9.5em"
          transform={`rotate(${rotBoard}deg) scale(0.85)`}
        >
          {_.range(rows.length)
            .map(y => {
              const isOdd = y % 2 === 1;
              const rowStartX = lumatoneRowStarts[y];

              return (
                <>
                  {[
                    ..._.range(rowStartX).map(x => {
                      return (
                        <Cell
                          colorHsl={spacerColor}
                          key={x}
                          isOdd={isOdd}
                          isSpacer
                        >
                          &nbsp;
                        </Cell>);
                    }),
                    ..._.range(rowStartX, rows[y] + rowStartX).map(x => {
                      const n = layout(x, y);

                      const isInPcSet = _.includes(pcSet, n % 12);
                      const isInPitchSet = _.includes(pitchSet, n);
                      const colorHsl = getNoteColorHsl(n, isInPitchSet, false/* !isInPcSet*/);

                      return (
                        <>
                          <Pc
                            key={x}
                            colorHsl={colorHsl}
                            n={n}
                            rot={360 - rotBoard}
                            isOdd={isOdd}
                            showOctave
                            style={{
                              // border: `solid ${1}px`,
                              // border: `solid 2px`,
                              // borderRadius: '50%',
                              color: isInPcSet ? 'white' : 'black', //TODO: printer settings as well as mediaquery stylesheet
                            }}
                          />
                          {/*<LumatoneKeySync*/}
                          {/*  color={{*/}
                          {/*    ...color,*/}
                          {/*    l: Math.log2(1 + color.l * 0.5),*/}
                          {/*  }}*/}
                          {/*  key={`keysync-${x}`}*/}
                          {/*  lumaIn={lumaIn}*/}
                          {/*  lumaOut={lumaOut}*/}
                          {/*  n={n}*/}
                          {/*  x={x}*/}
                          {/*  y={y}*/}
                          {/*/>*/}
                        </>
                      );
                    }),
                  ]}
                  <br/>
                </>
              );
            })}
        </Box>
      </Box>
    </Flex>


  );
}