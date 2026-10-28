import {Box, Button, Flex, Heading, Stack, Text} from '@chakra-ui/react';
import {memo, useEffect, useMemo, useState} from 'react';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import type {PracticeHistoryData} from './practiceHistory.ts';
import {suggestPracticeLoops} from './practiceSuggestions.ts';
import type {PracticeFocus, PracticeGoal} from './practiceSuggestions.ts';

const descriptions = {
  balanced: 'Mix a familiar passage, a near miss, and a recurring difficulty when the evidence supports them.',
  polish: 'Work on passages that are mostly successful, with a few details to smooth out.',
  challenge: 'Spend focused time on passages with errors across at least three separate passes.',
  confidence: 'Revisit passages that are already going well. Useful for warming up or ending on a comfortable passage.',
};
const labels = {confidence:'Build confidence',polish:'Polish a near miss',challenge:'Work through a trouble spot',explore:'Keep exploring'};

export const PracticeSuggestions = memo(function PracticeSuggestions({data,running,bpm,transpose,keyTranspose,freeTime,allowLowOctaveUp,onApply}: {
  data: PracticeHistoryData; running: boolean; bpm: number; transpose: number; keyTranspose: number;
  freeTime: boolean; allowLowOctaveUp: boolean; onApply: (start: number,end: number) => void;
}) {
  const {score} = usePracticeScore();
  const [goal,setGoal] = useState<PracticeGoal>('balanced');
  const [focus,setFocus] = useState<PracticeFocus>('both');
  const [bars,setBars] = useState(2);
  const [recentSessions,setRecentSessions] = useState(5);
  const [matchSettings,setMatchSettings] = useState(true);
  const [snapshot,setSnapshot] = useState(data);
  const [notice,setNotice] = useState('');
  // Keep ranking/storage work off the playback clock; refresh on pause or stop.
  useEffect(() => {if (!running) setSnapshot(data);},[data,running]);
  const result = useMemo(() => suggestPracticeLoops(score,snapshot,{goal,focus,bars,recentSessions,matchSettings,
    bpm,transpose,keyTranspose,freeTime,allowLowOctaveUp}),
    [score,snapshot,goal,focus,bars,recentSessions,matchSettings,bpm,transpose,keyTranspose,freeTime,allowLowOctaveUp]);
  return <Box borderWidth="1px" borderRadius="md" p={3} data-testid="practice-suggestions">
    <details open>
      <summary style={{cursor:'pointer'}}>Suggested practice loops</summary>
      <Stack gap={3} mt={3}>
        <Text fontSize="sm" color="fg.muted">Choose what feels useful today. These are suggestions from your recent judgements, not a grade.</Text>
        <Flex gap={4} wrap="wrap" fontSize="sm">
          <label>Work on <select aria-label="Practice goal" value={goal} onChange={event => setGoal(event.target.value as PracticeGoal)}>
            <option value="balanced">Balanced mix</option><option value="polish">Polish near misses</option>
            <option value="challenge">Recurring trouble spots</option><option value="confidence">Build confidence</option>
          </select></label>
          <label>Judgements <select aria-label="Practice focus" value={focus} onChange={event => setFocus(event.target.value as PracticeFocus)}>
            <option value="both">Pitch and timing</option><option value="pitch">Pitch</option><option value="timing">Timing</option>
          </select></label>
          <label>Loop length <select aria-label="Suggested loop length" value={bars} onChange={event => setBars(Number(event.target.value))}>
            {[1,2,4].map(value => <option key={value} value={value}>{value} {value===1?'bar':'bars'}</option>)}
          </select></label>
          <label>History <select aria-label="Suggestion history window" value={recentSessions} onChange={event => setRecentSessions(Number(event.target.value))}>
            {[5,10,20].map(value => <option key={value} value={value}>Last {value} matching sessions</option>)}
          </select></label>
        </Flex>
        <Text fontSize="sm">{descriptions[goal]}</Text>
        <label style={{fontSize:12}}><input type="checkbox" checked={matchSettings} onChange={event => setMatchSettings(event.target.checked)}/> Match current key, register, mode, octave acceptance, and tempo within 10 BPM</label>
        {!matchSettings && <Text fontSize="xs" color="orange.500">Results combine different keys, registers, tempos, and practice modes.</Text>}
        <Text fontSize="xs" color="fg.muted">{result.sessions} matching sessions · {result.samples} judged note/pass attempts. First judgement per note/pass; latest 12 attempts per note. Unjudged notes are unknown, not mistakes. Timing is ignored for free-time attempts.{running ? ' Suggestions refresh when you pause.' : ''}</Text>
        {!result.suggestions.length && <Text fontSize="sm" color="fg.muted" data-testid="no-loop-suggestions">
          {!result.samples ? focus==='timing' ? 'No comparable timed judgements. Free-time practice has no timing score; use timed practice or choose Pitch.' : 'No comparable judgements yet. Practice with flute listening enabled, or broaden the settings filter.'
            : goal==='challenge' ? 'No recurring trouble spots meet this threshold yet. Look for three separate passes with errors, or try another goal.'
              : goal==='polish' ? 'No near-miss passages meet this threshold yet. Try Balanced mix, or gather a few more passes.'
                : goal==='confidence' ? 'No familiar passages meet this threshold yet. Try a shorter loop, Pitch focus, or Balanced mix.'
                  : 'More evidence is needed: play at least two passes through a passage, or try a shorter loop.'}
        </Text>}
        <Flex gap={3} wrap="wrap">
          {result.suggestions.map(item => {
            const range = item.firstBar===item.lastBar ? `Bar ${item.firstBar}` : `Bars ${item.firstBar}–${item.lastBar}`;
            return <Stack key={`${item.start}:${item.end}`} flex="1 1 240px" borderWidth="1px" borderRadius="sm" p={3} gap={2}>
              <Heading size="sm">{range} · {labels[item.kind]}</Heading>
              <Text fontSize="sm">{item.successes}/{item.tries} first-try successes ({Math.round(item.accuracy*100)}%) across {item.passes} passes.</Text>
              <Text fontSize="xs" color="fg.muted">{item.pitchErrors} pitch errors · {item.timingErrors} early/late entrances · errors on {item.failedPasses} passes. {item.observed}/{item.notes} melody attacks have judgements.</Text>
              <Button size="sm" alignSelf="start" disabled={running} aria-label={`Use suggested loop ${range}`} onClick={() => {
                onApply(item.start,item.end);setNotice(`${range} loop set. Press Space or Play when ready.`);
              }}>Use loop</Button>
            </Stack>;
          })}
        </Flex>
        <Box as="details" fontSize="xs" color="fg.muted"><summary>How suggestions are chosen</summary>
          <Text>At least two passes are needed. Confidence: at least 85% success. Near misses: 65–99%. Both need judgements for at least half the passage. Trouble spots: below 65%, with errors on at least three passes. Balanced mix avoids overlapping loops and may offer fewer than three. These thresholds are adjustable design choices, not a diagnosis of your ability.</Text>
        </Box>
        {running && <Text fontSize="xs" color="fg.muted">Pause to apply a suggested loop.</Text>}
        {notice && <Text role="status" fontSize="sm">{notice}</Text>}
        {result.stale>0 && <Text fontSize="xs" color="fg.muted">Some saved judgements no longer match this score and were left out.</Text>}
      </Stack>
    </details>
  </Box>;
});
