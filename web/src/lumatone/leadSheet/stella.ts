import type {CoordAxial} from '../lumatoneTypes.ts';
export type MelodyAttack = {note: number; at: CoordAxial; start: number; duration: number; location: string};
export type ArrangementChord = {name: string; function: string; bar: number; start: number; duration: number;
  notes: {note: number; at: CoordAxial; root: boolean}[]};
// Arrangement content is available only through the private development checkout.
export const stellaMelody: MelodyAttack[] = [];
export const stellaChords: ArrangementChord[] = [];
export const stellaDuration = 0;
export function overlapsAttack(attack: MelodyAttack, start: number, duration: number) {
  return attack.start < start + duration && attack.start + attack.duration > start;
}
