import {Box, Button, Flex, Heading, Link, Stack, Text} from '@chakra-ui/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import type {LabelMode} from './lumatone/leadSheet/labels.ts';
import {judgeEntrance, recordPracticeAttempt} from './lumatone/practice/exercise.ts';
import type {Attempt} from './lumatone/practice/exercise.ts';
import {PracticeHexMap} from './lumatone/practice/PracticeHexMap.tsx';
import {PracticeTuner} from './lumatone/practice/PracticeTuner.tsx';
import {PracticeJudgement} from './lumatone/practice/PracticeJudgement.tsx';
import {useFluteInput} from './lumatone/practice/useFluteInput.ts';
import {useMelodyPlayback} from './lumatone/practice/useMelodyPlayback.ts';
import {PracticeLyrics} from './lumatone/practice/PracticeLyrics.tsx';
import {PracticeTimeline} from './lumatone/practice/PracticeTimeline.tsx';
import {PracticeAnalysisControls} from './lumatone/practice/PracticeAnalysisControls.tsx';
import {defaultAnalysis, defaultPhraseStarts} from './lumatone/practice/analysis.ts';
import {usePracticeShortcuts} from './lumatone/practice/usePracticeShortcuts.ts';
import {adjacentLoopPoint} from './lumatone/practice/navigation.ts';
import {upcomingAttacks} from './lumatone/practice/lookahead.ts';
import {usePracticeHistory} from './lumatone/practice/usePracticeHistory.ts';
import {PracticeSuggestions} from './lumatone/practice/PracticeSuggestions.tsx';
import {PracticeHistoryPanel} from './lumatone/practice/PracticeHistoryPanel.tsx';
import MidiConfig from './MidiConfig.tsx';
import {AccordionItem, AccordionItemContent, AccordionItemTrigger, AccordionRoot} from './components/chakra-ui/accordion.tsx';
import {usePracticeMidi} from './lumatone/practice/usePracticeMidi.ts';
import {transposeChord} from './lumatone/practice/transposition.ts';
import {PracticeScoreContext, usePracticeScore} from './lumatone/practice/PracticeScoreContext.tsx';
import {practiceScores, stellaScore, loadPracticeScore} from './lumatone/practice/scores.ts';
import importReport from './lumatone/practice/openbook/catalog.report.json';
import effendiReport from './lumatone/practice/effendi/catalog.report.json';
import wikifoniaReport from './lumatone/practice/wikifonia/catalog.report.json';
import {pitchLabel} from './lumatone/leadSheet/labels.ts';
function PracticePiece() {
  const {score, START, END, exercise, harmonies} = usePracticeScore();
  const midiNotes = usePracticeMidi();
  const [bpm, setBpm] = useState(80);
  const [register, setRegister] = useState(0);
  const [key, setKey] = useState(score.tonic);
  const keyTranspose = ((key - score.tonic + 18) % 12) - 6;
  const transpose = register + keyTranspose;
  const pieceHarmonies = useMemo(() => harmonies.map(chord => transposeChord(chord, keyTranspose)), [keyTranspose, harmonies]);
  const [guide, setGuide] = useState(true);
  const [metronome, setMetronome] = useState(false);
  const [followFlute, setFollowFlute] = useState(false);
  const [allowLowOctaveUp, setAllowLowOctaveUp] = useState(true);
  const [showLyrics, setShowLyrics] = useState(true);
  const [showMelody, setShowMelody] = useState(true);
  const [showHarmony, setShowHarmony] = useState(score.chords.length > 0);
  const [showMelodyRoles, setShowMelodyRoles] = useState(score.chords.length > 0);
  const [showChordTransitions, setShowChordTransitions] = useState(true);
  const [lookahead, setLookahead] = useState(3);
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [phraseStarts, setPhraseStarts] = useState(defaultPhraseStarts);
  const [harmonySound, setHarmonySound] = useState(score.chords.length > 0);
  const [harmonyVolume, setHarmonyVolume] = useState(35);
  const [loop, setLoop] = useState(true);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const changeLoopStart = (value: number | null) => {
    const point = value === null ? null : Math.max(START, Math.min(END - 1 / 6, value));
    setLoopStart(point);
    if (point !== null && loopEnd !== null && point >= loopEnd) setLoopEnd(null);
  };
  const changeLoopEnd = (value: number | null) => {
    const point = value === null ? null : Math.max(START + 1 / 6, Math.min(END, value));
    setLoopEnd(point);
    if (point !== null && loopStart !== null && point <= loopStart) setLoopStart(null);
  };
  const [mode, setMode] = useState<LabelMode>('dozenal');
  const [latency, setLatency] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const [betweenTargets, setBetweenTargets] = useState(false);
  const playback = useMelodyPlayback({bpm, transpose, harmonyTranspose: keyTranspose, guide, metronome, loop, loopStart, loopEnd, harmonySound, harmonyVolume, followFlute, allowLowOctaveUp});
  const history = usePracticeHistory({bpm, transpose, keyTranspose, freeTime: followFlute, allowLowOctaveUp, loop, loopStart, loopEnd, latencyMs: latency});
  useEffect(() => {setAttempts({}); setLastAttempt(null); setBetweenTargets(false);}, [bpm, transpose, loopStart, loopEnd, followFlute, allowLowOctaveUp]);
  const microphone = useFluteInput(entrance => {
    if (followFlute) return;
    const position = playback.positionAt(entrance.time - latency);
    if (!position || position.beat < position.entryBeat - 0.5) return;
    const attempt = judgeEntrance(position.beat, entrance.pitch.note, entrance.pitch.cents, bpm, transpose,
      {melody: exercise, pass: position.pass, entryBeat: position.entryBeat, loop, loopStart: loopStart ?? START, loopEnd: position.endBeat, next: position.next, allowLowOctaveUp});
    setLastAttempt(attempt);
    setBetweenTargets(!attempt);
    if (attempt) {
      setAttempts(current => recordPracticeAttempt(current, attempt));
      history.record(attempt);
    }
  }, (reading, articulation) => {
    if (!followFlute || !reading) return;
    const attempt = playback.followPitch(reading.pitch.note, reading.pitch.cents, reading.time, articulation);
    if (!attempt) return;
    setLastAttempt(attempt);
    setBetweenTargets(false);
    setAttempts(current => recordPracticeAttempt(current, attempt));
    history.record(attempt, articulation);
  });
  const {running, stop} = playback;
  const {finish: finishHistory} = history;
  const suggestionSeek = useRef(playback.seek); suggestionSeek.current = playback.seek;
  const applySuggestedLoop = useCallback((start: number,end: number) => {
    stop(); finishHistory();
    setLoopStart(start); setLoopEnd(end); setLoop(true);
    suggestionSeek.current(start);
  },[stop,finishHistory]);
  useEffect(() => {
    if (followFlute && running && microphone.status === 'off') stop();
  }, [followFlute, running, microphone.status, stop]);
  useEffect(() => {setLastAttempt(null); setBetweenTargets(false);}, [playback.pass]);
  useEffect(() => {if (!playback.running && !playback.paused) finishHistory();}, [playback.running, playback.paused, finishHistory]);
  const beat = playback.beat;
  const countIn = playback.running && beat < playback.entryBeat;
  const harmony = !countIn ? pieceHarmonies.find(chord => beat >= chord.start && beat < chord.start + chord.duration)
    ?? (!playback.running && beat < 0 ? pieceHarmonies[0] : undefined) : undefined;
  const target = !countIn ? exercise.find(note => beat >= note.start - 1e-7 && beat < note.start + note.duration - 1e-7) : undefined;
  const targetIndex = target ? exercise.indexOf(target) : -1;
  const targetAttempt = attempts[`${playback.pass}-${targetIndex}`];
  const targetHit = playback.running && Boolean(targetAttempt?.correctPitch);
  const futureAttacks = playback.running || playback.paused ? upcomingAttacks(beat, playback.entryBeat, playback.endBeat, lookahead,
    loop ? {start: loopStart ?? START, end: loopEnd ?? END} : null, playback.pass, exercise) : [];
  const noteStart = target ? Math.max(target.start, playback.entryBeat) : beat;
  const noteEnd = target ? Math.min(target.start + target.duration, playback.endBeat) : beat;
  const progress = target && noteEnd > noteStart ? (beat - noteStart) / (noteEnd - noteStart) : 0;
  const pitch = microphone.pitch;
  const togglePlayback = async () => {
    if (microphone.status === 'starting') return;
    if (playback.running) {playback.pause(); return;}
    if (followFlute && microphone.status !== 'listening' && !await microphone.start()) return;
    if (playback.paused) {await playback.resume(); return;}
    setAttempts({}); setLastAttempt(null); setBetweenTargets(false);
    history.begin();
    await playback.start();
  };
  const navigationBeat = playback.pendingBeat ?? Math.max(beat, playback.entryBeat);
  const goBack = () => playback.seek(adjacentLoopPoint(navigationBeat, -1, loopStart, loopEnd, score));
  usePracticeShortcuts({beat: navigationBeat, loopStart, loopEnd, onToggle: () => void togglePlayback(), onSeek: playback.seek,
    onPlayChord: () => {if (harmony) void playback.playChord(harmony.notes.map(note => note.note));}});
  return (
    <Stack p={3} gap={4} maxWidth="1200px" mx="auto" fontFamily="'JetBrains Mono', monospace">
      <Link asChild textDecoration="underline" alignSelf="start"><RouterLink to="/lumatone">Back to Lumatone</RouterLink></Link>
      <Heading as="h1">Flute on the hexes</Heading>
      <Text>{score.title} · {score.composer} · {score.bars.length} bars. Follow the target and watch your tuning indicator.</Text>
      <AccordionRoot collapsible lazyMount={false} unmountOnExit={false}>
        <AccordionItem value="midi">
          <AccordionItemTrigger>MIDI configuration</AccordionItemTrigger>
          <AccordionItemContent>
            <MidiConfig/>
            <Text fontSize="xs" color="fg.muted" mt={2}>Select Lumatone In to highlight held notes on the hex layout. MIDI input displays notes independently of flute feedback.</Text>
          </AccordionItemContent>
        </AccordionItem>
      </AccordionRoot>
      <Flex gap={3} align="center" wrap="wrap">
        <Button disabled={microphone.status === 'starting'} onClick={() => void togglePlayback()}>{playback.running ? 'Pause practice' : playback.paused ? 'Resume practice' : 'Start practice'}</Button>
        <Button variant="outline" disabled={microphone.status === 'starting'} onClick={() => {
          if (microphone.status === 'listening') microphone.stop();
          else void microphone.start();
        }}>{microphone.status === 'starting' ? 'Opening microphone…' : microphone.status === 'listening' ? 'Stop microphone' : 'Listen to flute'}</Button>
      </Flex>
      <Flex gap={3} wrap="wrap" align="stretch">
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Playback</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={2} align="center">Tempo
          <input aria-label="Tempo" type="number" min={40} max={180} defaultValue={80} disabled={playback.running} style={{width: 65}} onBlur={event => {
            const value = Math.max(40, Math.min(180, Number(event.target.value) || 80));
            setBpm(value); event.target.value = String(value);
          }}/> BPM
        </Flex>
        <Flex as="label" gap={2} align="center">Key
          <select aria-label="Key" value={key} disabled={playback.running} onChange={event => setKey(Number(event.target.value))}>
            {Array.from({length: 12}, (_, tonic) => <option key={tonic} value={tonic}>{pitchLabel(tonic, mode)} {score.quality}</option>)}
          </select>
        </Flex>
        <Flex as="label" gap={2} align="center">Register
          <select aria-label="Register" value={register} disabled={playback.running} onChange={event => setRegister(Number(event.target.value))}>
            <option value={-12}>Octave below</option><option value={0}>Original</option>
            <option value={12}>Octave above</option><option value={24}>Two octaves above</option>
          </select>
        </Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={loop} disabled={playback.running} onChange={event => setLoop(event.target.checked)}/>Loop playback</Flex>
        </Flex>
      </Box>
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Flute input</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={2}><input type="checkbox" checked={followFlute} disabled={playback.running} onChange={event => setFollowFlute(event.target.checked)}/>Follow flute (free time)</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={allowLowOctaveUp} disabled={playback.running} onChange={event => setAllowLowOctaveUp(event.target.checked)}/>Accept octave up below C4</Flex>
        <Flex as="label" gap={2} align="center">Input timing correction
          <input aria-label="Input timing correction" type="number" min={-300} max={500} step={10} value={latency} disabled={followFlute} style={{width: 75}} onChange={event => setLatency(Math.max(-300, Math.min(500, Number(event.target.value) || 0)))}/> ms
        </Flex>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mt={2}>Positive timing correction compensates for delayed input.</Text>
        {followFlute && <Text fontSize="xs" color="fg.muted" mt={2}>Play at your own pace. A held matching pitch within ±35 cents advances the playhead; repeated notes need a new articulation. Tempo sets motion between notes and sound lengths. No early/late grading.</Text>}
      </Box>
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Sound</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={2}><input type="checkbox" checked={guide} onChange={event => setGuide(event.target.checked)}/>Guide sound</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={metronome} disabled={followFlute} onChange={event => setMetronome(event.target.checked)}/>Metronome</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={harmonySound} disabled={!score.chords.length} onChange={event => setHarmonySound(event.target.checked)}/>Chord sound</Flex>
        <Flex as="label" gap={2} align="center" fontSize="sm">Chord volume
          <input aria-label="Chord volume" type="range" min={0} max={100} value={harmonyVolume} style={{width: 90}} onChange={event => setHarmonyVolume(Number(event.target.value))}/>
        </Flex>
        </Flex>
      </Box>
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Display</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Button size="sm" variant="outline" onClick={() => setMode(value => value === 'dozenal' ? 'jazz' : 'dozenal')}>Labels: {mode === 'dozenal' ? 'Dozenal' : 'Jazz'}</Button>
        <Flex as="label" gap={2}><input type="checkbox" checked={showHarmony} disabled={!score.chords.length} onChange={event => setShowHarmony(event.target.checked)}/>Show chords</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={showMelody} onChange={event => setShowMelody(event.target.checked)}/>Show melody</Flex>
          {Boolean(score.lyrics?.length) && <Flex as="label" gap={2}><input type="checkbox" checked={showLyrics} onChange={event => setShowLyrics(event.target.checked)}/>Show lyrics</Flex>}
        <Flex as="label" gap={2}><input type="checkbox" disabled={!showMelody || !score.chords.length} checked={showMelodyRoles} onChange={event => setShowMelodyRoles(event.target.checked)}/>Melody roles</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={showChordTransitions} disabled={!showHarmony} onChange={event => setShowChordTransitions(event.target.checked)}/>Previous voicing &amp; root arrows</Flex>
        <Flex as="label" gap={2} align="center">Upcoming attacks
          <select aria-label="Upcoming attacks" disabled={!showMelody && !(showLyrics && score.lyrics?.length)} value={lookahead} onChange={event => setLookahead(Number(event.target.value))}>
            {Array.from({length: 9}, (_, count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </Flex>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mt={2}>The brightest outline marks the actual next attack; later outlines are fainter. Repeated notes and loop passes remain separate attacks. Set 0 to hide.</Text>
      </Box>
      </Flex>
      {!score.source && <PracticeAnalysisControls options={analysis} setOptions={setAnalysis} phraseStarts={phraseStarts} setPhraseStarts={setPhraseStarts}/>}
      {(microphone.error || playback.error) && <Text role="alert" color="red.500">{microphone.error || playback.error}</Text>}
      {history.error && <Text role="alert" color="orange.500">{history.error}</Text>}
      <Flex gap={3} wrap="wrap">
        <PracticeTuner target={playback.running && target ? target.note + transpose : undefined} pitch={pitch} mode={mode} allowLowOctaveUp={allowLowOctaveUp}
          listening={microphone.status === 'listening'} countIn={countIn ? Math.min(4, Math.ceil(playback.entryBeat - beat)) : null}
          location={!playback.running ? 'Free tuning' : followFlute && !countIn ? playback.waiting ? 'Waiting for your flute' : 'Following your pace' : target?.location ?? 'Four-beat count-in from the playhead'}/>
        {playback.running && <PracticeJudgement attempt={lastAttempt} freeTime={followFlute} running={playback.running} listening={microphone.status === 'listening'}
          betweenTargets={betweenTargets} mode={mode} transpose={transpose}/>}
      </Flex>
      <PracticeHexMap midiNotes={midiNotes} target={showMelody ? target : undefined} targetHit={targetHit} futureAttacks={showMelody ? futureAttacks : []} progress={progress} heard={pitch?.note ?? null} heardCents={pitch?.cents ?? null} transpose={transpose} mode={mode} harmony={showHarmony ? harmony : undefined} previewNote={playback.previewNote} practicing={playback.running} onPlayNote={note => void playback.playNote(note)} showGuideTones={analysis.guideTones}/>
      {showLyrics && Boolean(score.lyrics?.length) && <PracticeLyrics lyrics={score.lyrics!} beat={beat} countIn={countIn}
        entryBeat={playback.entryBeat} endBeat={playback.endBeat} pass={playback.pass} cueCount={lookahead}
        cueing={playback.running || playback.paused} loop={loop ? {start: loopStart ?? START, end: loopEnd ?? END} : null}/>}
      <PracticeTimeline beat={beat} entryBeat={playback.entryBeat} endBeat={playback.endBeat} pass={playback.pass} running={playback.running}
        onTogglePlayback={() => void togglePlayback()} onBack={goBack} transportDisabled={microphone.status === 'starting'}
        pendingBeat={playback.pendingBeat} target={target} harmony={harmony} mode={mode} transpose={transpose} keyTranspose={keyTranspose} pieceHarmonies={pieceHarmonies} showHarmony={showHarmony} showMelody={showMelody} showMelodyRoles={showMelody && showMelodyRoles} showChordTransitions={showChordTransitions} bpm={bpm}
        loop={loop} loopStart={loopStart} loopEnd={loopEnd} onLoopStart={changeLoopStart} onLoopEnd={changeLoopEnd} onSeek={playback.seek}
        onMelody={note => {playback.seek(note.start); void playback.playNote(note.note + transpose);}}
        onHarmony={chord => {playback.seek(chord.start); void playback.playChord(chord.notes.map(note => note.note));}}
        attempts={attempts} listening={microphone.status === 'listening'} freeTime={followFlute} analysis={analysis} phraseStarts={phraseStarts}/>
      <PracticeSuggestions data={history.data} running={playback.running} bpm={bpm} transpose={transpose}
        keyTranspose={keyTranspose} freeTime={followFlute} allowLowOctaveUp={allowLowOctaveUp} onApply={applySuggestedLoop}/>
      <PracticeHistoryPanel data={history.data} error={history.error} recovery={history.recovery} activeId={history.activeId} running={playback.running} mode={mode} onExport={history.exportJSON} onImport={history.importJSON}/>
      {score.source && <Box fontSize="xs" color="fg.muted"><Link href={score.source} target="_blank" rel="noreferrer" textDecoration="underline">{score.collection ?? 'OpenBook'} source</Link> · {score.credit}. {score.chords.length ? 'Chord voicings are generated from the source harmony. ' : 'No chord symbols are supplied in this arrangement. '}Melody uses the upper voice of written chords.{score.copyright && <Text>{score.copyright} {score.copyrightExtra}</Text>}{score.warnings?.map(warning => <Text key={warning} color="orange.500">{warning}</Text>)}</Box>}
      <Text fontSize="sm" color="fg.muted">Click a hex to hear its guide tone. When stopped, click a harmony or melody strip cell to hear it. {followFlute ? 'In free time, strip clicks move the playhead immediately.' : 'While playing, a strip click queues a jump on the next beat.'} Set optional loop points while stopped. Dark outline in light mode, white in dark mode: play now. Green outline: correct pitch; timing is judged separately. Dashed hexagon: coming next. The small bar at the bottom of the active hex shortens over the note’s duration. Small monochrome indicator at the top: your detected note. Dot above center = sharp; below = flat; centered = in tune.{showHarmony ? ' Gold borders: chord tones; a double border marks the root. Harmony and melody share the same beat scale below the map.' : ''} Moving right adds 2 semitones; up-right adds 7.</Text>
      <Text fontSize="sm" color="fg.muted">Listening keeps your sound settings; headphones help keep playback out of the microphone. Audio is analyzed on this device and is not recorded or uploaded.</Text>
      <Text fontSize="sm" color="fg.muted">This first version detects entrances after a pitch change or a brief break in sound. Repeated tongued notes need that break to register; a held note never earns a second entrance automatically.</Text>
    </Stack>
  );
}
export default function LumatonePractice() {
  const [selected, setSelected] = useState(practiceScores[0].id);
  const [score, setScore] = useState(stellaScore);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const entry = practiceScores.find(piece => piece.id === selected)!;
    setLoadError('');
    loadPracticeScore(entry, controller.signal).then(loaded => {
      if (!controller.signal.aborted) setScore(loaded);
    }).catch(error => {if (!controller.signal.aborted) setLoadError(String(error.message));});
    return () => controller.abort();
  }, [selected, retry]);
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState('all');
  const failures = [...importReport.failures.map(item => ({...item, collection: 'OpenBook'})), ...effendiReport.failures.map(item => ({...item, collection: 'Effendi'})), ...wikifoniaReport.failures.map(item => ({...item, collection: 'Wikifonia'}))];
  const matches = practiceScores.filter(piece => piece.id === selected || ((collection === 'all' || piece.collection === collection || (collection === 'custom' && !piece.collection)) && `${piece.title} ${piece.composer} ${piece.edition ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  return <>
    <Flex gap={3} wrap="wrap" align="center" p={3} maxWidth="1200px" mx="auto">
      <Flex gap={2} align="center" fontSize="sm" width="100%">
        <Text color="fg.muted">Collections:</Text>
        <Link href="https://github.com/veltzer/book-openbook" target="_blank" rel="noopener noreferrer" textDecoration="underline">OpenBook</Link>
        <Text color="fg.muted">·</Text>
        <Link href="https://effendi.me/jazz/repo/" target="_blank" rel="noopener noreferrer" textDecoration="underline">Effendi / Modern Jazz Fake Book</Link>
        <Text color="fg.muted">·</Text>
        <Link href="https://github.com/smashub/choco/tree/main/partitions/wikifonia/raw" target="_blank" rel="noopener noreferrer" textDecoration="underline">Wikifonia / ChoCo</Link>
      </Flex>
      <label>Collection <select aria-label="Collection" value={collection} onChange={event => setCollection(event.target.value)}>
        <option value="all">All collections</option><option value="custom">Your arrangements</option><option value="OpenBook">OpenBook</option><option value="Effendi">Effendi / Modern Jazz Fake Book</option><option value="Wikifonia">Wikifonia / ChoCo</option>
      </select></label>
      <label>Find a tune <input aria-label="Find a tune" value={search} onChange={event => setSearch(event.target.value)} placeholder="Title or composer"/></label>
      <label>Tune <select aria-label="Tune" value={selected} onChange={event => setSelected(event.target.value)} style={{maxWidth: 'min(100%, 480px)'}}>
        {[practiceScores.find(piece => piece.id === selected)!, ...matches.filter(piece => piece.id !== selected).slice(0, 199)].map(piece => <option key={piece.id} value={piece.id}>{piece.title}{piece.collection ? ` · ${piece.collection}` : ''}{piece.edition ? ` · ${piece.edition}` : ''}{piece.melodyOnly ? ' · melody only' : ''}{piece.hasLyrics ? ' · lyrics' : ''}</option>)}
        {failures.filter(item => (collection === 'all' || item.collection === collection) && item.file.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map(item => <option key={`${item.collection}-${item.file}`} disabled>{item.file.replace('.ly.tera', '').replace(/_/g, ' ')} · {item.collection} · needs review</option>)}
      </select></label>
      <Text fontSize="xs" color="fg.muted">{matches.length > 200 ? `Showing first 200 of ${matches.length} matches; narrow your search. · ` : ""}{importReport.imported} OpenBook tunes · {effendiReport.imported} Effendi arrangements ({effendiReport.melodyOnly} melody-only) · {wikifoniaReport.imported} Wikifonia tunes · {failures.length} need review</Text>
      <Box as="details" fontSize="xs" color="fg.muted"><summary>Import notes</summary>
        <Text>Voicings are generated. Melody chords use their upper note. Marked D.S./D.C. jumps follow written order. Roman-numeral analysis is available for your Stella arrangement. Up to 50 source issues are shown here; complete reports are available in the collection files.</Text>
        {failures.slice(0, 50).map(item => <Text key={`${item.collection}-${item.file}`}>{item.collection} · {item.file.replace('.ly.tera', '').replace(/_/g, ' ')}: {item.reason}</Text>)}
      </Box>
    </Flex>
    {score.id === selected ? <PracticeScoreContext.Provider value={score}><PracticePiece key={score.id}/></PracticeScoreContext.Provider>
      : <Stack p={4} role="status"><Text>{loadError || 'Loading tune…'}</Text>{loadError && <Button onClick={() => setRetry(value => value + 1)}>Try again</Button>}</Stack>}
  </>;
}
