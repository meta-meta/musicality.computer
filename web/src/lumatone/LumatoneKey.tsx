import Color from 'colorjs.io';
import {AbsoluteCenter, Box, Flex} from '@chakra-ui/react';
import {toSymbol} from './util';
import {Coord} from './LumatoneEditor.tsx';

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
  noteNum: number,
}

export interface LumatoneLayer {
  layerColor: Color,
  layerName: string,
  mappingFn: (c: Coord) => LumatoneMapping,
  mappingFnName: string,
}

export interface LumatoneKey {
  isOdd: boolean,
  isSpacer: boolean,
  layer?: LumatoneLayer,
  mapping: LumatoneMapping,
  rotBoard: number,
  onRef: (el: HTMLDivElement) => void,
}

const cellSize = 1.5;
const black = new Color('black');


function LumatoneKey({
  isOdd,
  isSpacer = false,
  layer,
  mapping,
  rotBoard,
  onRef,
}: LumatoneKey) {

  const borderColor = layer ? layer.layerColor : black;
  // const borderColor = mapping.keyColor
  //   .range('black')(0.25)
  //   .toString({format: 'hex'});

  const shadowColor = mapping.keyColor
    .range('white')(0.1)
    .toString({format: 'hex'});

  return (
    <>
      <Flex
        ref={onRef}
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