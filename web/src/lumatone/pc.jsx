import Cell from './cell.jsx';
import React from 'react';
import {toSolfege, toSymbol} from './util';
import {Box} from '@chakra-ui/react';

const Pc = ({
  colorHsl,
  isOdd,
  isSolfege = false,
  showOctave = false,
  n,
  rot,
  style = isSolfege ? { // TODO maybe
    // borderStyle: 'solid',
    // borderWidth: 1,
    // width: 70,
  } : null,
}) => {
  const shadowColor = colorHsl
    .range('white')(0.1)
    .toString({format: 'hex'})


  return (
    <Cell
      colorHsl={colorHsl}
      isOdd={isOdd}
      {...style}
    >
      <Box
        color="black"
        textShadow={`white 0 0 13px, ${shadowColor} 0 -0.5px 2px`}
        transform={`rotate(${rot}deg)`}
      >
        {isSolfege ? toSolfege(n) : toSymbol(n)}
        {showOctave && (
          <Box
            {...{
              bottom: '15%',
              fontSize: '0.5em',
              position: 'absolute',
              right: '-0.7em',
            }}
          >
            {Math.floor(n / 12)}
          </Box>)}
      </Box>
    </Cell>
  );
};

export default Pc;
