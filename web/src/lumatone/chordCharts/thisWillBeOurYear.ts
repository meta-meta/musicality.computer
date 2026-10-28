import {LumatoneLyricsAndChordsGroup} from '../lumatoneTypes.ts';


const thisWillBeOurYear = (transpose: number): LumatoneLyricsAndChordsGroup[] => {

  return [
    {
      chords: [
        {
          root: transpose,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [2, 0],
        },
        {
          root: transpose + 4,
          intervals: [
            [-2, 1], //+3
            [1, -1], //+7
          ],
        },
        {
          root: transpose + 4,
          intervals: [
            [-2, 1], //+3
            [-3, 0], //+6
          ],
          intervalNextRoot: [-3, 1],
        },
        {
          root: transpose + 5,
          intervals: [
            [1, -1], //+7
            [2, 0], //+4
          ],
          intervalNextRoot: [-1, -1],
        },
      ],
      lyrics: ``,
    },

    {
      chords: [
        { // chord charts say this is F7, but I don't hear A. I hear G (F7sus2)
          root: transpose - 4,
          intervals: [
            [-2, 2], //+3
            [0, 1], //+7
            [0, 2], //+2
          ],
          intervalNextRoot: [2, 1],
        },
        {
          root: transpose + 7,
          intervals: [
            [2, 0], //+4
            [1, -1], //+7
          ],
          intervalNextRoot: [-1, 0],
        },
        {
          root: transpose + 5,
          intervals: [
            [2, 0], //+4
            [1, -1], //+7
          ],
          intervalNextRoot: [1, -1],
        },
        {
          root: transpose,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
        },
      ],
      lyrics: `                                                                                       the`,
    },

    {
      chords: [
        {
          root: transpose,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [2, 0],
        },
        {
          root: transpose + 4,
          intervals: [
            [-2, 1], //+3
            [1, -1], //+7
          ],
        },
        {
          root: transpose + 4,
          intervals: [
            [-2, 1], //+3
            [-3, 0], //+6
          ],
          intervalNextRoot: [-3, 1],
        },
        {
          root: transpose + 5,
          intervals: [
            [1, -1], //+7
            [2, 0], //+4
          ],
          intervalNextRoot: [-1, -1],
        },
      ],
      lyrics: `warmth       of your love's       like the warmth       from the sun                   and`,
    },

    {
      chords: [
        { // chord charts say this is F7, but I don't hear A. I hear G (F7sus2)
          root: transpose - 4,
          intervals: [
            [-2, 2], //+3
            [0, 1], //+7
            [0, 2], //+2
          ],
          intervalNextRoot: [2, 1],
        },
        {
          root: transpose + 7,
          intervals: [
            [2, 0], //+4
            [1, -1], //+7
          ],
          intervalNextRoot: [-1, 0],
        },
        {
          root: transpose + 5,
          intervals: [
            [2, 0], //+4
            [1, -1], //+7
          ],
          intervalNextRoot: [1, -1],
        },
        {
          root: transpose,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [1, 0],
        },
      ],
      lyrics: `this will be         our year       took a long time          to come`,
    },


    {
      chords: [
        {
          root: transpose + 2,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [-4, 1],
        },
        {
          root: transpose + 1,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [3, -1],
        },
        {
          root: transpose,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
        },
        {
          root: transpose,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [1, 0],
        },
      ],
      lyrics: `and I won't forget    the way you held me up when I was down`,
    },

    {
      chords: [
        {
          root: transpose + 2,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [-4, 1],
        },
        {
          root: transpose + 1,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
          ],
          intervalNextRoot: [4, -1],
        },
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [0, 1], //+7
          ],
          intervalNextRoot: [-1, 1],
        },
        {
          root: transpose + 7,
          intervals: [
            [2, 0], //+4
            [1, -1], //+7
          ],
          intervalNextRoot: [1, 0],
        },
      ],
      lyrics: `and I won't forget   the way you said      darling I love you   you gave me faith to go on`,
    },
    // TODO: add more lyrics
    // TODO: key change +1
  ];
};

export default thisWillBeOurYear;