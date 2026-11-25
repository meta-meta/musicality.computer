import Color from 'colorjs.io';

export const getNoteColorHsl = (n: number): Color => {
  // Continuous octave position, with C3 at zero. Hue follows fifths;
  // higher registers become paler, while bass notes stay richly saturated.
  const oct = (n - 48) / 12;
  // Match the old C3 lightness and slope, then approach a visible dark floor
  // instead of crossing zero and collapsing the bass pitch colors to black.
  const lightness = oct > 0 ? 0.2 + oct * 0.01 : 0.08 + 0.12 * Math.exp(oct);
  return new Color({
    space: 'okhsl',
    coords: [
      28 + 360 * ((((n * 5) % 12 + 12) % 12) / 12),
      0.95 - Math.max(0, oct) * 0.1,
      lightness,
    ],
  });
};

// Colors that show order in a run of moves: the hue wheel divided into as many
// steps as there are moves, light and mid-saturated so they read on any pitch color.
export const orderColor = (index: number, count: number): string => new Color({
  space: 'okhsl',
  coords: [360 * index / Math.max(1, count), 0.65, 0.76],
}).toString({format: 'hex'});

export const colorGrey = new Color({
  space: 'okhsl',
  coords: [
    0,0,0.5
  ],
});

export const colorClear = new Color({
  space: 'okhsl',
  coords: [
    0,0,0,
  ],
  alpha: 0,
});

export const getColorHsl = (h: number, s: number, l: number): Color => new Color({space: 'okhsl', coords: [h, s, l]});