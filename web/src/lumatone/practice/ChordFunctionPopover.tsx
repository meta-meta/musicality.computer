import {chakra, Stack, Text} from '@chakra-ui/react';
import {memo, useState} from 'react';
import {Tooltip} from '../../components/chakra-ui/tooltip.tsx';
import {chordLabel, pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';

const targets: Record<string, {tonic: number; quality: string; degree: string}> = {
  ii: {tonic: 0, quality: 'minor', degree: 'second'},
  iii: {tonic: 2, quality: 'minor', degree: 'third'},
  IV: {tonic: 3, quality: 'major', degree: 'fourth'},
  V: {tonic: 5, quality: 'major', degree: 'fifth'},
  vi: {tonic: 7, quality: 'minor', degree: 'sixth'},
};

export const ChordFunctionPopover = memo(function ChordFunctionPopover({analysis, name, mode}: {analysis: string; name: string; mode: LabelMode}) {
  const [open, setOpen] = useState(false);
  const n = (note: number) => pitchLabel(note, mode);
  const c = (root: number, quality: '7' | 'm7' | 'maj7') => {
    const intervals = quality === '7' ? [0, 4, 7, 10] : quality === 'm7' ? [0, 3, 7, 10] : [0, 4, 7, 11];
    return chordLabel({name: `${pitchLabel(root, 'jazz')}${quality}`, notes: intervals.map((interval, index) => ({note: root + interval, root: index === 0}))}, mode);
  };
  const descriptions: Record<string, string> = {
    Imaj7: `Tonic major seventh: the home chord in ${n(10)} major.`,
    ii7: `Minor seventh on degree 2 of ${n(10)} major. A predominant, often leading to V7.`,
    'iiø7': `Half-diminished seventh on degree 2, borrowed from ${n(10)} minor. It prepares ${c(5, '7')}, the dominant.`,
    V7: `Dominant seventh on degree 5: ${c(5, '7')} points back toward the home chord, ${n(10)}.`,
    iii7: `Minor seventh on degree 3 of ${n(10)} major: ${n(2)} minor.`,
    i7: `Tonic minor seventh, borrowed from ${n(10)} minor.`,
    IV7: `Dominant seventh on degree 4, ${c(3, '7')}. With the preceding ${c(10, 'm7')}, it also suggests a ii–V pointing toward ${n(8)}.`,
    IVmaj7: `Major seventh on degree 4, ${c(3, 'maj7')}: the subdominant area.`,
    Vmaj7: `Major seventh on degree 5, ${c(5, 'maj7')}. Unlike ${c(5, '7')}, it contains ${n(4)}${mode === 'jazz' ? ' natural' : ''} rather than ${n(3)}.`,
    vi7: `Minor seventh on degree 6, ${n(7)} minor. With ${c(0, '7')}, it also forms a ii–V pointing toward ${n(5)}.`,
    '♭VII7': `Dominant seventh on lowered degree 7, ${c(8, '7')}: a backdoor dominant pointing toward ${n(10)}.`,
  };
  const [local, degree] = analysis.split('/');
  const target = targets[degree];
  const targetKey = target ? `${n(target.tonic)} ${target.quality}` : '';
  const description = target
    ? local === 'iiø7' ? `Half-diminished seventh on degree 2 of ${targetKey}.`
      : local === 'ii7' ? `Minor seventh on degree 2 of ${targetKey}, preparing its dominant.`
        : `Dominant seventh pointing toward ${targetKey}.`
    : descriptions[analysis];
  return (
    <Tooltip open={open} onOpenChange={details => setOpen(details.open)} openDelay={200} closeDelay={150}
      closeOnClick={false} closeOnScroll={false} interactive portalled showArrow
      contentProps={{maxWidth: 'min(320px, calc(100vw - 24px))', p: 3, bg: 'bg.panel', color: 'fg', borderWidth: '1px', boxShadow: 'md'}}
      content={<Stack gap={2} fontFamily="'JetBrains Mono', monospace" fontSize="sm" fontWeight="normal" textAlign="left">
        <Text fontWeight="semibold">{name} · {analysis}</Text>
        <Text>{description}</Text>
        {target && <Text>The slash means “of”: {degree} is the {target.degree}-degree chord in {n(10)}, {targetKey}. This describes a temporary harmonic target, not a bass note.</Text>}
        {local.includes('ø') && <Text color="fg.muted" fontSize="xs">ø7 = half-diminished seventh.</Text>}
      </Stack>}>
      <chakra.button type="button" position="absolute" left="8px" top="42px" zIndex={1}
        fontSize="xs" lineHeight="18px" fontWeight="semibold" color="fg.muted" whiteSpace="nowrap"
        textDecoration="underline" textDecorationStyle="dotted" textUnderlineOffset="3px" cursor="help"
        aria-label={`Explain ${analysis} for ${name}`} data-chord-function={analysis}
        _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400', outlineOffset: '2px'}}
        onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)}
        onClick={event => {event.stopPropagation(); setOpen(true);}}>
        {analysis}
      </chakra.button>
    </Tooltip>
  );
});
