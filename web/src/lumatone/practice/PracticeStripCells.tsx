import {usePracticeScore} from './PracticeScoreContext.tsx';
import {Box, chakra, Text} from '@chakra-ui/react';
import {memo, useMemo} from 'react';
import {chordLabel, noteName, pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import {TIMING_TOLERANCE} from './exercise.ts';
import type {Attempt, PracticeChord} from './exercise.ts';
import {ChordFunctionPopover} from './ChordFunctionPopover.tsx';
import {HarmonyStripGraphic} from './HarmonyStripGraphic.tsx';
import {MelodyRolePopover} from './MelodyRolePopover.tsx';
import {MelodyStripGraphic} from './MelodyStripGraphic.tsx';
import {melodyRoleLabel, melodyRoleSegments} from './melodyRole.ts';
import type {ChordConnections} from './analysis.ts';
import {ChordConnectionsPopover} from './ChordConnectionsPopover.tsx';

export const PracticeMelodyCell = memo(function PracticeMelodyCell({note, attempt, missed, mode, transpose, pieceHarmonies, showRoles, active, running, freeTime, onSeek, onMelody}: {
  note: MelodyAttack; attempt?: Attempt; missed: boolean; mode: LabelMode; transpose: number; pieceHarmonies?: PracticeChord[]; showRoles: boolean;
  active: boolean; running: boolean; freeTime: boolean; onSeek: (beat: number) => void; onMelody: (note: MelodyAttack) => void;
}) {
  const {LENGTH, START} = usePracticeScore();
  const roles = useMemo(() => showRoles ? melodyRoleSegments(note.note + transpose, note.start, note.duration, pieceHarmonies) : undefined, [showRoles, note, transpose, pieceHarmonies]);
  const roleDescription = useMemo(() => roles?.map(segment => segment.role && segment.chord
    ? `${segment.role.description} (${melodyRoleLabel(segment.role, mode)}) over ${chordLabel(segment.chord, mode)}; ${segment.role.inVoicing ? 'in' : 'outside'} the displayed voicing`
    : 'Pickup: no chord sounding').join(' → '), [roles, mode]);
  const duration = Math.abs(note.duration - 2 / 3) < 1e-6 ? '⅔' : String(Number(note.duration.toFixed(2)));
  const result = attempt ? `${attempt.correctPitch ? 'Right pitch' : 'Different pitch or tuning'}${attempt.freeTime ? '' : `, ${Math.abs(Math.round(attempt.errorMs))} ms ${Math.abs(attempt.errorMs) <= TIMING_TOLERANCE ? 'from the beat' : attempt.errorMs < 0 ? 'early' : 'late'}`}` : missed ? 'No entrance detected' : 'Not yet judged';
  const description = `${noteName(note.note + transpose, mode)}, ${duration} ${note.duration === 1 ? 'beat' : 'beats'}, ${note.location}. ${result}.${roleDescription ? ` Role: ${roleDescription}.` : ''}`;
  return <Box position="absolute" left={`${(note.start - START) / LENGTH * 100}%`} width={`${note.duration / LENGTH * 100}%`} height="100%">
    <chakra.button type="button" data-melody-start={note.start}
      aria-label={`${running ? 'Cue' : 'Play'} melody ${description}`} title={description} textAlign="left" cursor="pointer"
      onClick={() => running ? onSeek(note.start) : onMelody(note)} _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400', outlineOffset: '-2px'}}
      width="100%" height="100%" borderWidth="1px" boxShadow={active ? 'inset 0 0 0 2px var(--chakra-colors-cyan-400)' : undefined} borderColor={active ? 'cyan.400' : 'border'} overflow="hidden">
      <MelodyStripGraphic note={note.note + transpose} start={note.start} duration={note.duration} mode={mode} attempt={attempt} missed={missed} freeTime={freeTime} active={active} roles={roles}/>
    </chakra.button>
    {roles?.map(segment => <MelodyRolePopover key={segment.start} note={note.note + transpose} segment={segment} start={note.start} duration={note.duration} mode={mode}/>)}
  </Box>;
});

export const PracticeHarmonyCell = memo(function PracticeHarmonyCell({chord, previous, mode, keyTranspose = 0, showTransitions, active, running, onSeek, onHarmony, connections, showCommon, showVoiceLeading, showGuides}: {
  chord: PracticeChord; previous?: PracticeChord; mode: LabelMode; keyTranspose?: number; showTransitions: boolean; active: boolean; running: boolean;
  onSeek: (beat: number) => void; onHarmony: (chord: PracticeChord) => void;
  connections: ChordConnections; showCommon: boolean; showVoiceLeading: boolean; showGuides: boolean;
}) {
  const {LENGTH, START, score} = usePracticeScore();
  const name = chordLabel(chord, mode);
  const keyName = `${pitchLabel(score.tonic + keyTranspose, mode)} ${score.quality}`;
  return <Box position="absolute" left={`${(chord.start - START) / LENGTH * 100}%`} width={`${chord.duration / LENGTH * 100}%`} height="100%">
    <chakra.button type="button" data-active-chord={active ? 'true' : undefined} data-harmony-start={chord.start}
      aria-label={`${running ? 'Cue' : 'Play'} chord ${name} in bar ${chord.bar}${chord.function ? `, function ${chord.function}` : ''}, key ${keyName}`} textAlign="left" cursor="pointer"
      title={`${name}${chord.function ? ` · ${chord.function}` : ''} · ${keyName} · bar ${chord.bar} · ${chord.duration} beats`}
      onClick={() => running ? onSeek(chord.start) : onHarmony(chord)} _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400', outlineOffset: '-2px'}}
      width="100%" height="100%" display="flex" flexDirection="column" alignItems="stretch" borderWidth="1px" borderBottomWidth={active ? '2px' : '1px'} borderColor={active ? 'fg.muted' : 'border'} bg={active ? 'bg.muted' : undefined} px={2} py={1} fontSize="sm">
      <Text as="span" display="block" fontSize="xs" lineHeight="18px" color="fg.muted">Bar {chord.bar}</Text>
      <Text as="span" display="block" lineHeight="20px">{name}</Text>
      <Box as="span" display="block" height="18px"/>
      <Box as="span" display="block" height="160px" flexShrink={0} width="100%" pointerEvents="none">
        <HarmonyStripGraphic chord={chord} previous={showTransitions ? previous : undefined} mode={mode} commonNotes={showCommon ? connections.common : undefined} guideNotes={showGuides ? connections.guides : undefined}/>
      </Box>
    </chakra.button>
    {chord.function && <ChordFunctionPopover keyTranspose={keyTranspose} analysis={chord.function} name={name} mode={mode}/>}
    {(showCommon || showVoiceLeading) && <ChordConnectionsPopover chord={chord} previous={previous} connections={connections} mode={mode} voiceLeading={showVoiceLeading}/>}
  </Box>;
});
