import {Box, Flex, Text} from '@chakra-ui/react';
import {useColorModeValue} from '../../components/chakra-ui/color-mode.tsx';
import {noteName} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {matchesPracticePitch} from './exercise.ts';
import type {Pitch} from './pitch.ts';

const point = (cents: number, radius: number) => {
  const angle = cents / 50 * Math.PI / 3;
  return {x: 200 + Math.sin(angle) * radius, y: 145 - Math.cos(angle) * radius};
};
const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

export function PracticeTuner({target, pitch, mode, allowLowOctaveUp, listening, countIn, location}: {
  target?: number; pitch: Pitch | null; mode: LabelMode; allowLowOctaveUp: boolean;
  listening: boolean; countIn: number | null; location: string;
}) {
  const green = useColorModeValue('#15803d', '#4ade80');
  const cyan = useColorModeValue('#0e7490', '#52e6ef');
  const amber = useColorModeValue('#b45309', '#f5b66a');
  const measured = pitch ? 69 + 12 * Math.log2(pitch.frequency / 440) : null;
  const hasTarget = target !== undefined || countIn !== null;
  let reference = target ?? pitch?.note;
  if (reference !== undefined && target !== undefined && allowLowOctaveUp && target < 60 && measured !== null
    && Math.abs(measured - target - 12) < Math.abs(measured - target)) reference += 12;
  const cents = measured !== null && reference !== undefined ? (measured - reference) * 100 : null;
  const matches = pitch && target !== undefined && matchesPracticePitch(target, pitch.note, pitch.cents, allowLowOctaveUp);
  const centered = cents !== null && Math.abs(cents) <= 5;
  const color = centered ? green : matches || target === undefined ? cyan : amber;
  const needle = point(Math.max(-50, Math.min(50, cents ?? 0)), 112);
  const bandLeft = point(-5, 110), bandRight = point(5, 110);
  const left = point(-50, 110), right = point(50, 110);
  const status = !pitch ? listening ? 'Listening…' : 'Mic off'
    : centered ? 'In tune' : Math.abs(cents!) > 65 ? 'Different note'
      : cents! < 0 ? 'Flat' : 'Sharp';
  return (
    <Box flex="2" minWidth="min(100%, 300px)" borderWidth="1px" borderRadius="md" p={3} data-testid="practice-tuner">
      <Flex justify="space-between" gap={3}>
        {hasTarget && <Box flex={1} minWidth={0}>
          <Text color="fg.muted" fontSize="xs">Target</Text>
          <Text fontSize="xl" lineHeight="1.5" minHeight="1.5em" whiteSpace="nowrap" data-testid="practice-target">{countIn !== null ? `Count in · ${countIn}` : target !== undefined ? noteName(target, mode) : '—'}</Text>
        </Box>}
        <Box flex={1} minWidth={0} textAlign={hasTarget ? 'right' : 'center'}>
          <Text color="fg.muted" fontSize="xs">{hasTarget ? 'You' : 'Your pitch'}</Text>
          <Text fontSize="xl" lineHeight="1.5" minHeight="1.5em" whiteSpace="nowrap" color={pitch ? color : 'fg.muted'} data-testid="heard-note">{pitch ? noteName(pitch.note, mode) : '—'}</Text>
        </Box>
      </Flex>
      <svg role="img" aria-label={`Pitch tuner. ${status}${cents !== null ? `. ${Math.abs(Math.round(cents))} cents ${cents < 0 ? 'flat' : 'sharp'}${target !== undefined ? ' of target' : ''}` : ''}.`}
        viewBox="0 0 400 155" style={{display: 'block', width: '100%', height: 130, overflow: 'visible'}}>
        <path d={`M ${left.x} ${left.y} A 110 110 0 0 1 ${right.x} ${right.y}`} fill="none" stroke="currentColor" opacity={0.2}/>
        <path d={`M ${bandLeft.x} ${bandLeft.y} A 110 110 0 0 1 ${bandRight.x} ${bandRight.y}`} fill="none" stroke={green} strokeWidth={12} opacity={0.2}/>
        {ticks.map(tick => {
          const outer = point(tick, 118), inner = point(tick, tick % 25 === 0 ? 100 : 106), label = point(tick, 136);
          return <g key={tick}>
            <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={tick === 0 ? green : 'currentColor'} opacity={tick === 0 ? 1 : 0.4} strokeWidth={tick === 0 ? 2 : 1}/>
            {tick % 20 === 0 || Math.abs(tick) === 50 ? <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fill="currentColor" opacity={0.65} style={{fontSize: 11}}>{tick > 0 ? '+' : ''}{tick}</text> : null}
          </g>;
        })}
        <text x={54} y={112} textAnchor="middle" fill="currentColor" opacity={0.6} style={{fontSize: 20}}>♭</text>
        <text x={346} y={112} textAnchor="middle" fill="currentColor" opacity={0.6} style={{fontSize: 20}}>♯</text>
        {pitch && <g data-testid="tuner-needle" data-cents={cents}>
          <line x1={200} y1={145} x2={needle.x} y2={needle.y} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
          <circle cx={200} cy={145} r={4} fill={color}/>
        </g>}
        {!pitch && <circle cx={200} cy={145} r={3} fill="currentColor" opacity={0.25}/>}
      </svg>
      <Flex gap={2} justify="space-between" align="center" fontSize="sm" minHeight="1.5em">
        <Text color={pitch ? color : 'fg.muted'} data-testid="tuner-status">{status}</Text>
        <Text whiteSpace="nowrap" fontVariantNumeric="tabular-nums" data-testid="tuner-cents">{cents === null ? '— cents' : `${Math.round(cents) > 0 ? '+' : ''}${Math.round(cents)} cents`}</Text>
      </Flex>
      <Flex justify="space-between" gap={2} fontSize="xs" color="fg.muted" minHeight="3em" lineHeight="1.5" mt={1}>
        <Text data-testid="follow-status">{location}</Text>
        <Text textAlign="right" whiteSpace="nowrap">{pitch ? `${Math.round(pitch.frequency)} Hz${target !== undefined && reference !== target ? ' · octave up' : ''}` : '\u00a0'}</Text>
      </Flex>
    </Box>
  );
}
