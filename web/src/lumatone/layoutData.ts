import * as _ from 'lodash-es';
import {CoordOffset, LumatoneBoardNum, LumatoneKeyNum, LumatoneKeyPosition} from './lumatoneTypes.ts';

export const lumatoneRowLengths = [
  2,
  5,
  8,
  11,
  14,
  17,
  20,
  23,
  26,
  28,
  26,
  23,
  20,
  17,
  14,
  11,
  8,
  5,
  2,
];

export const lumatoneRowStarts = [
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  1,
  4,
  7,
  10,
  13,
  16,
  19,
  22,
  25,
  28,
];

const boardRowLengths = [
  2,
  5,
  6, 6, 6, 6, 6, 6, 6,
  5,
  2,
];

const boardsOnGrid: Array<LumatoneKeyPosition[]> = lumatoneRowLengths.map(() => ([]));

export const gridPosToKeyPosition = ({x,y}: CoordOffset): LumatoneKeyPosition => boardsOnGrid[y][x];

_.range(5).forEach(boardIndex => {
  const boardNum = boardIndex + 1 as LumatoneBoardNum;

  const boardStartX = boardIndex * 6;
  const boardStartY = boardIndex * 2;

  let note = 0;
  _.forEach(boardRowLengths, (boardRowLen, boardRow) => {
    _.range(boardRowLen).forEach(boardX => {
      const y = boardStartY + boardRow;
      const x = boardStartX + lumatoneRowStarts[boardRow] + boardX;
      boardsOnGrid[y][x] = {
        boardNum,
        gridPos: {x, y},
        id: `${boardNum}/${note}`,
        note: note as LumatoneKeyNum,
      };

      note++;
    });
  });
});