import {usePracticeScore} from './PracticeScoreContext.tsx';
import {Box, Flex, Text} from '@chakra-ui/react';
import {memo, useMemo} from 'react';
import {noteName} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';

import {harmonicGroups, melodicMotions, motifs, motionLabel, phraseGroups} from './analysis.ts';
import {transposeChord} from './transposition.ts';
import {HarmonicDestinationPopover} from './HarmonicDestinationPopover.tsx';

export const PhraseAnalysisLanes = memo(function PhraseAnalysisLanes({starts, mode}: {starts: number[]; mode: LabelMode}) {
  const {beatLabel, LENGTH, START} = usePracticeScore();
  const phrases = useMemo(() => phraseGroups(starts), [starts]);
  return <>
    <Flex align="center" role="group" aria-label="Editable phrase groups">
      <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Phrases</Text>
      <Box position="relative" flex={1} height="26px">
        {phrases.map(phrase => <Box key={phrase.start} data-phrase-start={phrase.bar} role="img" aria-label={`Phrase ${phrase.index}: bars ${phrase.bar}–${phrase.lastBar}`} title={`Editable group: bars ${phrase.bar}–${phrase.lastBar}${phrase.start < 0 ? ', including the pickup' : ''}`}
          position="absolute" left={`${(phrase.start - START) / LENGTH * 100}%`} width={`${(phrase.end - phrase.start) / LENGTH * 100}%`} height="23px" px={2} borderTopWidth="2px" borderLeftWidth="1px" borderRightWidth="1px" borderColor="cyan.600" fontSize="xs">
          P{phrase.index} · {phrase.bar}–{phrase.lastBar}
        </Box>)}
      </Box>
    </Flex>
    <Flex align="center" role="group" aria-label="Repeated melodic motifs">
      <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Motifs</Text>
      <Box position="relative" flex={1} height="24px">
        {motifs.map(motif => <Box key={motif.start} data-motif={motif.label} role="img"
          aria-label={`${motif.label}: four-attack contour/rhythm match to ${beatLabel(motif.reference)}; transposition ${motionLabel(motif.transposition, mode)}`}
          title={`${motif.label}: same four-attack contour and durations as ${beatLabel(motif.reference)}. Transposition: ${motionLabel(motif.transposition, mode)}.`}
          position="absolute" left={`${(motif.start - START) / LENGTH * 100}%`} width={`${(motif.end - motif.start) / LENGTH * 100}%`} height="21px" px={2} borderBottomWidth="2px" borderColor="purple.500" bg="bg.muted" fontSize="xs">
          {motif.label}
        </Box>)}
      </Box>
    </Flex>
  </>;
});

export const MelodicIntervalLane = memo(function MelodicIntervalLane({mode, transpose}: {mode: LabelMode; transpose: number}) {
  const {LENGTH, START} = usePracticeScore();
  return <Flex align="center" role="group" aria-label="Intervals from previous melody attack">
    <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Intervals</Text>
    <Box position="relative" flex={1} height="25px">
      {melodicMotions.map(({note, previous, delta}) => {
        const description = previous ? `${noteName(previous.note + transpose, mode)} → ${noteName(note.note + transpose, mode)}: ${motionLabel(delta, mode)} (${Math.abs(delta)} semitones ${delta < 0 ? 'down' : delta > 0 ? 'up' : 'repeated'})` : 'First melody attack';
        return <Box key={note.start} data-melodic-interval={previous ? motionLabel(delta, mode) : 'none'} role="img" aria-label={description} title={description}
          position="absolute" left={`${(note.start - START) / LENGTH * 100}%`} width={`${note.duration / LENGTH * 100}%`} height="23px" textAlign="center" fontSize="10px" lineHeight="23px" whiteSpace="nowrap" borderBottomWidth="1px" color="fg.muted">
          {previous ? motionLabel(delta, mode) : '—'}
        </Box>;
      })}
    </Box>
  </Flex>;
});

export const HarmonicDestinationLane = memo(function HarmonicDestinationLane({mode, keyTranspose = 0}: {mode: LabelMode; keyTranspose?: number}) {
  const groups = useMemo(() => harmonicGroups.map(group => ({...group, tonic: group.tonic + keyTranspose,
    dominant: transposeChord(group.dominant, keyTranspose), preparation: group.preparation ? transposeChord(group.preparation, keyTranspose) : undefined,
    next: group.next ? transposeChord(group.next, keyTranspose) : undefined})), [keyTranspose]);
  return <Flex align="center" role="group" aria-label="Local harmonic destinations">
    <Text width="72px" flexShrink={0} position="sticky" left={0} bg="bg" zIndex={3} fontSize="xs" color="fg.muted">Toward</Text>
    <Box position="relative" flex={1} height="27px">
      {groups.map(group => <HarmonicDestinationPopover key={group.start} group={group} mode={mode} keyTranspose={keyTranspose} />)}
    </Box>
  </Flex>;
});
