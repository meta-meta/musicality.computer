import React from 'react';
import {AbsoluteCenter, Box, Flex} from '@chakra-ui/react';

const cellSize = 1.5;

export default function Cell({colorHsl, children, isOdd, isSpacer, ...rest}) {

  const keyColor = colorHsl.toString({format: 'hex'});
  const borderColor = colorHsl
    .range('black')(0.25)
    .toString({format: 'hex'});

  return (
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
        ...rest,
      }}
    >
      {!isSpacer && // hexagon: https://stackoverflow.com/a/60967560/1477489
        <>
          <AbsoluteCenter zIndex="-1">
            <Box
              color={borderColor}
              fontSize={`${cellSize * 1.8}em`}
            >
              &#x2B22;
            </Box>
          </AbsoluteCenter>

          <AbsoluteCenter zIndex="-1">
            <Box
              color={keyColor}
              fontSize={`${cellSize * 1.5}em`}
            >
              &#x2B22;
            </Box>
          </AbsoluteCenter>
        </>
      }
      {children}
    </Flex>
  );
}