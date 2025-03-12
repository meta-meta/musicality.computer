/**
 *
 * Michael L. Friedmann - https://yalebooks.yale.edu/book/9780300045376/ear-training-twentieth-century-music/
 * (Friedmann uses "lev" for 11)
 * @param note {number} integer - MIDI note
 * @param equalDivisions {number} integer - note % equalDivisions
 * @returns {number}
 */
export const toSolfege = (note, equalDivisions = 12) => ({
  0: 'oh',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'sev',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'el',
})[note % equalDivisions] || note % equalDivisions;

/**
 *
 * @param note {number} integer - MIDI note
 * @param equalDivisions {number} integer - note % equalDivisions
 * @returns {number}
 */
export const toSymbol = (note, equalDivisions = 12) => ({
  10: '૪',
  11: 'Ɛ',
})[note % equalDivisions] || note % equalDivisions;

export const fromSymbol = (symbol) => ({
  '૪': 10,
  'Ɛ': 11,
})[symbol] || parseInt(symbol, 10);



// ripped from Tone/core/Conversions
export const ftomf = (frequency) => {
  return 69 + 12 * Math.log2(frequency / 440);
}


export const clamp01 = n => Math.max(0, Math.min(n, 1));

export const scale = (inputY, yRange, xRange) => {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  const percent = (inputY - yMin) / (yMax - yMin);
  const outputX = percent * (xMax - xMin) + xMin;

  return outputX;
};

export const scale01 = (n, min, max, clamp = true) => {
  const res = scale(n, [min, max], [0, 1]);
  return clamp ? clamp01(res) : res;
}