export type BoardRect = {left: number; top: number; width: number; height: number};
export type BoardBox = {x0: number; x1: number; y0: number; y1: number};

// The part of the layout the board shows. It starts from the usual fixed view
// and changes only as far as needed to contain `box` (the cells of the music
// being practised) plus a margin: first by sliding the smallest distance, and,
// when the music is larger than the view, by zooming out up to `maxZoom` and
// centring on it. Sliding is harmless on an isomorphic layout: shapes and
// fingering are the same everywhere. Beyond `maxZoom` the music is centred and
// its edges may still be cut off.
export function fitBoardView(base: BoardRect, box: BoardBox | null, margin: number, maxZoom: number): BoardRect & {zoom: number} {
  if (!box) return {...base, zoom: 1};
  const x0 = box.x0 - margin, x1 = box.x1 + margin, y0 = box.y0 - margin, y1 = box.y1 + margin;
  const zoom = Math.min(maxZoom, Math.max(1, (x1 - x0) / base.width, (y1 - y0) / base.height));
  const width = base.width * zoom, height = base.height * zoom;
  const centre = (usual: number, low: number, high: number, size: number) => high - low > size + 1e-6 ? (low + high) / 2
    : Math.min(low + size / 2, Math.max(high - size / 2, usual));
  const round = (value: number) => Math.round(value * 100) / 100;
  const cx = centre(base.left + base.width / 2, x0, x1, width), cy = centre(base.top + base.height / 2, y0, y1, height);
  return {left: round(cx - width / 2), top: round(cy - height / 2), width: round(width), height: round(height), zoom: round(zoom)};
}
