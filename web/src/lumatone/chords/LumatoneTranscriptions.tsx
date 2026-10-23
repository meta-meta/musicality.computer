import {Code, Flex, Heading, Stack} from '@chakra-ui/react';
import {useMemo, useState} from 'react';
import {NativeSelectField, NativeSelectRoot} from '../../components/chakra-ui/native-select.tsx';
import sWonderful from '../chordCharts/sWonderful.ts';
import stellaByStarlight from '../chordCharts/stellaByStarlight.ts';
import thisWillBeOurYear from '../chordCharts/thisWillBeOurYear.ts';
import {annotateChordTransitions} from './annotateChordTransitions.ts';
import {LumatoneChordCard} from './LumatoneChordCard.tsx';

type TranscriptionId = 'thisWillBeOurYear' | 'sWonderful' | 'stellaByStarlight';

const transcriptionOptions: {label: string; value: TranscriptionId}[] = [
  {label: 'This Will Be Our Year', value: 'thisWillBeOurYear'},
  {label: "S'Wonderful", value: 'sWonderful'},
  {label: 'Stella by Starlight', value: 'stellaByStarlight'},
];

export function LumatoneTranscriptions() {
  const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionId>('thisWillBeOurYear');
  const transpose = 57;

  const chordGroups = useMemo(() => {
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

      <NativeSelectRoot size="sm" width="18rem">
        <NativeSelectField
          value={selectedTranscription}
          onChange={(event) => {
            setSelectedTranscription(event.currentTarget.value as TranscriptionId);
          }}
          items={transcriptionOptions}
        />
      </NativeSelectRoot>

      {chordGroups.map(({chords, lyrics}, lineIndex) => (
        <Stack key={lineIndex}>
          <Flex gap={2} wrap="wrap">
            {chords.map((chordData, chordIndex) => (
              <LumatoneChordCard
                chordData={chordData}
                key={`${lineIndex}-${chordIndex}`}
              />
            ))}
          </Flex>
          <Code fontSize="xl" whiteSpace="pre">{lyrics}</Code>
        </Stack>
      ))}
    </Stack>
  );
}
