import {LumatoneLyricsAndChordsGroup} from '../lumatoneTypes.ts';

const sWonderful = (transpose: number): LumatoneLyricsAndChordsGroup[] =>
  [
    {
      chords: [
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [0, 1], //+7
            [0, 2], //+2
            [-2, 3], //+5
          ],
          intervalNextRoot: [2, -1],
        },
        {
          root: transpose - 1,
          intervals: [
            [0, 2], //+2
            [-2, 3], //+9
          ],
          intervalNextRoot: [-3, 1],
        },
      ],
      lyrics: ``,
    },
    {
      chords: [
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [2, 1], //+Ɛ
          ],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
          intervalNextRoot: [4, -1],
        },
        {
          root: transpose + 1,
          intervals: [
            [-2, 1], //+3
            [-4, 2], //+6
            [-5, 1],  //+9
          ],
        },
        {
          root: transpose + 1,
          intervals: [
            [-2, 1], //+3
            [-4, 2], //+6
            [-5, 1],  //+9
          ],
          intervalNextRoot: [-3, 1],
        },
      ],
      lyrics: `       wonderful                           marvelous`,
    },
    {
      chords: [
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [0, 1],  //+7
            [-1, 0],  //+૪
          ],
        },
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [-4, 2], //+6
            [-5, 1],  //+9
          ],
          intervalNextRoot: [-1, 0],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [2, 1], //+Ɛ
          ],
        },
      ],
      lyrics: `   you should care                         for me`,
    },
    {
      chords: [
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [2, 1], //+Ɛ
          ],
          intervalNextRoot: [2, 0],
        },
        {
          root: transpose + 4,
          intervals: [
            [-2, 1], //+3
            [0, 1],  //+7
            [-1, 0],  //+૪
          ],
        },
        {
          root: transpose + 4,
          intervals: [
            [-2, 1], //+3
            [-4, 2], //+6
            [-5, 1],  //+9
          ],
          intervalNextRoot: [-1, 0],
        },
      ],
      lyrics: `   awfully nice                         it's paradise`,
    },
    {
      chords: [
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [0, 1],  //+7
            [-1, 0],  //+૪
          ],
        },
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [-4, 2], //+6
            [-5, 1],  //+9
          ],
          intervalNextRoot: [-1, 0],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
          intervalNextRoot: [3, -1],
        },
        {
          root: transpose - 1,
          intervals: [
            [-5, 2],   //+4
            [-3, 2], //+8
            [-2, 2],   //+૪
          ],
          intervalNextRoot: [-1, 1],
        },
      ],
      lyrics: ` how I long                            to   be                                      you`,
    },
    {
      chords: [
        {
          root: transpose + 4,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [3, -1], //+Ɛ
          ],
          intervalNextRoot: [0, 1],
        },
        {
          root: transpose - 1,
          intervals: [
            [3, -2],   //+4
            [-2, 0], //+8
            [-1, 0],   //+૪
          ],
          intervalNextRoot: [0, -1],
        },
        {
          root: transpose + 4,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [3, -1], //+Ɛ
          ],
        },
        {
          root: transpose + 4,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [3, -1], //+Ɛ
          ],
          intervalNextRoot: [0, -1],
        },
      ],
      lyrics: `make my life                             so glamorous`,
    },
    {
      chords: [
        {
          root: transpose - 3,
          intervals: [
            [2, 0],   //+4
            [0, 1], //+7
            [-2, 2],   //+૪
            [0, 2],   //+૪
          ],
        },
        {
          root: transpose - 3,
          intervals: [
            [2, 0],   //+4
            [0, 1], //+7
            [-2, 2],   //+૪
            [0, 2],   //+૪
          ],
          intervalNextRoot: [-1, 1],
        },
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [0, 1],  //+7
            [-1, 0],  //+૪
          ],
        },
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [-4, 2], //+6
            [-5, 1],  //+9
          ],
          intervalNextRoot: [-1, 0],
        },
      ],
      lyrics: `         you can't blame me  for feeling amorous`,
    },
    {
      chords: [
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
        },
        {
          root: transpose + 0,
          intervals: [
            [5, -1], //+3
            [3, 0], //+6
            [1, 1], //+9
          ],
        },
        {
          root: transpose + 0,
          intervals: [
            [5, -1], //+3
            [3, 0], //+6
            [1, 1], //+9
          ],
          intervalNextRoot: [1, 0],
        },
      ],
      lyrics: `wonderful       marvelous`,
    },
    {
      chords: [
        {
          root: transpose + 2,
          intervals: [
            [-2, 1], //+3
            [0, 1],  //+7
            [-1, 0],  //+૪
          ],
        },
        {
          root: transpose + 2,
          intervals: [
            [5, -1], //+3
            [3, 0], //+6
            [1, 1], //+9
          ],
          intervalNextRoot: [-1, 0],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
        },
        {
          root: transpose + 0,
          intervals: [
            [2, 0], //+4
            [0, 1], //+7
            [1, 1], //+9
          ],
        },
      ],
      lyrics: `  that   you should   care      for         me`,
    },
  ];

export default sWonderful;