import _ from 'lodash-es';

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

export const boardRowLengths = [
  2,
  5,
  6, 6, 6, 6, 6, 6, 6,
  5,
  2,
];

export const boardsOnGrid = lumatoneRowLengths.map(() => ([]));

_.range(5).forEach(boardIndex => {
  const boardNum = boardIndex + 1;

  const boardStartX = boardIndex * 6;
  const boardStartY = boardIndex * 2;

  let note = 0;
  _.forEach(boardRowLengths, (boardRowLen, boardRow) => {
    _.range(boardRowLen).forEach(boardX => {
      const y = boardStartY + boardRow;
      boardsOnGrid[y][boardStartX + lumatoneRowStarts[boardRow] + boardX] = {
        boardNum,
        note,
      };

      note++;
    });
  });

});