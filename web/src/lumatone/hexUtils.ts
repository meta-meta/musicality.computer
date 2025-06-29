import {CoordAxial, CoordCartesian} from './lumatoneTypes.ts';


/**
 * basis is +q = right, +r = up-right which differs from redblob
 * @param q
 * @param r
 * @returns {{x: number, y: number}}
 */
export const pointyHexAxialToPixel = ({q, r}: CoordAxial): CoordCartesian => {
  return {
    x: Math.sqrt(3) * q + Math.sqrt(3) / 2 * r,
    y: 3 / 2 * -r,
  };
};