import {chakra, Flex, Stack, Text} from '@chakra-ui/react';
import {memo, useState} from 'react';
import {Tooltip} from '../../components/chakra-ui/tooltip.tsx';
import {chordLabel, noteName} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {PracticeChord} from './exercise.ts';
import {motionLabel} from './analysis.ts';
import type {ChordConnections} from './analysis.ts';

export const ChordConnectionsPopover = memo(function ChordConnectionsPopover({chord, previous, connections, mode, voiceLeading}: {
  chord: PracticeChord; previous?: PracticeChord; connections: ChordConnections; mode: LabelMode; voiceLeading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const held = connections.pairs.filter(pair => pair.delta === 0).length;
  const steps = connections.pairs.filter(pair => Math.abs(pair.delta) > 0 && Math.abs(pair.delta) <= 2).length;
  const summary = !previous ? 'First chord' : voiceLeading ? `${held} held · ${steps} step` : `${connections.common.length} held`;
  return <Tooltip open={open} onOpenChange={details => setOpen(details.open)} closeOnClick={false} closeOnScroll={false} interactive portalled showArrow
    contentProps={{maxWidth: 'min(340px, calc(100vw - 24px))', p: 3, bg: 'bg.panel', color: 'fg', borderWidth: '1px', boxShadow: 'md'}}
    content={<Stack gap={2} fontFamily="'JetBrains Mono', monospace" fontSize="sm">
      <Text fontWeight="semibold">{previous ? `${chordLabel(previous, mode)} → ` : ''}{chordLabel(chord, mode)}</Text>
      <Text>{previous ? connections.common.length ? `Held at the same pitch and octave: ${connections.common.map(note => noteName(note, mode)).join(', ')}.` : 'No tones held at the same pitch and octave.' : 'The first chord has no previous voicing.'}</Text>
      {voiceLeading && previous && <>
        {connections.pairs.map((pair, index) => <Flex key={index} gap={3} justify="space-between" fontVariantNumeric="tabular-nums">
          <Text>{noteName(pair.from, mode)} → {noteName(pair.to, mode)}</Text><Text>{motionLabel(pair.delta, mode)}</Text>
        </Flex>)}
        {connections.added.length > 0 && <Text>Added: {connections.added.map(note => noteName(note, mode)).join(', ')}</Text>}
        {connections.removed.length > 0 && <Text>Released: {connections.removed.map(note => noteName(note, mode)).join(', ')}</Text>}
        <Text fontSize="xs" color="fg.muted">One minimum-motion pairing holding common tones in these registers. A step is one or two semitones.</Text>
      </>}
    </Stack>}>
    <chakra.button type="button" position="absolute" bottom="3px" left="8px" right="8px" height="20px" fontSize="10px" textAlign="left" color="fg.muted" cursor="help"
      textDecoration="underline" textDecorationStyle="dotted" textUnderlineOffset="3px" data-chord-connections={chord.start}
      aria-label={`Explain ${voiceLeading ? 'voice leading' : 'common tones'} into ${chordLabel(chord, mode)}`}
      _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400'}}
      onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)} onClick={event => {event.stopPropagation(); setOpen(true);}}>
      {summary}
    </chakra.button>
  </Tooltip>;
});
