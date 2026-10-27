import {chakra, Stack, Text} from '@chakra-ui/react';
import {memo, useState} from 'react';
import {Tooltip} from '../../components/chakra-ui/tooltip.tsx';
import {chordLabel, pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {HarmonicDestination} from './analysis.ts';
import {pc} from './analysis.ts';
import {LENGTH, START} from './exercise.ts';

export const HarmonicDestinationPopover = memo(function HarmonicDestinationPopover({group, mode}: {group: HarmonicDestination; mode: LabelMode}) {
  const [open, setOpen] = useState(false);
  const key = `${pitchLabel(group.tonic, mode)} ${group.quality}`;
  const dominant = chordLabel(group.dominant, mode);
  const root = group.dominant.notes.find(note => note.root)!.note;
  const targetThird = group.tonic + (group.quality === 'minor' ? 3 : 4);
  const halfDiminished = group.preparation && group.preparation.notes.some(note => pc(note.note - group.preparation!.notes.find(note => note.root)!.note) === 6);
  // Preserve the seventh's harmonic spelling for the chart's flat-root dominants.
  const flatSevenths: Record<number, string> = {3: 'D♭', 8: 'G♭'};
  const seventh = mode === 'jazz' ? flatSevenths[pc(root)] ?? pitchLabel(root + 10, mode) : pitchLabel(root + 10, mode);
  return <Tooltip open={open} onOpenChange={details => setOpen(details.open)} openDelay={200} closeDelay={150} closeOnClick={false} closeOnScroll={false} interactive portalled showArrow
    contentProps={{maxWidth: 'min(360px, calc(100vw - 24px))', p: 3, bg: 'bg.panel', color: 'fg', borderWidth: '1px', boxShadow: 'md'}}
    content={<Stack gap={2} fontFamily="'JetBrains Mono', monospace" fontSize="sm">
      <Text fontWeight="semibold">Toward {key} · {group.degree} in {pitchLabel(10, mode)}</Text>
      {group.backdoor ? <>
        <Text>{dominant} is ♭VII7 relative to this target: a dominant seventh chord rooted a whole step below it, suggesting a backdoor resolution.</Text>
        <Text>Its seventh, {seventh}, can fall a semitone to {pitchLabel(group.tonic + 7, mode)}, the target’s fifth; its root can rise a whole step to {pitchLabel(group.tonic, mode)}.</Text>
        {group.preparation && <Text>{chordLabel(group.preparation, mode)} precedes it, giving a ii7–♭VII7 approach rather than a conventional ii–V.</Text>}
      </> : <>
        <Text>{dominant} is V7 of {key}: its root is a fifth above the target, and its third and seventh form the dominant tritone.</Text>
        <Text>Its third, {pitchLabel(root + 4, mode)}, can rise a semitone to {pitchLabel(group.tonic, mode)}; its seventh, {seventh}, can fall to {pitchLabel(targetThird, mode)}, the target’s {group.quality === 'minor' ? 'minor' : 'major'} third.</Text>
        {group.preparation && <Text>{chordLabel(group.preparation, mode)} prepares it as {halfDiminished ? 'iiø7' : 'ii7'} of {key}, reinforcing the {halfDiminished ? 'minor-key ' : ''}ii–V direction.</Text>}
      </>}
      <Text color={group.reached ? 'green.400' : 'orange.400'}>{group.next ? `Next: ${chordLabel(group.next, mode)}. ${group.reached ? 'The target triad is present.' : 'The harmony redirects instead of reaching the target triad.'}` : 'The piece ends before another chord.'}</Text>
      <Text fontSize="xs" color="fg.muted">An implied direction, not a guaranteed resolution. These are possible pitch-class tendencies, not a claim about the displayed voice leading.</Text>
    </Stack>}>
    <chakra.button type="button" data-harmonic-destination={group.degree} data-destination-status={group.reached ? 'reached' : 'redirected'}
      aria-label={`Explain movement toward ${key}`}
      position="absolute" left={`${(group.start - START) / LENGTH * 100}%`} width={`${(group.end - group.start) / LENGTH * 100}%`} height="25px" px={2}
      borderBottomWidth="2px" borderLeftWidth="1px" borderRightWidth="1px" borderColor={group.reached ? 'green.600' : 'orange.600'}
      fontSize="xs" whiteSpace="nowrap" overflow="hidden" textAlign="left" cursor="help"
      _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400'}}
      onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)} onClick={event => {event.stopPropagation(); setOpen(true);}}>
      → {key} {group.reached ? '✓' : '↪'}
    </chakra.button>
  </Tooltip>;
});
