import Pc from './pc.jsx';
import {lumatoneRowLengths, lumatoneRowStarts} from './layoutData.js';
import Cell from './cell.jsx';
import _ from 'lodash-es';
import {Box, Flex} from '@chakra-ui/react';
import Color from 'colorjs.io';
import {Okhsl, Okhsv} from 'colorjs.io/fn';
import {scale} from './util.js';
import {Fragment} from 'react';
import LumatoneKey from './LumatoneKey';

const rotBoard = 343.6;

const spacerColor = new Color('white');

export default function LumatoneBoard({
  getMapping,
  layout,
  pcSet,
  pitchSet,
  rowLengths = lumatoneRowLengths,
  rowStarts = lumatoneRowStarts,
}) {

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
                            mapping={getMapping({x, y})}
                            rotBoard={rotBoard}
                          />)),

                    // Lumatone Keys
                    ..._.range(rowStartX, rowLengths[y] + rowStartX)
                      .map(x => {


                        // const isInPcSet = _.includes(pcSet, n % 12);
                        // const isInPitchSet = _.includes(pitchSet, n);
                        // const colorHsl = getNoteColorHsl(n, isInPitchSet, false/* !isInPcSet*/);

                        return (
                          <LumatoneKey
                            isOdd={isOdd}
                            mapping={getMapping({x, y})}
                            key={x}
                            rotBoard={rotBoard}
                          />
                        );
                      }),
                  ]}
                  <br/>
                </Fragment>
              );
            })}
        </Box>
      </Box>
    </Flex>


  );
}