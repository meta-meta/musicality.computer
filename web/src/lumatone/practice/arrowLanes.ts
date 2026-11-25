type Point = {x: number; y: number};

// Sideways shifts that keep arrows from being drawn on top of one another.
// Arrows on the same line whose spans overlap (a repeated move, a move later
// retraced, or a longer move running along a shorter one) are placed in
// parallel lanes centred on that line. Arrows that merely cross are left alone.
// When many share a line the lanes are squeezed to fit within `maxSpread`.
export function spreadOverlappingMoves(moves: {from: Point; to: Point}[], spacing: number, maxSpread: number): Point[] {
  const lines = moves.map(({from, to}) => {
    let dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    dx /= length; dy /= length;
    // One orientation per line, so opposite moves share a normal.
    if (dx < -1e-6 || (Math.abs(dx) <= 1e-6 && dy < 0)) {dx = -dx; dy = -dy;}
    const normal = {x: -dy, y: dx};
    const a = from.x * dx + from.y * dy, b = to.x * dx + to.y * dy;
    return {dx, dy, normal, offset: from.x * normal.x + from.y * normal.y, low: Math.min(a, b), high: Math.max(a, b)};
  });
  const overlaps = (a: typeof lines[number], b: typeof lines[number]) => Math.abs(a.dx * b.dy - a.dy * b.dx) < 1e-3
    && Math.abs(a.offset - b.offset) < 0.5 && Math.min(a.high, b.high) - Math.max(a.low, b.low) > 0.5;
  const lane: number[] = [], group = lines.map((_, index) => index);
  const find = (index: number): number => group[index] === index ? index : group[index] = find(group[index]);
  lines.forEach((line, index) => {
    const taken = new Set<number>();
    for (let other = 0; other < index; other++) {
      if (!overlaps(line, lines[other])) continue;
      taken.add(lane[other]);
      group[find(index)] = find(other);
    }
    let free = 0;
    while (taken.has(free)) free++;
    lane.push(free);
  });
  const lanes = new Map<number, number>();
  lines.forEach((_, index) => lanes.set(find(index), Math.max(lanes.get(find(index)) ?? 0, lane[index] + 1)));
  return lines.map((line, index) => {
    const count = lanes.get(find(index))!;
    const shift = count > 1 ? (lane[index] - (count - 1) / 2) * Math.min(spacing, maxSpread / (count - 1)) : 0;
    return {x: line.normal.x * shift, y: line.normal.y * shift};
  });
}
