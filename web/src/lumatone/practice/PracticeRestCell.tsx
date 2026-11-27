import {Box} from '@chakra-ui/react';
import {memo} from 'react';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import {rhythmValues} from './rhythm.ts';

const PX_PER_BEAT = 64;

// A silence in the melody, drawn on the strip as written rest symbols at the
// same height and scale as the note values. Each symbol sits where its share of
// the silence begins. Long rests are split at bar lines, as the notes' ties are.
export const PracticeRestCell = memo(function PracticeRestCell({start, duration, tall}: {start: number; duration: number; tall: boolean}) {
  const {LENGTH, START} = usePracticeScore();
  const values = rhythmValues(start, duration);
  const width = duration * PX_PER_BEAT;
  let offset = 0;
  const label = `Rest, ${Number(duration.toFixed(2))} ${duration === 1 ? 'beat' : 'beats'}`;
  return <Box role="img" aria-label={label} title={label} data-melody-rest={start} data-rest-values={values.map(value => value.beats).join('+')} position="absolute" pointerEvents="none"
    left={`${(start - START) / LENGTH * 100}%`} width={`${duration / LENGTH * 100}%`} height="100%" color="fg.muted">
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${tall ? 168 : 144}`} preserveAspectRatio="none" style={{display: 'block', width: '100%', height: '100%'}}>
      {values.map((value, index) => {
        const dotted = [3, 1.5, 0.75].includes(value.beats);
        const base = dotted ? value.beats / 1.5 : value.beats;
        const x = offset * PX_PER_BEAT + Math.min(22, value.beats * PX_PER_BEAT / 2);
        offset += value.triplet ? 2 / 3 : value.beats;
        return <g key={index} transform={`translate(${x},66)`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {base >= 2 && <>
            <line x1={-8} x2={8} y1={base === 4 ? -4 : 0} y2={base === 4 ? -4 : 0} strokeWidth={1.2}/>
            <rect x={-5} y={-4} width={10} height={4} fill="currentColor" stroke="none"/>
          </>}
          {base === 1 && <path d="M -2 -11 L 3 -4 L -2 1 L 3 7 C -1 5 -5 8 -1 12"/>}
          {base <= 0.5 && <>
            <path d="M 4 -8 L -2 10"/>
            <circle cx={-3} cy={-6} r={2} fill="currentColor" stroke="none"/><path d="M -3 -5 Q 2 -3 4 -8" strokeWidth={1.2}/>
            {base === 0.25 && <><circle cx={-5} cy={0} r={2} fill="currentColor" stroke="none"/><path d="M -5 1 Q 0 3 2 -2" strokeWidth={1.2}/></>}
          </>}
          {dotted && <circle cx={9} cy={-2} r={1.6} fill="currentColor" stroke="none"/>}
          {value.triplet && <text x={0} y={-16} textAnchor="middle" fill="currentColor" stroke="none" style={{fontSize: 9}}>3</text>}
        </g>;
      })}
    </svg>
  </Box>;
});
