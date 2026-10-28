import type {TimedLyric} from './scores.ts';

// Build phrase-sized lines once per selected score/verse, outside the audio clock.
export function lyricLines(lyrics: TimedLyric[], verse: string): TimedLyric[][] {
  const lines: TimedLyric[][] = [];
  let line: TimedLyric[] = [], words = 0;
  for (const lyric of lyrics.filter(item => item.verse === verse)) {
    const previous = line[line.length - 1];
    if (previous && lyric.start - (previous.start + previous.duration) >= 4) {
      lines.push(line); line = []; words = 0;
    }
    line.push(lyric);
    const wordEnd = lyric.syllabic !== 'begin' && lyric.syllabic !== 'middle';
    if (wordEnd) words++;
    if (lyric.lineBreak || (wordEnd && (words >= 10 || line.length >= 40))) {
      lines.push(line); line = []; words = 0;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

export function lyricLineAt(lines: TimedLyric[][], beat: number): number {
  let low = 0, high = lines.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (lines[middle][0].start <= beat + 1e-7) low = middle + 1;
    else high = middle;
  }
  return Math.max(0, low - 1);
}

export function lyricActive(lyric: TimedLyric, beat: number) {
  return beat >= lyric.start - 1e-7 && beat < lyric.start + lyric.duration - 1e-7;
}

// Alternate rows instead of moving the preview into the current row at each line.
export function lyricRows(index: number, count: number, next = index + 1): [number | null, number | null] {
  const rows: [number | null, number | null] = [null, null];
  rows[index % 2] = index;
  if (next < count) rows[(index + 1) % 2] = next;
  return rows;
}
