type Point = {x: number; y: number};
export type PitchCell = Point & {note: number};
type Viewport = {left: number; top: number; width: number; height: number};

// Same-pitch copies on this lattice differ by axial (-7, +2).
// Check the nearest copy on the infinite lattice first: if it would be clipped,
// recenter instead of following the next visible copy along the board's edge.
export function detectedPitchCell<T extends PitchCell>(cells: T[], note: number | null,
  previous: Point | null, viewport: Viewport, radius: number): T | undefined {
  if (note === null) return undefined;
  const matches = cells.filter(cell => cell.note === note);
  const inside = (point: Point, padding: number) => point.x >= viewport.left + padding
    && point.x <= viewport.left + viewport.width - padding
    && point.y >= viewport.top + padding && point.y <= viewport.top + viewport.height - padding;
  const visible = matches.filter(cell => inside(cell, radius));
  // A very narrow viewport may have only partially visible copies.
  const candidates = visible.length ? visible : matches.filter(cell => inside(cell, 0));
  if (!candidates.length) return undefined;
  const center = {x: viewport.left + viewport.width / 2, y: viewport.top + viewport.height / 2};
  const distance = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const centermost = () => candidates.reduce((best, cell) => distance(cell, center) < distance(best, center) ? cell : best);
  if (!previous || !inside(previous, radius)) return centermost();
  const base = matches[0];
  const dx = -6 * Math.sqrt(3) * radius, dy = -3 * radius;
  const copy = Math.round(((previous.x - base.x) * dx + (previous.y - base.y) * dy) / (dx * dx + dy * dy));
  const nearest = {x: base.x + copy * dx, y: base.y + copy * dy};
  if (!inside(nearest, radius)) return centermost();
  return candidates.reduce((best, cell) => distance(cell, nearest) < distance(best, nearest) ? cell : best);
}

// Place a detected voicing together. Common pitches keep their tiles; new tones
// stay near the preceding voicing's center. Recenter the whole group if any
// continuation would be clipped, rather than wrapping individual tones apart.
export function detectedChordCells<T extends PitchCell>(cells: T[], notes: number[],
  previous: PitchCell[], viewport: Viewport, radius: number): T[] {
  const pitches = [...new Set(notes)].sort((a, b) => a - b);
  if (!pitches.length) return [];
  const inside = (point: Point) => point.x >= viewport.left + radius
    && point.x <= viewport.left + viewport.width - radius
    && point.y >= viewport.top + radius && point.y <= viewport.top + viewport.height - radius;
  const centered = () => pitches.flatMap(note => {
    const cell = detectedPitchCell(cells, note, null, viewport, radius);
    return cell ? [cell] : [];
  });
  if (!previous.length || previous.some(cell => !inside(cell))) return centered();
  const anchor = previous.reduce((sum, cell) => ({x: sum.x + cell.x / previous.length, y: sum.y + cell.y / previous.length}), {x: 0, y: 0});
  const result: T[] = [];
  for (const note of pitches) {
    const base = cells.find(cell => cell.note === note);
    if (!base) continue;
    const from = previous.find(cell => cell.note === note) ?? anchor;
    const dx = -6 * Math.sqrt(3) * radius, dy = -3 * radius;
    const copy = Math.round(((from.x - base.x) * dx + (from.y - base.y) * dy) / (dx * dx + dy * dy));
    const nearest = {x: base.x + copy * dx, y: base.y + copy * dy};
    if (!inside(nearest)) return centered();
    const cell = detectedPitchCell(cells, note, from, viewport, radius);
    if (cell) result.push(cell);
  }
  return result;
}
