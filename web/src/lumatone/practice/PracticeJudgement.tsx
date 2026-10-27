import {Box, Flex, Text} from '@chakra-ui/react';
import {useColorModeValue} from '../../components/chakra-ui/color-mode.tsx';
import {noteName} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {exercise, TIMING_TOLERANCE} from './exercise.ts';
import type {Attempt} from './exercise.ts';

const timingX = (ms: number) => 160 + Math.max(-400, Math.min(400, ms)) / 400 * 128;
const hex = Array.from({length: 6}, (_, i) => {
  const angle = Math.PI / 6 + i * Math.PI / 3;
  return `${160 + Math.cos(angle) * 44},${77 + Math.sin(angle) * 44}`;
}).join(' ');

export function PracticeJudgement({attempt, freeTime, running, listening, betweenTargets, mode, transpose}: {
  attempt: Attempt | null; freeTime: boolean; running: boolean; listening: boolean;
  betweenTargets: boolean; mode: LabelMode; transpose: number;
}) {
  const green = useColorModeValue('#15803d', '#4ade80');
  const amber = useColorModeValue('#b45309', '#f5b66a');
  const cyan = useColorModeValue('#0e7490', '#52e6ef');
  const onTime = attempt && Math.abs(attempt.errorMs) <= TIMING_TOLERANCE;
  const success = attempt?.correctPitch && (freeTime || onTime);
  const pitchColor = attempt ? attempt.correctPitch ? green : amber : 'currentColor';
  const timingColor = onTime ? green : amber;
  const status = attempt ? freeTime ? attempt.correctPitch ? 'Pitch matched' : 'Try that note again'
    : onTime ? 'On time' : attempt.errorMs < 0 ? 'Early' : 'Late'
    : betweenTargets ? 'Between targets' : !running ? 'Ready to practice' : !listening ? 'Microphone off' : 'Waiting for a note';
  const location = attempt ? exercise[attempt.index].location : running ? freeTime ? 'Play at your own pace' : `Aim for the center · ±${TIMING_TOLERANCE} ms` : 'Your next practice result appears here';
  const pitchResult = attempt ? attempt.correctPitch ? 'Right pitch' : 'Check pitch / tuning' : 'Pitch';
  const timingResult = attempt && !freeTime ? `${Math.abs(Math.round(attempt.errorMs))} ms ${onTime ? 'from the beat' : attempt.errorMs < 0 ? 'early' : 'late'}` : null;
  return (
    <Box flex="1" minWidth="min(100%, 240px)" borderWidth="1px" borderRadius="md" p={3} data-testid="melody-judgement">
      <Text fontSize="xs" color="fg.muted">Melody feedback</Text>
      <Flex gap={2} align="center" minHeight="30px">
        <Box width="7px" height="7px" flexShrink={0} borderRadius="full" bg={attempt ? success ? green : amber : 'fg.muted'}/>
        <Text fontSize="md" color={attempt ? success ? green : amber : 'fg.muted'} data-testid="entrance-timing">{status}</Text>
      </Flex>
      <svg role="img" aria-label={`${pitchResult}. ${freeTime ? 'Free time; no timing grade.' : timingResult ?? 'Timing scale: early, on the beat, late.'}`}
        viewBox="0 0 320 155" style={{display: 'block', width: '100%', height: 130}}>
        {freeTime ? <polygon points={hex} fill={attempt ? pitchColor : cyan} fillOpacity={attempt ? 0.1 : 0.04}
          stroke={attempt ? pitchColor : cyan} strokeWidth={2} strokeDasharray={attempt ? undefined : '4 5'}/>
          : <circle cx={160} cy={49} r={26} fill={attempt ? pitchColor : 'currentColor'} fillOpacity={attempt ? 0.1 : 0.04} stroke={pitchColor} strokeOpacity={attempt ? 1 : 0.25} strokeWidth={1.5}/>}
        <g transform={`translate(160,${freeTime ? 77 : 49})`} data-testid="pitch-verdict" data-result={attempt ? attempt.correctPitch ? 'correct' : 'incorrect' : 'waiting'}>
          {attempt ? attempt.correctPitch
            ? <path d="M -13 0 L -4 9 L 14 -11" fill="none" stroke={green} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
            : <path d="M -9 -9 L 9 9 M 9 -9 L -9 9" fill="none" stroke={amber} strokeWidth={3} strokeLinecap="round"/>
            : <><circle r={10} fill="none" stroke="currentColor" opacity={0.3}/><circle r={2} fill="currentColor" opacity={0.4}/></>}
        </g>
        <text x={160} y={freeTime ? 142 : 91} textAnchor="middle" fill={pitchColor} opacity={attempt ? 1 : 0.6} style={{fontSize: 12}}>{pitchResult}</text>
        {!freeTime && <g data-testid="timing-gauge">
          <rect x={timingX(-TIMING_TOLERANCE)} y={113} width={timingX(TIMING_TOLERANCE) - timingX(-TIMING_TOLERANCE)} height={18} rx={4} fill={green} opacity={0.15}/>
          <line x1={32} y1={122} x2={288} y2={122} stroke="currentColor" opacity={0.3}/>
          {[-400, -200, 0, 200, 400].map(ms => <line key={ms} x1={timingX(ms)} x2={timingX(ms)} y1={ms === 0 ? 109 : 118} y2={ms === 0 ? 134 : 126} stroke={ms === 0 ? green : 'currentColor'} opacity={ms === 0 ? 1 : 0.3}/>)}
          {attempt && <g data-testid="timing-marker" data-error-ms={attempt.errorMs}>
            <circle cx={timingX(attempt.errorMs)} cy={122} r={5} fill={timingColor} stroke="var(--chakra-colors-bg)" strokeWidth={1.5}/>
            <path d={`M ${timingX(attempt.errorMs) - 4} 103 L ${timingX(attempt.errorMs)} 108 L ${timingX(attempt.errorMs) + 4} 103`} fill={timingColor}/>
          </g>}
          <text x={32} y={151} textAnchor="start" fill="currentColor" opacity={0.6} style={{fontSize: 11}}>Early</text>
          <text x={160} y={151} textAnchor="middle" fill="currentColor" opacity={0.6} style={{fontSize: 11}}>Beat</text>
          <text x={288} y={151} textAnchor="end" fill="currentColor" opacity={0.6} style={{fontSize: 11}}>Late</text>
        </g>}
      </svg>
      <Flex justify="space-between" gap={2} fontSize="sm" minHeight="1.5em">
        <Text color={attempt ? pitchColor : 'fg.muted'}>{attempt ? noteName(attempt.note, mode) : '—'}</Text>
        <Text fontVariantNumeric="tabular-nums" color="fg.muted">{timingResult ?? (freeTime ? 'Your pace' : '— ms')}</Text>
      </Flex>
      <Text fontSize="xs" color="fg.muted" minHeight="3em" lineHeight="1.5" mt={1}>
        {location}{attempt ? ` · target ${noteName(exercise[attempt.index].note + transpose, mode)}` : ''}
      </Text>
    </Box>
  );
}
