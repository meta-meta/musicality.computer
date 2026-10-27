import {Box, Button, chakra, Flex, Heading, Link, Stack, Text} from '@chakra-ui/react';
import {useMemo, useState} from 'react';
import {NativeSelectField, NativeSelectRoot} from '../../components/chakra-ui/native-select.tsx';
import {LumatoneChordCard} from '../chords/LumatoneChordCard.tsx';
import {chordLabel, noteName, pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {exerciseDiagram} from './exerciseScores.ts';
import type {ExerciseScore} from './exerciseScores.ts';

export function ExerciseTranscriptions({score, onPlayChord, onPlayNote, onSectionChange}: {score: ExerciseScore; onPlayChord: (notes: number[]) => Promise<void>; onPlayNote: (note: number) => Promise<void>; onSectionChange: () => void}) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [mode, setMode] = useState<LabelMode>('dozenal');
  const [transitions, setTransitions] = useState(false);
  const section = score.sections[sectionIndex];
  const diagrams = useMemo(() => section.events.map((event, index) => exerciseDiagram(event, transitions ? section.events[index - 1] : undefined)), [section, transitions]);
  return <Stack gap={3} data-exercise-score={score.id}>
    <Heading size="md">{score.title}</Heading>
    <Text fontSize="sm" color="fg.muted">Exercises by Dustin Getz · Lumatone transcription</Text>
    <Flex gap={3} wrap="wrap" align="center">
      <NativeSelectRoot size="sm" width="min(100%, 30rem)">
        <NativeSelectField aria-label="Exercise section" value={sectionIndex} items={score.sections.map((item, index) => ({label: item.title, value: String(index)}))}
          onChange={event => {onSectionChange(); setSectionIndex(Number(event.currentTarget.value));}}/>
      </NativeSelectRoot>
      <Button size="sm" variant="outline" onClick={() => setMode(current => current === 'dozenal' ? 'jazz' : 'dozenal')}>Labels: {mode === 'dozenal' ? 'Dozenal' : 'Jazz'}</Button>
      <Flex as="label" gap={2} fontSize="sm"><input type="checkbox" checked={transitions} onChange={event => setTransitions(event.target.checked)}/>Previous voicing &amp; root arrows</Flex>
      <Link href={`/lumatone-exercises/${score.source}#page=${section.events[0].page}`} target="_blank" rel="noreferrer" textDecoration="underline">Source PDF</Link>
    </Flex>
    <Text fontSize="sm" color="fg.muted">Written pitches and octaves are preserved, including pedals and rootless voicings. Each card is one attack; its bar, beat, and duration follow the score. A root omitted in the score is not added to the diagram.</Text>
    <Flex gap={3} wrap="wrap">
      {section.events.map((event, index) => {
        const previous = transitions ? section.events[index - 1] : undefined;
        const omitRoot = !event.notes.includes(event.root);
        const name = mode === 'jazz' ? event.name : chordLabel({name: event.name, notes: [{note: event.root, root: true}, ...event.notes.filter(note => note !== event.root).map(note => ({note, root: false}))]}, mode);
        return <Box key={`${event.bar}-${event.beat}`} data-exercise-event={`${event.bar}:${event.beat}`} borderWidth="1px" borderRadius="xl" p={3} width="18rem" maxWidth="100%" fontFamily="'JetBrains Mono', monospace" position="relative">
          <chakra.button type="button" position="absolute" inset={0} borderRadius="xl" cursor="pointer" _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400', outlineOffset: '2px'}}
          onClick={() => void onPlayChord(event.notes)}
          aria-label={`Play ${event.name}, bar ${event.bar}, beat ${event.beat}, ${event.duration} beats. Written notes: ${event.notes.map(note => noteName(note, 'jazz')).join(', ')}`}/>
          <Box position="relative" pointerEvents="none">
          <Text fontSize="xs" color="fg.muted">Bar {event.bar} · beat {event.beat} · {event.duration} {event.duration === 1 ? 'beat' : 'beats'}</Text>
          <Text fontSize="lg" fontWeight="semibold" mt={1}>{name}</Text>
          {mode === 'dozenal' && <Text fontSize="xs" color="fg.muted">{event.name}</Text>}
          <Box height="180px" mt={2}>
            <LumatoneChordCard chordData={diagrams[index]} diagramOnly labelMode={mode} omitRoot={omitRoot} fromOmitRoot={previous ? !previous.notes.includes(previous.root) : true} onPlayNote={note => void onPlayNote(note)}/>
          </Box>
          <Text fontSize="xs" color="fg.muted" mt={1}>{event.notes.map(note => noteName(note, mode)).join(' · ')}</Text>
          {omitRoot && <Text fontSize="xs" color="fg.muted">Root {pitchLabel(event.root, mode)} omitted</Text>}
          {event.upperStructure && <Text fontSize="xs" color="fg.muted">RH triad: {event.upperStructure}</Text>}
          {event.mode && <Text fontSize="xs" color="fg.muted">{event.mode}</Text>}
          </Box>
        </Box>;
      })}
    </Flex>
  </Stack>;
}
