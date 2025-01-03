import Color from 'colorjs.io';
import {AbsoluteCenter, Box, Flex} from '@chakra-ui/react';
import {toSymbol} from './util';
import {LumatoneKeyPosition, LumatoneLayer, LumatoneMapping} from './lumatoneTypes.ts';
import LumatoneKeySync from './LumatoneKeySync.tsx';
import {memo} from 'react';

export interface LumatoneKeyProps {
  isOdd: boolean,
  isSpacer?: boolean,
  keyPosition: LumatoneKeyPosition,
  layer?: LumatoneLayer,
  mapping: LumatoneMapping,
  onRef?: (el: HTMLDivElement) => void,
  rotBoard: number,
}

const cellSize = 1.5;
const black = new Color('black');

const LumatoneKey= memo(
  function LumatoneKey({
    isOdd,
    isSpacer = false,
    keyPosition,
    layer,
    mapping,
    onRef,
    rotBoard,
  }: LumatoneKeyProps) {


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
{/*&nbsp;*/}
                {/* Octave */}
                <Box
                  {...{
                    bottom: '15%',
                    fontSize: '0.5em',
                    position: 'absolute',
                    right: '-0.7em',

                    // top: '1.6em',
                    // left: '-0.2em',
                  }}
                >
                  {/*{keyPosition.gridPos.x},{keyPosition.gridPos.y}*/}
                  {Math.floor(mapping.noteNum / 12) - 1}
                </Box>
              </Box>
            </>
          }

          {isSpacer && (<>&nbsp;</>)}
        </Flex>

        {keyPosition && (
          <LumatoneKeySync
            keyPosition={keyPosition}
            mapping={mapping}
          />
        )}

      </>
    );
  },
);

export default LumatoneKey;