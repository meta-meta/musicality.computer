import Color from 'colorjs.io';
import {AbsoluteCenter, Box, Flex} from '@chakra-ui/react';
import {toSymbol} from './util';

export enum KeyType {
  NoteOnOff,
  ContinuousController,
  Lumatouch,
  Disabled,
}

export type MidiChannel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export interface LumatoneMapping {
  channel: MidiChannel,
  keyColor: Color,
  keyType: KeyType,
  layerColor: Color,
  layerName: string,
  noteNum: number,
}

export interface LumatoneKey {
  isOdd: boolean,
  isSpacer: boolean,
  mapping: LumatoneMapping,
  rotBoard: number,
}

const cellSize = 1.5;


function LumatoneKey({
  isOdd,
  isSpacer = false,
  mapping,
  rotBoard,
}: LumatoneKey) {

  const borderColor = mapping.layerColor;
  // const borderColor = mapping.keyColor
  //   .range('black')(0.25)
  //   .toString({format: 'hex'});

  const shadowColor = mapping.keyColor
    .range('white')(0.1)
    .toString({format: 'hex'});

  return (
    <>
      <Flex
        {...{
          alignItems: 'center',
          display: 'inline-flex',
          fontSize: `${cellSize * 0.81}em`,
          height: `${cellSize * 1}em`,
          justifyContent: 'center',
          left: isOdd ? `${(cellSize * 1.1) / 2}em` : 0,
          position: 'relative',
          width: `${cellSize * 1.1}em`,
        }}
      >
        {!isSpacer && // hexagon: https://stackoverflow.com/a/60967560/1477489
          <>
            <AbsoluteCenter zIndex="-1">
              <Box
                color={borderColor.toString({format: 'hex'})}
                fontSize={`${cellSize * 1.8}em`}
              >
                &#x2B22;
              </Box>
            </AbsoluteCenter>

            <AbsoluteCenter zIndex="-1">
              <Box
                color={mapping.keyColor.toString({format: 'hex'})}
                fontSize={`${cellSize * 1.5}em`}
              >
                &#x2B22;
              </Box>
            </AbsoluteCenter>

            <Box
              color="black"
              textShadow={`white 0 0 13px, ${shadowColor} 0 -0.5px 2px`}
              transform={`rotate(${360 - rotBoard}deg)`}
            >
              {/* Note Number */}
              {toSymbol(mapping.noteNum)}

              {/* Octave */}
              <Box
                {...{
                  bottom: '15%',
                  fontSize: '0.5em',
                  position: 'absolute',
                  right: '-0.7em',
                }}
              >
                {Math.floor(mapping.noteNum / 12)}
              </Box>
            </Box>
          </>
        }

        {isSpacer && (<>&nbsp;</>)}


      </Flex>

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
}

export default LumatoneKey;