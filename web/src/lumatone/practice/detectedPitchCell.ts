type Point = {x: number; y: number};
export type PitchCell = Point & {note: number};
type Viewport = {left: number; top: number; width: number; height: number};

// Same-pitch copies on this lattice differ by axial (-7, +2).
// Check the nearest copy on the infinite lattice first: if it would be clipped,
// recenter instead of following the next visible copy along the board's edge.
// A prompted cell, when given and on screen, takes priority over both: the
// played pitch is shown on the copy nearest the prompt, so a correct note lands
// on the prompted cell itself and a wrong one beside it.
export function detectedPitchCell<T extends PitchCell>(cells: T[], note: number | null,
  previous: Point | null, viewport: Viewport, radius: number, prompt: Point | null = null): T | undefined {
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
  if (prompt && inside(prompt, 0)) {
    // Equidistant copies fall back to the previous cell, then the center.
    const tie = previous && inside(previous, radius) ? previous : center;
    return candidates.reduce((best, cell) => {
      const difference = distance(cell, prompt) - distance(best, prompt);
      return difference < -1e-6 || Math.abs(difference) <= 1e-6 && distance(cell, tie) < distance(best, tie) ? cell : best;
    });
  }
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
// A prompted cell on screen takes priority: the tone nearest the prompt is
// placed first, and each further tone joins the center of those already placed,
// so the voicing gathers around the prompt instead of splitting between copies.
export function detectedChordCells<T extends PitchCell>(cells: T[], notes: number[],
  previous: PitchCell[], viewport: Viewport, radius: number, prompt: Point | null = null): T[] {
  const pitches = [...new Set(notes)].sort((a, b) => a - b);
  if (!pitches.length) return [];
  if (prompt && prompt.x >= viewport.left && prompt.x <= viewport.left + viewport.width
    && prompt.y >= viewport.top && prompt.y <= viewport.top + viewport.height) {
    const gap = (cell: Point) => (cell.x - prompt.x) ** 2 + (cell.y - prompt.y) ** 2;
    const nearest = pitches.flatMap(note => {
      const cell = detectedPitchCell(cells, note, null, viewport, radius, prompt);
      return cell ? [cell] : [];
    }).sort((a, b) => gap(a) - gap(b) || a.note - b.note);
    const placed: T[] = [];
    for (const first of nearest) {
      const center = placed.reduce((sum, cell) => ({x: sum.x + cell.x / placed.length, y: sum.y + cell.y / placed.length}), {x: 0, y: 0});
      const cell = placed.length ? detectedPitchCell(cells, first.note, null, viewport, radius, center) : first;
      if (cell) placed.push(cell);
    }
    return placed.sort((a, b) => a.note - b.note);
  }
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
