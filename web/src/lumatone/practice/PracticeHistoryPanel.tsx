import {usePracticeScore} from './PracticeScoreContext.tsx';
import {Box, Button, Flex, Heading, Stack, Text} from '@chakra-ui/react';
import {memo, useMemo, useRef, useState} from 'react';
import {noteName, pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {isPracticeHit, TIMING_TOLERANCE} from './exercise.ts';
import {MAX_IMPORT_BYTES, summarisePracticeSession} from './practiceHistory.ts';
import type {PracticeHistoryData, PracticeSession} from './practiceHistory.ts';

const summaries = new WeakMap<PracticeSession, ReturnType<typeof summarisePracticeSession>>();
function summary(session: PracticeSession) {
  let result = summaries.get(session);
  if (!result) {result = summarisePracticeSession(session); summaries.set(session, result);}
  return result;
}
const percentage = (value: number, total: number) => total ? `${Math.round(value / total * 100)}%` : '—';
const dateLabel = (value: string) => new Date(value).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});

function download(raw: string, prefix: string) {
  const blob = new Blob([raw], {type: 'application/json'}), url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const now = new Date();
  anchor.download = `${prefix}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const PracticeHistoryPanel = memo(function PracticeHistoryPanel({data, error, recovery, activeId, running, mode, onExport, onImport}: {
  data: PracticeHistoryData; error: string; recovery: string; activeId: string | null; running: boolean; mode: LabelMode;
  onExport: () => string; onImport: (raw: string) => {sessions: number; total: number};
}) {
  const {score} = usePracticeScore();
  const [allTunes, setAllTunes] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');
  const [importError, setImportError] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => data.sessions.filter(session => allTunes || session.piece === score.id).map(session => ({session, metrics: summary(session)})), [data.sessions, allTunes, score.id]);
  const recent = rows.slice(0, 20).reverse();
  const session = data.sessions.find(item => item.id === selected);
  const judgements = useMemo(() => session?.judgements.filter(a => filter === 'pitch' ? !a.correctPitch : filter === 'timing' ? !a.freeTime && Math.abs(a.errorMs) > TIMING_TOLERANCE : filter === 'hits' ? isPracticeHit(a) : true).slice().reverse() ?? [], [session, filter]);
  const shown = judgements.slice(page * 50, page * 50 + 50);
  const points = recent.map(({metrics}, index) => `${30 + index * 520 / Math.max(1, recent.length - 1)},${105 - metrics.pitch / Math.max(1, metrics.notes) * 90}`).join(' ');

  return <Box as="details" borderWidth="1px" borderRadius="md" p={3} data-testid="practice-history">
    <Box as="summary" cursor="pointer" fontSize="sm">Practice history · {data.sessions.length} {data.sessions.length === 1 ? 'session' : 'sessions'}{activeId ? running ? ' · recording' : ' · paused' : ''}</Box>
    <Stack gap={3} mt={3}>
      <Text fontSize="sm" color="fg.muted">Judgements save automatically in this browser. No audio is stored. Each note/pass counts once in the summaries; corrections stay in the detail log. Notes without a detected judgement are not counted.</Text>
      <Flex gap={2} align="center" wrap="wrap">
        <Button size="sm" variant="outline" disabled={running || busy || !data.sessions.length} onClick={() => {try {download(onExport(), 'musicality-practice-history');} catch {setImportError('The history export could not be created.');}}}>Export JSON</Button>
        <Button size="sm" variant="outline" disabled={running || busy} onClick={() => file.current?.click()}>Import JSON</Button>
        <input ref={file} type="file" accept=".json,application/json" aria-label="Import practice history file" hidden disabled={running || busy} onChange={async event => {
          const chosen = event.target.files?.[0]; event.target.value = '';
          if (!chosen) return;
          setBusy(true); setImportError(''); setNotice('');
          try {
            if (chosen.size > MAX_IMPORT_BYTES) throw new Error('History file is too large (maximum 10 MB).');
            const result = onImport(await chosen.text());
            setNotice(`Merged ${result.sessions} imported sessions; ${result.total} sessions saved. Existing results were retained and duplicate judgements skipped.`);
          } catch (reason) {setImportError(`Import failed: ${reason instanceof Error ? reason.message : 'The file could not be read.'} Existing results are unchanged.`);}
          finally {setBusy(false);}
        }}/>
        {recovery && <Button size="sm" variant="outline" onClick={() => download(recovery, 'musicality-practice-history-recovery')}>Download recovery copy</Button>}
        {running && <Text fontSize="xs" color="fg.muted">Pause practice to import or export.</Text>}
      </Flex>
      {error && <Text role="alert" color="orange.500" fontSize="sm">{error}</Text>}
      {importError && <Text role="alert" color="red.500" fontSize="sm">{importError}</Text>}
      {notice && <Text role="status" fontSize="sm">{notice}</Text>}
      <label><input type="checkbox" checked={allTunes} onChange={event => {setAllTunes(event.target.checked); setSelected(null);}}/> Show history for all tunes</label>
      {!rows.length ? <Text fontSize="sm" color="fg.muted">No saved judgements yet. Listen to your flute during practice to start a history.</Text> : <>
        {recent.length >= 2 && <Box>
          <Text fontSize="xs" color="fg.muted">First-try pitch · last {recent.length} sessions, oldest → newest</Text>
          <svg role="img" aria-label="First-try pitch accuracy across recent sessions, from zero to one hundred percent" viewBox="0 0 570 125" style={{width: '100%', maxWidth: 650, height: 130}}>
            <text x={0} y={19} style={{fontSize: 10}} fill="currentColor">100</text><text x={12} y={109} style={{fontSize: 10}} fill="currentColor">0</text>
            <path d="M 30 15 H 550 M 30 105 H 550" stroke="currentColor" opacity={0.15}/>
            <polyline points={points} fill="none" stroke="var(--chakra-colors-cyan-600)" strokeWidth={2}/>
            {recent.map(({session, metrics}, index) => <circle key={session.id} cx={30 + index * 520 / Math.max(1, recent.length - 1)} cy={105 - metrics.pitch / Math.max(1, metrics.notes) * 90} r={3} fill="var(--chakra-colors-cyan-600)">
              <title>{`${dateLabel(session.startedAt)}: ${percentage(metrics.pitch, metrics.notes)} first-try pitch, ${session.settings.bpm} BPM, ${session.settings.freeTime ? 'free time' : 'timed'}`}</title>
            </circle>)}
          </svg>
        </Box>}
        <Box overflowX="auto">
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left'}}>
            <thead><tr>{['Session', 'Mode / tempo', 'Judged notes', 'First-try pitch', 'After corrections', 'On-time entrances', ''].map(label => <th key={label} style={{padding: 8, whiteSpace: 'nowrap'}}>{label}</th>)}</tr></thead>
            <tbody>{rows.slice(0, limit).map(({session, metrics}) => <tr key={session.id} data-history-session={session.id}>
              <td style={{padding: 8, whiteSpace: 'nowrap'}}>{session.title ?? session.piece}<br/>{dateLabel(session.startedAt)}<br/><Text as="span" color="fg.muted">{activeId === session.id ? running ? 'Recording' : 'Paused' : session.endedAt ? 'Finished' : 'Saved'}</Text></td>
              <td style={{padding: 8, whiteSpace: 'nowrap'}}>{session.settings.freeTime ? 'Free time' : 'Timed'} · {session.settings.bpm} BPM</td>
              <td style={{padding: 8}}>{metrics.notes}</td><td style={{padding: 8}}>{percentage(metrics.pitch, metrics.notes)}</td>
              <td style={{padding: 8}}>{percentage(metrics.recovered, metrics.notes)}</td>
              <td style={{padding: 8}}>{percentage(metrics.onTime, metrics.timed)}{metrics.meanTiming !== null && <><br/>{Math.round(metrics.meanTiming)} ms mean error</>}</td>
              <td style={{padding: 8}}><Button size="xs" variant="outline" aria-label={`Review practice session ${dateLabel(session.startedAt)}`} onClick={() => {setSelected(session.id); setPage(0);}}>Review</Button></td>
            </tr>)}</tbody>
          </table>
        </Box>
        {rows.length > limit && <Button size="sm" variant="ghost" alignSelf="start" onClick={() => setLimit(value => value + 20)}>Show more sessions</Button>}
        <Text fontSize="xs" color="fg.muted">First-try pitch uses the first judgement for each note/pass. After corrections counts any correct-pitch judgement. On-time entrances uses ±{TIMING_TOLERANCE} ms independently of pitch; free-time sessions have no timing score. Compare sessions for the same tune with similar tempos and ranges.</Text>
      </>}
      {session && <Stack gap={2} borderTopWidth="1px" pt={3}>
        <Heading size="sm">Session · {dateLabel(session.startedAt)}</Heading>
        <Text fontSize="xs" color="fg.muted">{session.title ?? session.piece} · {pitchLabel((session.tonic ?? 10) + (session.settings.keyTranspose ?? 0), mode)} · {session.settings.bpm} BPM · melody transposition {session.settings.transpose} semitones · {session.settings.loop ? `loop ${session.settings.loopStart ?? -1} to ${session.settings.loopEnd ?? 128} beats` : 'loop off'} · octave-up acceptance {session.settings.allowLowOctaveUp ? 'on' : 'off'} · input correction {session.settings.latencyMs} ms</Text>
        <Flex as="label" gap={2} fontSize="sm">Show
          <select aria-label="History judgement filter" value={filter} onChange={event => {setFilter(event.target.value); setPage(0);}}>
            <option value="all">All judgements</option><option value="pitch">Pitch errors</option><option value="timing">Early / late</option><option value="hits">Full hits</option>
          </select>
        </Flex>
        <Box overflowX="auto">
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left'}}>
            <thead><tr>{['Time', 'Pass / location', 'Target', 'Played', 'Pitch', 'Timing', 'Tuning'].map(label => <th key={label} style={{padding: 6, whiteSpace: 'nowrap'}}>{label}</th>)}</tr></thead>
            <tbody>{shown.map(a => <tr key={a.id} data-history-judgement={a.id}>
              <td style={{padding: 6, whiteSpace: 'nowrap'}}>{new Date(a.at).toLocaleTimeString()}</td><td style={{padding: 6, whiteSpace: 'nowrap'}}>Pass {a.cycle} · {a.location}</td>
              <td style={{padding: 6}}>{noteName(a.expectedNote, mode)}</td><td style={{padding: 6}}>{noteName(a.note, mode)}</td>
              <td style={{padding: 6, color: a.correctPitch ? 'var(--chakra-colors-green-600)' : 'var(--chakra-colors-orange-600)'}}>{a.correctPitch ? 'Correct' : 'Different / out of tune'}</td>
              <td style={{padding: 6, whiteSpace: 'nowrap'}} title={`Input correction: ${a.latencyMs} ms`}>{a.freeTime ? 'Free time' : `${Math.round(Math.abs(a.errorMs))} ms ${Math.abs(a.errorMs) <= TIMING_TOLERANCE ? 'on time' : a.errorMs < 0 ? 'early' : 'late'}`}</td>
              <td style={{padding: 6, whiteSpace: 'nowrap'}}>{a.cents > 0 ? '+' : ''}{Math.round(a.cents)} ¢</td>
            </tr>)}</tbody>
          </table>
        </Box>
        {!shown.length && <Text fontSize="sm" color="fg.muted">No judgements match this filter.</Text>}
        <Flex gap={2} align="center">
          <Button size="xs" variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Newer</Button>
          <Text fontSize="xs">{judgements.length ? `${page * 50 + 1}–${Math.min(page * 50 + 50, judgements.length)} of ${judgements.length}` : '0 judgements'}</Text>
          <Button size="xs" variant="outline" disabled={(page + 1) * 50 >= judgements.length} onClick={() => setPage(value => value + 1)}>Older</Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected(null)}>Close review</Button>
        </Flex>
      </Stack>}
    </Stack>
  </Box>;
});
