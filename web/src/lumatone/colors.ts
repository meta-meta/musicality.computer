import Color from 'colorjs.io';
import {Okhsl} from 'colorjs.io/fn';

export const getNoteColorHsl = (n: number): Color => {

  const oct = ((n - 60) / 12);

  return new Color({
    space: Okhsl,
    coords: [
      28 + 360 * (((n * 5) % 12) / 12),
      0.95 - (oct > 0 ? oct * .2 : 0),
      0.4 + oct * .1,
    ],
  });

  // return new Color({
  //   space: Okhsl,
  //   coords: [
  //     28 + 360 * (((n * 5) % 12) / 12),
  //     scale(Math.max(0, oct), [0, 4], [1, 0]),
  //     scale(oct, [-4, 4], [0, 0.9]),
  //   ],
  // });

  // return new Color({
  //   space: Okhsv,
  //   coords: [
  //     28 + 360 * (((n * 5) % 12) / 12),
  //     oct >= 0 ? 1 - oct / 4 : 1,
  //     oct <= 0 ? 1 + oct / 4 : 1,
  //   ],
  // });
};