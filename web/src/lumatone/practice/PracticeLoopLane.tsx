import {Box, Flex, Text} from '@chakra-ui/react';
import {useMemo, useRef, useState} from 'react';
import type {PointerEvent} from 'react';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import {dragLoopRange, loopSnapPoints, snapLoopBeat} from './practiceSections.ts';

const HANDLE_REACH = 9;

// A lane on the same beat scale as the melody. Drag across it to set both loop
// points; drag an existing end to move just that end. Points snap to bar lines
// and note boundaries.
export function PracticeLoopLane({loopStart, loopEnd, disabled, onRange, onClear}: {
  loopStart: number | null; loopEnd: number | null; disabled: boolean;
  onRange: (start: number, end: number) => void; onClear: () => void;
}) {
  const {score, exercise, START, END, LENGTH, beatLabel} = usePracticeScore();
  const points = useMemo(() => loopSnapPoints(exercise, score.bars, {start: START, end: END}), [exercise, score.bars, START, END]);
  const lane = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);
  const [preview, setPreview] = useState<{start: number; end: number} | null>(null);
  const percent = (beat: number) => (beat - START) / LENGTH * 100;
  const beatAt = (event: PointerEvent) => {
    const box = lane.current!.getBoundingClientRect();
    return START + Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * LENGTH;
  };
  const set = loopStart !== null || loopEnd !== null;
  const shown = preview ?? (set ? {start: loopStart ?? START, end: loopEnd ?? END} : null);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const box = lane.current!.getBoundingClientRect();
    const x = (beat: number) => box.left + (beat - START) / LENGTH * box.width;
    const beat = beatAt(event);
    // Grabbing an end keeps the other one fixed.
    if (shown && Math.abs(event.clientX - x(shown.start)) <= HANDLE_REACH) anchor.current = shown.end;
    else if (shown && Math.abs(event.clientX - x(shown.end)) <= HANDLE_REACH) anchor.current = shown.start;
    else anchor.current = snapLoopBeat(beat, points);
    try {event.currentTarget.setPointerCapture(event.pointerId);} catch { /* The drag still works inside the lane. */ }
    setPreview(dragLoopRange(anchor.current, beat, points));
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (anchor.current === null) return;
    setPreview(dragLoopRange(anchor.current, beatAt(event), points));
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (anchor.current === null) return;
    const range = dragLoopRange(anchor.current, beatAt(event), points);
    anchor.current = null;
    setPreview(null);
    if (range) onRange(range.start, range.end);
  };
  return <Flex role="group" aria-label="Loop lane" align="center">
    <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Loop</Text>
    <Box ref={lane} data-loop-lane="true" data-loop-start={shown?.start} data-loop-end={shown?.end} position="relative" flex={1} height="22px" borderWidth="1px" borderRadius="sm" bg="bg.muted"
      title={disabled ? 'Pause to change the loop' : 'Drag to set the loop. Drag an end to move it. Double-click to clear.'}
      cursor={disabled ? 'default' : 'ew-resize'} opacity={disabled ? 0.6 : 1} style={{touchAction: 'pan-y'}}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => {anchor.current = null; setPreview(null);}}
      onDoubleClick={() => {if (!disabled) onClear();}}>
      {score.bars.map(start => <Box key={start} aria-hidden="true" pointerEvents="none" position="absolute" top={0} bottom={0} left={`${percent(start)}%`} width="1px" bg="border"/>)}
      {shown && <Box data-loop-range="true" role="img" aria-label={`Loop from ${beatLabel(shown.start)} to ${beatLabel(shown.end)}`} pointerEvents="none" position="absolute" top="2px" bottom="2px"
        left={`${percent(shown.start)}%`} width={`${(shown.end - shown.start) / LENGTH * 100}%`} bg="cyan.500" opacity={preview ? 0.5 : 0.35} borderRadius="2px"/>}
      {shown && <Box aria-hidden="true" pointerEvents="none" position="absolute" top={0} bottom={0} left={`${percent(shown.start)}%`} width="3px" bg="green.400"/>}
      {shown && <Box aria-hidden="true" pointerEvents="none" position="absolute" top={0} bottom={0} left={`calc(${percent(shown.end)}% - 3px)`} width="3px" bg="orange.400"/>}
      {!shown && <Text aria-hidden="true" pointerEvents="none" position="sticky" left="80px" display="inline-block" fontSize="xs" color="fg.muted" lineHeight="20px" px={2}>Drag here to set a loop</Text>}
    </Box>
  </Flex>;
}
