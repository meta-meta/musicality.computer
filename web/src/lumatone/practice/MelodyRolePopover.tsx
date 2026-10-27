import {Box, chakra, Stack, Text} from '@chakra-ui/react';
import {memo, useState} from 'react';
import {useColorModeValue} from '../../components/chakra-ui/color-mode.tsx';
import {Tooltip} from '../../components/chakra-ui/tooltip.tsx';
import {chordLabel, noteName} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {melodyRoleLabel} from './melodyRole.ts';
import type {MelodyRoleSegment} from './melodyRole.ts';

const counts = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];

export const MelodyRolePopover = memo(function MelodyRolePopover({note, segment, start, duration, mode}: {
  note: number; segment: MelodyRoleSegment; start: number; duration: number; mode: LabelMode;
}) {
  const [open, setOpen] = useState(false);
  const cyan = useColorModeValue('#0e7490', '#52e6ef');
  const amber = useColorModeValue('#b45309', '#f5b66a');
  const {role, chord} = segment;
  const label = role ? melodyRoleLabel(role, mode) : '—';
  const root = chord?.notes.find(tone => tone.root);
  const distance = Math.abs(role?.semitones ?? 0);
  const octaves = Math.floor(distance / 12), remainder = distance % 12;
  const parts = [octaves ? `${counts[octaves] ?? octaves} octave${octaves === 1 ? '' : 's'}` : '',
    remainder ? `${counts[remainder]} semitone${remainder === 1 ? '' : 's'}` : ''].filter(Boolean);
  const distanceText = distance === 0 ? 'Unison with the chord root.'
    : `${parts.join(' + ')} ${role!.semitones < 0 ? 'below' : 'above'} the chord root.`;
  const color = role ? role.inVoicing ? cyan : amber : 'currentColor';
  return (
    <Tooltip open={open} onOpenChange={details => setOpen(details.open)} openDelay={200} closeDelay={150}
      closeOnClick={false} closeOnScroll={false} interactive portalled showArrow
      contentProps={{maxWidth: 'min(320px, calc(100vw - 24px))', p: 3, bg: 'bg.panel', color: 'fg', borderWidth: '1px', boxShadow: 'md'}}
      content={<Stack gap={2} fontFamily="'JetBrains Mono', monospace" fontSize="sm" textAlign="left">
        <Text fontWeight="semibold">{role ? `${label} · ${role.description}` : 'Pickup · no chord sounding'}</Text>
        <Text>{noteName(note, mode)}{chord && root ? ` over ${chordLabel(chord, mode)}, rooted on ${noteName(root.note, mode)}.` : ' precedes the first harmony.'}</Text>
        {role && <>
          {mode === 'dozenal' && <Text fontSize="xs" color="fg.muted">{label} is the interval from the chord root within one octave. The + marks an interval, as in chord names; it does not indicate direction.</Text>}
          <Text>Actual distance: {distanceText}</Text>
          <Text color={color}>{role.inVoicing ? 'This pitch class is in the displayed chord voicing.' : 'This pitch class is outside the displayed chord voicing.'}</Text>
        </>}
      </Stack>}>
      <chakra.button type="button" position="absolute" bottom="2px" height="18px" zIndex={1}
        left={`${(segment.start - start) / duration * 100}%`} width={`${segment.duration / duration * 100}%`}
        fontSize="10px" lineHeight="18px" color={color} whiteSpace="nowrap" cursor="help"
        textDecoration="underline" textDecorationStyle="dotted" textUnderlineOffset="4px"
        aria-label={`Explain melody ${label}${chord ? ` over ${chordLabel(chord, mode)}` : ' in the pickup'}`}
        data-melody-role={role ? label : 'none'} data-harmonic-role={role?.label} data-role-start={segment.start}
        _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400', outlineOffset: '-2px'}}
        onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)}
        onClick={event => {event.stopPropagation(); setOpen(true);}}>
        <Box as="span" position="absolute" insetX="1px" insetY={0} borderRadius="3px" bg={color} opacity={role ? 0.1 : 0.03} pointerEvents="none"/>
        <Box as="span" position="relative">{label}</Box>
      </chakra.button>
    </Tooltip>
  );
});
