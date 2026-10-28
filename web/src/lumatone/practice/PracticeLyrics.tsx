import {Box, Flex, Text} from '@chakra-ui/react';
import {memo, useMemo, useState} from 'react';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import type {TimedLyric} from './scores.ts';
import {lyricActive, lyricLineAt, lyricLines, lyricRows} from './lyrics.ts';
import {upcomingCueStyle, upcomingEvents} from './lookahead.ts';

export const PracticeLyrics = memo(function PracticeLyrics({lyrics, beat, countIn, entryBeat, endBeat, pass, cueCount, cueing, loop}: {
  lyrics: TimedLyric[]; beat: number; countIn: boolean; entryBeat: number; endBeat: number;
  pass: number; cueCount: number; cueing: boolean; loop: {start: number; end: number} | null;
}) {
  const {colorMode} = useColorMode();
  const verses = useMemo(() => [...new Set(lyrics.map(item => item.verse))], [lyrics]);
  const [selectedVerse, setSelectedVerse] = useState(verses[0]);
  const verse = verses.includes(selectedVerse) ? selectedVerse : verses[0];
  const verseLyrics = useMemo(() => lyrics.filter(item => item.verse === verse), [lyrics, verse]);
  const lines = useMemo(() => lyricLines(verseLyrics, verse), [verseLyrics, verse]);
  const index = lyricLineAt(lines, beat);
  let next = index + 1;
  const wraps = loop !== null && (next >= lines.length || lines[next][0].start >= endBeat);
  if (wraps) next = lyricLineAt(lines, loop.start);
  const rows = lyricRows(index, lines.length, next);
  const cues = cueing ? upcomingEvents(beat, entryBeat, endBeat, cueCount, loop, pass, verseLyrics) : [];
  if (!lines.length) return null;
  return <Box as="section" aria-label="Timed lyrics" borderWidth="1px" borderRadius="md" p={3}>
    <Flex gap={3} align="center" mb={2}>
      <Text fontSize="xs" color="fg.muted">Lyrics</Text>
      {verses.length > 1 && <label>Verse <select aria-label="Lyric verse" value={verse} onChange={event => setSelectedVerse(event.target.value)}>
        {verses.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>}
    </Flex>
    <style>{'@media (prefers-reduced-motion: reduce) { .practice-lyric-cue { transition: none !important; } }'}</style>
    {rows.map((lineIndex, row) => {
      const current = row === index % 2;
      return <Text key={row} fontSize="lg" lineHeight="2.3" minHeight="2.3em" py={1}
        color={current ? 'fg' : 'fg.muted'} data-lyric-row={row} data-line-index={lineIndex ?? undefined}
        aria-label={current ? 'Current lyric line' : 'Upcoming lyric line'}
        data-testid={current ? 'current-lyric-line' : 'next-lyric-line'}>
        {lineIndex === null ? '\u00a0' : lines[lineIndex].map((lyric, i) => {
          const active = current && !countIn && lyricActive(lyric, beat);
          const wrappedRow = !current && wraps;
          const cue = !active ? cues.find(item => item.event === lyric
            && (wrappedRow ? !item.id.startsWith(`${pass}:`) : item.id.startsWith(`${pass}:`))) : undefined;
          const step = cue ? cue.ordinal - 1 : 0;
          const style = upcomingCueStyle(step, colorMode === 'light');
          const padding = cue ? 2 + Math.min(1, cue.beatsAway) * 7 : 0;
          return <span key={`${lyric.start}-${i}`}><Box as="span" position="relative" display="inline-block" lineHeight="1.3"
            data-active={active ? 'true' : undefined} fontWeight={active ? 'bold' : 'normal'}
            bg={active ? 'bg.emphasized' : undefined} borderRadius="sm"
            textDecoration={active ? 'underline' : undefined} textUnderlineOffset="4px">
            {lyric.text}
            {cue && <Box as="span" aria-hidden="true" pointerEvents="none" position="absolute"
              className="practice-lyric-cue" data-upcoming-lyric={cue.ordinal} data-beats-away={cue.beatsAway}
              inset={`${-padding}px`} border="1.5px dashed" borderColor={style.color} opacity={style.opacity}
              borderRadius="4px" transition="opacity 240ms ease-out"/>}
          </Box>{lyric.syllabic === 'begin' || lyric.syllabic === 'middle' ? '' : ' '}</span>;
        })}
      </Text>;
    })}
  </Box>;
});
