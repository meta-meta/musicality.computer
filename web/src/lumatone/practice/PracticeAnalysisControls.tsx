import {Box, Flex, Text} from '@chakra-ui/react';
import {memo, useState} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import {parsePhraseStarts} from './analysis.ts';
import type {AnalysisOptions} from './analysis.ts';

const choices: {key: keyof AnalysisOptions; label: string; group: string; help: string}[] = [
  {key: 'commonTones', label: 'Common tones', group: 'Harmony', help: 'Common tones: cyan outlines in harmony diagrams mark notes held at the same pitch and octave from the previous chord. Hover the held-note count beneath a diagram for details.'},
  {key: 'voiceLeading', label: 'Voice leading', group: 'Harmony', help: 'Voice leading: the held/step summary beneath each harmony diagram opens one minimum-motion pairing between the displayed voicings, including added and released notes.'},
  {key: 'guideTones', label: 'Guide tones', group: 'Harmony', help: 'Guide tones: gold dots mark thirds and sevenths in the harmony diagrams and main hex layout; other chord tones are dimmed.'},
  {key: 'destinations', label: 'Harmonic destinations', group: 'Harmony', help: 'Harmonic destinations: brackets above the harmony strip show suggested targets. ✓ means the target triad is reached next; ↪ means redirected. Hover a bracket to learn why the movement is implied.'},
  {key: 'melodicIntervals', label: 'Melodic intervals', group: 'Melody & form', help: 'Melodic intervals: an extra lane above the melody strip shows the interval from the previous attack, including direction and octave.'},
  {key: 'phrases', label: 'Phrases & motifs', group: 'Melody & form', help: 'Phrases & motifs: editable phrase brackets and repeated four-attack contour/rhythm patterns appear above the melody strip.'},
];

export const PracticeAnalysisControls = memo(function PracticeAnalysisControls({options, setOptions, phraseStarts, setPhraseStarts}: {
  options: AnalysisOptions; setOptions: Dispatch<SetStateAction<AnalysisOptions>>;
  phraseStarts: number[]; setPhraseStarts: Dispatch<SetStateAction<number[]>>;
}) {
  const [draft, setDraft] = useState(phraseStarts.join(', '));
  const [error, setError] = useState('');
  return <Box as="details" borderWidth="1px" borderRadius="md" p={3}>
    <Box as="summary" cursor="pointer" fontSize="sm">Analysis overlays</Box>
    <Flex gap={4} wrap="wrap" mt={3} fontSize="sm" align="start">
      {['Harmony', 'Melody & form'].map(group => <Box as="fieldset" key={group} flex="1 1 300px" minWidth={0}>
        <Box as="legend" fontWeight="semibold" mb={2}>{group}</Box>
        {choices.filter(choice => choice.group === group).map(choice => <Box key={choice.key} mb={2}>
          <Flex as="label" gap={2}>
            <input type="checkbox" checked={options[choice.key]} aria-describedby={options[choice.key] ? `analysis-help-${choice.key}` : undefined} onChange={event => setOptions(current => ({...current, [choice.key]: event.target.checked}))}/>{choice.label}
          </Flex>
          {options[choice.key] && <Text id={`analysis-help-${choice.key}`} fontSize="xs" color="fg.muted" mt={1}>{choice.help}</Text>}
        </Box>)}
      </Box>)}
    </Flex>
    {options.phrases && <Box mt={3}>
      <Flex gap={2} align="center" wrap="wrap" fontSize="sm">
        <label htmlFor="practice-phrase-starts">Phrase starts (bars)</label>
        <input id="practice-phrase-starts" value={draft} aria-invalid={Boolean(error)} aria-describedby={error ? 'practice-phrase-error' : undefined}
          onChange={event => {
            const value = event.target.value;
            setDraft(value); setError('');
            const parsed = parsePhraseStarts(value);
            if (parsed) setPhraseStarts(parsed);
          }}
          onBlur={() => {
            const parsed = parsePhraseStarts(draft);
            if (!parsed) {setError('Use bar numbers 1–32, separated by commas. The last valid grouping is still shown.'); return;}
            setDraft(parsed.join(', ')); setError('');
          }} style={{width: 'min(100%, 260px)'}}/>
      </Flex>
      <Text fontSize="xs" color="fg.muted" mt={1}>Starts with four-bar groups; valid edits update the brackets automatically. Motifs mark exact four-attack contour/rhythm matches, allowing transposition.</Text>
      {error && <Text id="practice-phrase-error" role="alert" fontSize="sm" color="red.500">{error}</Text>}
    </Box>}
  </Box>;
});
