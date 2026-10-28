import {Box, Button, chakra, Flex, Stack, Text} from '@chakra-ui/react';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {PracticeTempoInput} from './PracticeTempoInput.tsx';
import {chordLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import type {Attempt, PracticeChord} from './exercise.ts';
import {melodyRole, melodyRoleLabel} from './melodyRole.ts';

import {PracticeHarmonyCell, PracticeMelodyCell} from './PracticeStripCells.tsx';
import {connectVoices} from './analysis.ts';
import type {AnalysisOptions} from './analysis.ts';
import {HarmonicDestinationLane, MelodicIntervalLane, PhraseAnalysisLanes} from './PracticeAnalysisLanes.tsx';



export function PracticeTimeline({beat, entryBeat, endBeat, pass, running, pendingBeat, target, harmony, mode, transpose, keyTranspose = 0, pieceHarmonies, showHarmony, showMelody = true, showMelodyRoles, showChordTransitions, bpm,
  loop, loopStart, loopEnd, onLoopChange, onLoopStart, onLoopEnd, onSeek, onMelody, onHarmony, attempts, listening, freeTime, analysis, phraseStarts, onTogglePlayback, onToggleListening, microphoneStarting, onBpmChange, onBack, transportDisabled}: {
  beat: number; entryBeat: number; endBeat: number; pass: number; running: boolean; pendingBeat: number | null;
  target?: MelodyAttack; harmony?: PracticeChord; mode: LabelMode; transpose: number; keyTranspose?: number; pieceHarmonies: PracticeChord[]; showHarmony: boolean; showMelody?: boolean; showMelodyRoles: boolean; showChordTransitions: boolean; bpm: number;
  loop: boolean; loopStart: number | null; loopEnd: number | null; onLoopChange: (enabled: boolean) => void;
  onLoopStart: (beat: number | null) => void; onLoopEnd: (beat: number | null) => void;
  onSeek: (beat: number) => void; onMelody: (note: MelodyAttack) => void; onHarmony: (chord: PracticeChord) => void;
  attempts: Record<string, Attempt>; listening: boolean; freeTime: boolean;
  analysis: AnalysisOptions; phraseStarts: number[];
  onToggleListening: () => void; microphoneStarting: boolean; onBpmChange: (value:number) => void;
  onTogglePlayback: () => void; onBack: () => void; transportDisabled: boolean;
}) {
  const {score, beatLabel, END, exercise, LENGTH, START} = usePracticeScore();
  const bars = score.bars;
  const ends = bars.map((_, i) => bars[i + 1] ?? END);
  const percent = (beat: number) => (beat - START) / LENGTH * 100;
  const chordConnections = useMemo(() => pieceHarmonies.map((chord, index) => connectVoices(pieceHarmonies[index - 1], chord)), [pieceHarmonies]);
  const scroll = useRef<HTMLDivElement>(null);
  const actions = useRef({onSeek, onMelody, onHarmony});
  useEffect(() => {actions.current = {onSeek, onMelody, onHarmony};}, [onSeek, onMelody, onHarmony]);
  const seek = useCallback((beat: number) => actions.current.onSeek(beat), []);
  const playMelody = useCallback((note: MelodyAttack) => actions.current.onMelody(note), []);
  const playHarmony = useCallback((chord: PracticeChord) => actions.current.onHarmony(chord), []);
  const position = Math.max(START, Math.min(END, running ? Math.max(beat, entryBeat) : beat));
  const bar = bars.reduce((last, start, i) => start <= position ? i : last, 0);
  const currentRole = target && harmony && beat >= harmony.start ? melodyRole(target.note + transpose, harmony) : null;
  useEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const content = element.firstElementChild as HTMLElement | null;
    if (!content) return;
    const x = 72 + (content.offsetWidth - 72) * Math.max(0, (bars[bar] - START) / LENGTH);
    element.scrollLeft = Math.max(0, x - element.clientWidth * 0.25);
  }, [bar, running, bars, START, LENGTH]);
  return (
    <Stack gap={2}>
      <Flex gap={2} wrap="wrap" align="center">
        <Text fontSize="sm" width="19ch" flexShrink={0} fontVariantNumeric="tabular-nums" whiteSpace="nowrap" data-testid="playhead-position" data-beat={beat} data-pass={pass}>{beatLabel(position)}</Text>
        {showMelodyRoles && <Text fontSize="sm" color="fg.muted" data-testid="current-melody-role">{currentRole && harmony ? `Melody: ${melodyRoleLabel(currentRole, mode)} ${mode === 'dozenal' ? 'from' : 'of'} ${chordLabel(harmony, mode)}` : 'Melody role: —'}</Text>}
        <Text fontSize="sm" ml="auto" aria-live="polite" color="orange.500">{pendingBeat !== null ? `Next beat → ${beatLabel(pendingBeat)}` : '\u00a0'}</Text>
      </Flex>
      <Box role="group" aria-label="Whole composition ruler" position="relative" height="40px" borderWidth="1px" borderRadius="sm" overflow="hidden">
        {loop && <Box pointerEvents="none" position="absolute" top={0} bottom={0} left={`${percent(loopStart ?? START)}%`} width={`${((loopEnd ?? END) - (loopStart ?? START)) / LENGTH * 100}%`} bg="cyan.500" opacity={0.12}/>}
        {START < 0 && <chakra.button type="button" aria-label="Cue pickup" position="absolute" left={0} width={`${-START / LENGTH * 100}%`} height="100%" onClick={() => onSeek(START)} borderRightWidth="1px"/>}
        {bars.map((start, index) => <chakra.button type="button" key={start} aria-label={`Cue bar ${index + 1}`} position="absolute" left={`${percent(start)}%`} width={`${(ends[index] - start) / LENGTH * 100}%`} height="100%" borderRightWidth="1px" fontSize="xs" bg={position >= start && position < ends[index] ? 'bg.muted' : undefined} onClick={() => onSeek(start)}>
          <span className={index % 4 === 0 ? undefined : 'practice-minor-bar'}>{index + 1}</span>
        </chakra.button>)}
        <style>{'@media (max-width: 600px) { .practice-minor-bar { visibility: hidden; } }'}</style>
        {loopStart !== null && <Box data-loop-marker="start" pointerEvents="none" position="absolute" left={`${percent(loopStart)}%`} top={0} bottom={0} width="2px" bg="green.400"/>}
        {loopEnd !== null && <Box data-loop-marker="end" pointerEvents="none" position="absolute" left={`min(calc(100% - 2px), ${percent(loopEnd)}%)`} top={0} bottom={0} width="2px" bg="orange.400"/>}
        <Box data-testid="overview-playhead" pointerEvents="none" position="absolute" left={`min(calc(100% - 2px), ${percent(position)}%)`} top={0} bottom={0} width="2px" bg="cyan.400"/>
        {pendingBeat !== null && <Box pointerEvents="none" position="absolute" left={`${percent(pendingBeat)}%`} top={0} bottom={0} width="2px" bg="orange.400"/>}
      </Box>
      <Flex gap={2} align="center" wrap="wrap" fontSize="sm">
        <Button size="sm" variant="outline" aria-label="Previous loop point or beginning" title="Previous loop point or beginning ([)" onClick={onBack}>⏮</Button>
        <Button size="sm" aria-label={running ? 'Pause playback' : 'Play playback'} title="Play / pause (Space)" disabled={transportDisabled} onClick={onTogglePlayback}>{running ? '⏸' : '▶'}</Button>
        <Button size="sm" variant={loop ? 'solid' : 'outline'} colorPalette={loop ? 'cyan' : undefined}
          aria-label="Loop playback" aria-pressed={loop} title={running ? 'Pause to change looping' : loop ? 'Looping on' : 'Looping off'}
          disabled={running || transportDisabled} onClick={() => onLoopChange(!loop)}>↻</Button>
        <Flex as="label" gap={1} align="center"><PracticeTempoInput label="Playhead tempo" bpm={bpm} onChange={onBpmChange} disabled={running || transportDisabled}/> BPM</Flex>
        <Button size="sm" variant={listening ? 'solid' : 'outline'} aria-pressed={listening}
          aria-label={listening ? 'Stop microphone at playhead' : 'Listen to flute at playhead'} disabled={transportDisabled} onClick={onToggleListening}>
          {microphoneStarting ? 'Opening…' : listening ? 'Listening' : 'Listen'}
        </Button>
        <chakra.label htmlFor="practice-playhead">Playhead</chakra.label>
        <input id="practice-playhead" aria-label="Playhead" type="range" min={START} max={END} step={1} value={position} style={{flex: '1 1 160px', minWidth: 0}} onChange={event => onSeek(Number(event.target.value))}/>
      </Flex>
      <Text fontSize="xs" color="fg.muted">Space: play/pause · [ / ]: previous/next loop point or track boundary · ← / →: previous/next bar · ↓: play current chord. Shortcuts leave text fields and sliders alone.</Text>
      <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={2}>Loop start
          <select aria-label="Loop start" disabled={running} value={loopStart ?? ''} onChange={event => onLoopStart(event.target.value === '' ? null : Number(event.target.value))}>
            <option value="">{START < 0 ? 'Beginning (pickup)' : 'Beginning'}</option>
            {loopStart !== null && !bars.includes(loopStart) && <option value={loopStart}>{beatLabel(loopStart)}</option>}
            {bars.map((start, i) => <option key={start} value={start}>Bar {i + 1}</option>)}
          </select>
        </Flex>
        <Flex as="label" gap={2}>Loop end
          <select aria-label="Loop end" disabled={running} value={loopEnd ?? ''} onChange={event => onLoopEnd(event.target.value === '' ? null : Number(event.target.value))}>
            <option value="">End of piece</option>
            {loopEnd !== null && !ends.includes(loopEnd) && <option value={loopEnd}>{beatLabel(loopEnd)}</option>}
            {ends.map((end, i) => <option key={end} value={end}>After bar {i + 1}</option>)}
          </select>
        </Flex>
        <Button size="xs" variant="outline" disabled={running || position >= END} onClick={() => onLoopStart(Math.round(position * 6) / 6)}>Set start here</Button>
        <Button size="xs" variant="outline" disabled={running || position <= START} onClick={() => onLoopEnd(Math.round(position * 6) / 6)}>Set end here</Button>
        <Button size="xs" variant="ghost" disabled={running || (loopStart === null && loopEnd === null)} onClick={() => {onLoopStart(null); onLoopEnd(null);}}>Clear points</Button>
      </Flex>
      <Box ref={scroll} overflowX="auto" role="group" aria-label="Passage harmony and melody">
        <Stack gap={1} minWidth={`${72 + LENGTH * 64}px`} position="relative">
          {showMelody && analysis.phrases && <PhraseAnalysisLanes starts={phraseStarts} mode={mode}/>}
          {showMelody && analysis.melodicIntervals && <MelodicIntervalLane mode={mode} transpose={transpose}/>}
          {showMelody && <Flex role="group" aria-label="Passage rhythm" align="center">
            <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Melody</Text>
            <Box position="relative" flex={1} height={showMelodyRoles ? '168px' : '144px'}>
              {exercise.map((note, index) => {
                const attempt = attempts[`${pass}-${index}`];
                const missed = !attempt && listening && !freeTime && running && note.start + note.duration > entryBeat && note.start < endBeat && beat > Math.max(entryBeat, note.start) + 0.4 * bpm / 60;
                return <PracticeMelodyCell key={index} note={note} attempt={attempt} missed={missed} mode={mode} transpose={transpose} pieceHarmonies={pieceHarmonies} showRoles={showMelodyRoles}
                  active={target === note} running={running} freeTime={freeTime} onSeek={seek} onMelody={playMelody}/>;
              })}
            </Box>
          </Flex>}
          {showHarmony && analysis.destinations && <HarmonicDestinationLane mode={mode} keyTranspose={keyTranspose}/>}
          {showHarmony && <Flex role="group" aria-label="Chord changes" align="center">
            <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Harmony</Text>
            <Box position="relative" flex={1} height={analysis.commonTones || analysis.voiceLeading ? '248px' : '224px'}>
              {START < 0 && <Box position="absolute" left={0} width={`${-START / LENGTH * 100}%`} p={1} fontSize="xs" color="fg.muted">Pickup</Box>}
              {pieceHarmonies.map((chord, index) => <PracticeHarmonyCell key={chord.start} chord={chord} previous={pieceHarmonies[index - 1]} mode={mode} keyTranspose={keyTranspose} showTransitions={showChordTransitions}
                active={harmony === chord} running={running} onSeek={seek} onHarmony={playHarmony} connections={chordConnections[index]}
                showCommon={analysis.commonTones} showVoiceLeading={analysis.voiceLeading} showGuides={analysis.guideTones}/>)}
            </Box>
          </Flex>}
          <Box aria-hidden="true" position="absolute" pointerEvents="none" top={0} bottom={0} width="1px" bg="cyan.400" opacity={0.7} left={`calc(72px + ${percent(position)}% - ${(position - START) / LENGTH * 72}px)`}/>
        </Stack>
      </Box>
      {showMelodyRoles && <Text fontSize="xs" color="fg.muted">{mode === 'dozenal' ? 'Intervals from the chord root, independent of octave: +5 = five semitones within the octave. The + marks an interval, as in chord names.' : 'Melody roles: R = root; other labels are intervals above the chord root.'} Cyan = in the displayed voicing; amber = outside it.</Text>}
    </Stack>
  );
}
