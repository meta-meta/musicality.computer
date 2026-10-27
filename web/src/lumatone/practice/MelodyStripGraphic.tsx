import {useMemo} from 'react';
import {useColorModeValue} from '../../components/chakra-ui/color-mode.tsx';
import {getNoteColorHsl} from '../colors.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {TIMING_TOLERANCE} from './exercise.ts';
import type {Attempt} from './exercise.ts';
import {rhythmValues} from './rhythm.ts';
import type {MelodyRoleSegment} from './melodyRole.ts';

export function MelodyStripGraphic({note, start, duration, mode, attempt, missed, freeTime, active, roles}: {
  note: number; start: number; duration: number; mode: LabelMode; attempt?: Attempt; missed: boolean; freeTime: boolean; active: boolean;
  roles?: MelodyRoleSegment[];
}) {
  const green = useColorModeValue('#15803d', '#4ade80');
  const amber = useColorModeValue('#b45309', '#f5b66a');
  const cyan = useColorModeValue('#0e7490', '#52e6ef');
  const color = useMemo(() => getNoteColorHsl(note).toString({format: 'hex'}), [note]);
  const width = duration * 64;
  const center = Math.min(22, width / 2);
  const radius = Math.min(17, width / 2 - 3);
  const points = Array.from({length: 6}, (_, index) => {
    const angle = Math.PI / 2 + index * Math.PI / 3;
    return `${center + Math.cos(angle) * radius},${25 + Math.sin(angle) * radius}`;
  }).join(' ');
  const resultColor = attempt ? attempt.correctPitch ? green : amber : missed ? amber : 'currentColor';
  const timingX = (ms: number) => width / 2 + Math.max(-400, Math.min(400, ms)) / 800 * (width - 12);
  const rhythm = rhythmValues(start, duration);
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${roles ? 168 : 144}`} preserveAspectRatio="none" style={{display: 'block', width: '100%', height: '100%'}}>
      <polygon points={points} fill={color} fillOpacity={active ? 0.55 : 0.35} stroke={active ? cyan : color} strokeWidth={active ? 2 : 1}/>
      <text x={center - 2} y={25} textAnchor="middle" dominantBaseline="central" fill="currentColor" style={{fontSize: pitchLabel(note, mode).length > 1 ? 11 : 15}}>{pitchLabel(note, mode)}</text>
      <text x={center + radius * 0.45} y={31} textAnchor="middle" fill="currentColor" opacity={0.7} style={{fontSize: 6}}>{Math.floor(note / 12) - 1}</text>
      <g data-rhythm-values={rhythm.map(value => value.triplet ? 'quarter-triplet' : value.beats).join('+')}>
        {rhythm.map((value, index) => {
          const dotted = [3, 1.5, 0.75].includes(value.beats);
          const base = dotted ? value.beats / 1.5 : value.beats;
          const x = center + index * 28;
          return <g key={index} transform={`translate(${x},75)`}>
            <ellipse rx={base === 4 ? 5 : 4} ry={3} transform={base === 4 ? undefined : 'rotate(-18)'} fill={base >= 2 ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth={1.4}/>
            {base < 4 && <line x1={3.5} x2={3.5} y1={-1} y2={-21} stroke="currentColor" strokeWidth={1.3}/>}
            {base <= 0.5 && <path d="M 3.5 -21 C 13 -16 13 -10 8 -6 C 11 -13 7 -13 3.5 -14 Z" fill="currentColor"/>}
            {base === 0.25 && <path d="M 3.5 -15 C 13 -10 13 -4 8 0 C 11 -7 7 -7 3.5 -8 Z" fill="currentColor"/>}
            {dotted && <circle cx={10} cy={-2} r={1.6} fill="currentColor"/>}
            {value.triplet && <text x={10} y={-23} textAnchor="middle" fill="currentColor" style={{fontSize: 9}}>3</text>}
            {index < rhythm.length - 1 && <path d="M 5 7 Q 14 16 24 7" fill="none" stroke="currentColor" strokeWidth={1.1}/>}
          </g>;
        })}
      </g>
      <line x1={6} x2={width - 6} y1={94} y2={94} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={active ? 1 : 0.65}/>
      {Array.from({length: Math.floor(duration) + 1}, (_, beat) => <line key={beat}
        x1={6 + beat / duration * (width - 12)} x2={6 + beat / duration * (width - 12)} y1={90} y2={98} stroke="currentColor" opacity={0.25}/>)}
      <g transform={`translate(${center},113)`} data-strip-pitch={attempt ? attempt.correctPitch ? 'correct' : 'incorrect' : missed ? 'missed' : 'waiting'}>
        <circle r={9} fill={attempt || missed ? resultColor : 'none'} fillOpacity={0.1} stroke={resultColor} strokeOpacity={attempt || missed ? 1 : 0.2} strokeDasharray={missed ? '2 2' : undefined}/>
        {attempt ? attempt.correctPitch
          ? <path d="M -5 0 L -1 4 L 5 -4" fill="none" stroke={green} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" fill="none" stroke={amber} strokeWidth={1.8} strokeLinecap="round"/>
          : missed ? <path d="M -4 0 H 4" stroke={amber} strokeWidth={1.5}/> : <circle r={2} fill="currentColor" opacity={0.2}/>}
      </g>
      {!freeTime && <g data-strip-timing={attempt ? Math.abs(attempt.errorMs) <= TIMING_TOLERANCE ? 'on-time' : attempt.errorMs < 0 ? 'early' : 'late' : 'waiting'}>
        <rect x={timingX(-TIMING_TOLERANCE)} y={131} width={timingX(TIMING_TOLERANCE) - timingX(-TIMING_TOLERANCE)} height={8} rx={2} fill={green} opacity={0.15}/>
        <line x1={6} x2={width - 6} y1={135} y2={135} stroke="currentColor" opacity={0.2}/>
        <line x1={width / 2} x2={width / 2} y1={129} y2={141} stroke={green} opacity={0.6}/>
        {attempt && <circle cx={timingX(attempt.errorMs)} cy={135} r={3} fill={Math.abs(attempt.errorMs) <= TIMING_TOLERANCE ? green : amber}/>}
      </g>}
    </svg>
  );
}
