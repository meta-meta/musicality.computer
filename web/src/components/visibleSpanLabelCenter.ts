// Coordinates are in the same horizontal SVG coordinate system as the span.
export function visibleSpanLabelCenter(start: number, end: number, viewportStart: number, viewportEnd: number, labelWidth: number) {
  const left = Math.max(start, viewportStart), right = Math.min(end, viewportEnd);
  if (right <= left) return null;
  const half = Math.min(Math.max(0, labelWidth), end - start) / 2;
  return Math.max(start + half, Math.min(end - half, (left + right) / 2));
}
