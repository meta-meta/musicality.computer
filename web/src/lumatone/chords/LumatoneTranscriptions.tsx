import {Box, chakra, Code, Flex, Heading, Stack, Text} from '@chakra-ui/react';
import {useMemo, useState} from 'react';
import {NativeSelectField, NativeSelectRoot} from '../../components/chakra-ui/native-select.tsx';
import sWonderful from '../chordCharts/sWonderful.ts';
import stellaByStarlight from '../chordCharts/stellaByStarlight.ts';
import thisWillBeOurYear from '../chordCharts/thisWillBeOurYear.ts';
import {annotateChordTransitions} from './annotateChordTransitions.ts';
import {LumatoneChordCard} from './LumatoneChordCard.tsx';
import {exerciseScores} from '../exercises/exerciseScores.ts';
import {ExerciseTranscriptions} from '../exercises/ExerciseTranscriptions.tsx';
import {useNoteAudition} from '../practice/useNoteAudition.ts';
import {noteName} from '../leadSheet/labels.ts';

type TranscriptionId = 'thisWillBeOurYear' | 'sWonderful' | 'stellaByStarlight' | `exercise:${string}`;

const chartAvailable: Record<string, boolean> = {thisWillBeOurYear: !!thisWillBeOurYear(57).length, sWonderful: !!sWonderful(57).length, stellaByStarlight: !!stellaByStarlight(57).length};
const transcriptionOptions: {label: string; value: TranscriptionId}[] = [
  {label: 'This Will Be Our Year', value: 'thisWillBeOurYear'},
  {label: "S'Wonderful", value: 'sWonderful'},
  {label: 'Stella by Starlight', value: 'stellaByStarlight'},
  ...exerciseScores.map(score => ({label: `Exercises · ${score.title}`, value: `exercise:${score.id}` as TranscriptionId})),
].filter(option => option.value.startsWith('exercise:') || chartAvailable[option.value]) as {label: string; value: TranscriptionId}[];

export function LumatoneTranscriptions() {
  const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionId>(transcriptionOptions[0]?.value ?? 'thisWillBeOurYear');
  const [error, setError] = useState('');
  const {playChord, playNote, releasePreview} = useNoteAudition(setError);
  const transpose = 57;
  const score = exerciseScores.find(item => selectedTranscription === `exercise:${item.id}`);

  const chordGroups = useMemo(() => {
    if (selectedTranscription.startsWith('exercise:')) return [];
    if (selectedTranscription === 'stellaByStarlight') {
      return annotateChordTransitions(stellaByStarlight(transpose));
    }
    if (selectedTranscription === 'sWonderful') {
      return annotateChordTransitions(sWonderful(transpose));
    }
    return annotateChordTransitions(thisWillBeOurYear(transpose));
  }, [selectedTranscription]);

  return (
    <Stack>
      <Heading size="md">Transcriptions:</Heading>
      {!transcriptionOptions.length && <Text>No local transcriptions are installed.</Text>}

      <NativeSelectRoot size="sm" width="min(100%, 30rem)">
        <NativeSelectField
          aria-label="Transcription"
          value={selectedTranscription}
          onChange={(event) => {
            releasePreview(); setError('');
            setSelectedTranscription(event.currentTarget.value as TranscriptionId);
          }}
          items={transcriptionOptions}
        />
      </NativeSelectRoot>

      <Text fontSize="sm" color="fg.muted">Click a chord card to hear its voicing, or a note hex to hear just that note.</Text>
      {error && <Text role="alert" color="red.500">{error}</Text>}
      {score && <ExerciseTranscriptions key={score.id} score={score} onPlayChord={playChord} onPlayNote={playNote} onSectionChange={releasePreview}/>}

      {chordGroups.map(({chords, lyrics}, lineIndex) => (
        <Stack key={lineIndex}>
          <Flex gap={2} wrap="wrap">
            {chords.map((chordData, chordIndex) => {
              const notes = [chordData.root, ...chordData.intervals.map(([q, r]) => chordData.root + 2 * q + 7 * r)];
              return <Box key={`${lineIndex}-${chordIndex}`} position="relative">
                <chakra.button type="button" position="absolute" inset={0} data-play-transcription-chord={`${lineIndex}-${chordIndex}`}
                aria-label={`Play chord: ${notes.map(note => noteName(note, 'jazz')).join(', ')}`} cursor="pointer" borderRadius="3xl" textAlign="inherit"
                _focusVisible={{outline: '2px solid', outlineColor: 'cyan.400', outlineOffset: '2px'}}
                onClick={() => void playChord(notes)}/>
                <Box position="relative" pointerEvents="none"><LumatoneChordCard chordData={chordData} onPlayNote={note => void playNote(note)}/></Box>
              </Box>;
            })}
          </Flex>
          <Code fontSize="xl" whiteSpace="pre">{lyrics}</Code>
        </Stack>
      ))}
    </Stack>
  );
}
