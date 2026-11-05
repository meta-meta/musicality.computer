import {Box, Button, Flex, Heading, Link, Stack, Text} from '@chakra-ui/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import type {LabelMode} from './lumatone/leadSheet/labels.ts';
import {judgeEntrance, recordPracticeAttempt} from './lumatone/practice/exercise.ts';
import type {Attempt} from './lumatone/practice/exercise.ts';
import {PracticeHexMap} from './lumatone/practice/PracticeHexMap.tsx';
import {PracticeTuner} from './lumatone/practice/PracticeTuner.tsx';
import {PracticeJudgement} from './lumatone/practice/PracticeJudgement.tsx';
import {latestSavedCalibration} from './lumatone/practice/timingCalibration.ts';
import {TimingCalibration} from './lumatone/practice/TimingCalibration.tsx';
import {useMonophoneInput} from './lumatone/practice/useMonophoneInput.ts';
import {usePolyphonicInput} from './lumatone/practice/usePolyphonicInput.ts';
import {useMelodyPlayback} from './lumatone/practice/useMelodyPlayback.ts';
import {PracticeLyrics} from './lumatone/practice/PracticeLyrics.tsx';
import {PracticeTempoInput} from './lumatone/practice/PracticeTempoInput.tsx';
import {COUNT_IN_BEATS} from './lumatone/practice/transport.ts';
import {usePracticeSettings} from './lumatone/practice/usePracticeSettings.ts';
import {PracticeTimeline} from './lumatone/practice/PracticeTimeline.tsx';
import {PracticeAnalysisControls} from './lumatone/practice/PracticeAnalysisControls.tsx';
import {defaultAnalysis, defaultPhraseStarts} from './lumatone/practice/analysis.ts';
import {usePracticeShortcuts} from './lumatone/practice/usePracticeShortcuts.ts';
import {adjacentLoopPoint} from './lumatone/practice/navigation.ts';
import {upcomingAttacks} from './lumatone/practice/lookahead.ts';
import {usePracticeHistory} from './lumatone/practice/usePracticeHistory.ts';
import {PracticeSuggestions} from './lumatone/practice/PracticeSuggestions.tsx';
import {InstrumentIcon} from './lumatone/practice/InstrumentIcon.tsx';
import {PracticeHistoryPanel} from './lumatone/practice/PracticeHistoryPanel.tsx';
import MidiConfig from './MidiConfig.tsx';
import {AccordionItem, AccordionItemContent, AccordionItemTrigger, AccordionRoot} from './components/chakra-ui/accordion.tsx';
import {usePracticeMidi} from './lumatone/practice/usePracticeMidi.ts';
import {useColorModeValue} from './components/chakra-ui/color-mode.tsx';
import {instrumentRangeFit, melodyPitchBounds, practiceKeyTranspose, instrumentPitchLabel, practiceInstrument, transposingInstruments, writtenPracticeScore} from './lumatone/practice/instruments.ts';
import {transposeChord} from './lumatone/practice/transposition.ts';
import {PracticeScoreContext, usePracticeScore} from './lumatone/practice/PracticeScoreContext.tsx';
import {practiceScores, stellaScore, loadPracticeScore} from './lumatone/practice/scores.ts';
import importReport from './lumatone/practice/openbook/catalog.report.json';
import effendiReport from './lumatone/practice/effendi/catalog.report.json';
import wikifoniaReport from './lumatone/practice/wikifonia/catalog.report.json';
import {noteName, pitchLabel} from './lumatone/leadSheet/labels.ts';
const registerOptions = [{value: -12, label: 'Octave below'}, {value: 0, label: 'Original'}, {value: 12, label: 'Octave above'}, {value: 24, label: 'Two octaves above'}];
function PracticePiece({settings}: {settings:ReturnType<typeof usePracticeSettings>}) {
  const {score, START, END, exercise, harmonies} = usePracticeScore();
  const midiNotes = usePracticeMidi();
  const {bpm,setBpm,loop,setLoop,instrumentId,setInstrumentId,concertKey,setConcertKey,register,setRegister,settingsError} = settings;
  const instrument = practiceInstrument(instrumentId);
  const writtenOffset = -instrument.soundingOffset;
  const writtenScore = useMemo(() => writtenPracticeScore(score, instrument.soundingOffset), [score, instrument]);
  const key = concertKey ?? score.tonic;
  const keyTranspose = practiceKeyTranspose(key, score.tonic);
  const bounds = useMemo(() => melodyPitchBounds(exercise), [exercise]);
  const keyRanges = useMemo(() => Array.from({length: 12}, (_, tonic) => instrumentRangeFit(bounds, instrument,
    register + practiceKeyTranspose(tonic, score.tonic))), [bounds, instrument, register, score.tonic]);
  const registerRanges = useMemo(() => registerOptions.map(option => instrumentRangeFit(bounds, instrument,
    option.value + keyTranspose)), [bounds, instrument, keyTranspose]);
  const range = keyRanges[key];
  const fitsColor = useColorModeValue('#15803d', '#86efac');
  const outsideColor = useColorModeValue('#92400e', '#fbbf24');
  const rangeColor = (fit: typeof range) => fit ? fit.fits ? fitsColor : outsideColor : undefined;
  const rangeLabel = (fit: typeof range) => !fit ? '— no melody' : fit.fits ? '✓ fits' : fit.tooLow && fit.tooHigh ? '⚠ too low & high' : fit.tooLow ? '⚠ too low' : '⚠ too high';
  const transpose = register + keyTranspose;
  const pieceHarmonies = useMemo(() => harmonies.map(chord => transposeChord(chord, keyTranspose)), [keyTranspose, harmonies]);
  const [guide, setGuide] = useState(true);
  const [metronome, setMetronome] = useState(false);
  const [followMonophone, setFollowMonophone] = useState(false);
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
  const [latency, setLatency] = useState(()=>{
    try {return latestSavedCalibration(window.localStorage)?.correction??0;} catch {return 0;}
  });
  const [calibrating,setCalibrating] = useState(false);
  const [inputMode, setInputMode] = useState<'monophonic' | 'polyphonic'>('monophonic');
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const [betweenTargets, setBetweenTargets] = useState(false);
  const playback = useMelodyPlayback({bpm, transpose, harmonyTranspose: keyTranspose, guide, metronome, loop, loopStart, loopEnd, harmonySound, harmonyVolume, followMonophone, allowLowOctaveUp});
  const history = usePracticeHistory({bpm, transpose, keyTranspose, instrumentId, freeTime: followMonophone, allowLowOctaveUp, loop, loopStart, loopEnd, latencyMs: latency});
  useEffect(() => {setAttempts({}); setLastAttempt(null); setBetweenTargets(false);}, [bpm, transpose, loopStart, loopEnd, followMonophone, allowLowOctaveUp]);
  const monophone = useMonophoneInput(entrance => {
    if (followMonophone || calibrating) return;
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
    if (!followMonophone || !reading || calibrating) return;
    const attempt = playback.followPitch(reading.pitch.note, reading.pitch.cents, reading.time, articulation);
    if (!attempt) return;
    setLastAttempt(attempt);
    setBetweenTargets(false);
    setAttempts(current => recordPracticeAttempt(current, attempt));
    history.record(attempt, articulation);
  });
  const polyphone = usePolyphonicInput(reading => {
    if (calibrating) return;
    if (followMonophone) {
      const expected = exercise.find(note => playback.beat >= note.start - 1e-7 && playback.beat < note.start + note.duration - 1e-7);
      const candidate = reading.notes.find(note => expected && (note.note === expected.note + transpose
        || (allowLowOctaveUp && expected.note + transpose < 60 && note.note === expected.note + transpose + 12)));
      if (!candidate) return;
      const attempt = playback.followPitch(candidate.note, 0, reading.time, candidate.articulation);
      if (!attempt) return;
      setLastAttempt(attempt); setBetweenTargets(false);
      setAttempts(current => recordPracticeAttempt(current, attempt)); history.record(attempt, candidate.articulation);
      return;
    }
    const position = playback.positionAt(reading.time - latency);
    if (!position || position.beat < position.entryBeat - 0.5) return;
    const attempts = [...reading.started].sort((a, b) => b.confidence - a.confidence).map(note =>
      judgeEntrance(position.beat, note.note, 0, bpm, transpose,
        {melody: exercise, pass: position.pass, entryBeat: position.entryBeat, loop, loopStart: loopStart ?? START, loopEnd: position.endBeat, next: position.next, allowLowOctaveUp}));
    // Other chord tones must not mask a simultaneously detected correct melody note.
    const attempt = attempts.find(attempt => attempt?.correctPitch) ?? attempts.find(attempt => attempt !== null);
    if (!attempt) return;
    setLastAttempt(attempt); setBetweenTargets(false);
    setAttempts(current => recordPracticeAttempt(current, attempt)); history.record(attempt);
  });
  const microphone = inputMode === 'polyphonic' ? polyphone : monophone;
  const {running, stop} = playback;
  const {finish: finishHistory} = history;
  // A paused run must not acquire judgements from a different instrument.
  useEffect(() => {stop(); finishHistory();}, [instrumentId, stop, finishHistory]);
  const suggestionSeek = useRef(playback.seek); suggestionSeek.current = playback.seek;
  const applySuggestedLoop = useCallback((start: number,end: number) => {
    stop(); finishHistory();
    setLoopStart(start); setLoopEnd(end); setLoop(true);
    suggestionSeek.current(start);
  },[stop,finishHistory,setLoop]);
  useEffect(() => {
    if (followMonophone && running && microphone.status === 'off') stop();
  }, [followMonophone, running, microphone.status, stop]);
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
  const writtenHarmonies = useMemo(() => pieceHarmonies.map(chord => transposeChord(chord, writtenOffset)), [pieceHarmonies, writtenOffset]);
  const writtenHarmony = harmony ? writtenHarmonies[pieceHarmonies.indexOf(harmony)] : undefined;
  const writtenTarget = targetIndex >= 0 ? writtenScore.melody[targetIndex] : undefined;
  const writtenAttempts = useMemo(() => Object.fromEntries(Object.entries(attempts).map(([id, attempt]) => [id, {...attempt, note: attempt.note + writtenOffset}])), [attempts, writtenOffset]);
  const togglePlayback = async () => {
    if (microphone.status === 'starting' || calibrating) return;
    if (playback.running) {playback.pause(); return;}
    if (followMonophone && microphone.status !== 'listening' && !await microphone.start()) return;
    if (playback.paused) {await playback.resume(); return;}
    setAttempts({}); setLastAttempt(null); setBetweenTargets(false);
    history.begin();
    await playback.start();
  };
  const toggleListening = () => {
    if(microphone.status==='starting'||calibrating)return;
    if(microphone.status==='listening')microphone.stop();
    else void microphone.start();
  };
  const navigationBeat = playback.pendingBeat ?? Math.max(beat, playback.entryBeat);
  const goBack = () => playback.seek(adjacentLoopPoint(navigationBeat, -1, loopStart, loopEnd, score));
  usePracticeShortcuts({beat: navigationBeat, loopStart, loopEnd, onToggle: () => void togglePlayback(), onSeek: playback.seek,
    onPlayChord: () => {if (!calibrating && harmony) void playback.playChord(harmony.notes.map(note => note.note));}});
  return (
    <Stack p={3} gap={4} maxWidth="1200px" mx="auto" fontFamily="'JetBrains Mono', monospace">
      <Link asChild textDecoration="underline" alignSelf="start"><RouterLink to="/lumatone">Back to Lumatone</RouterLink></Link>
      <Heading as="h1">Monophone practice</Heading>
      <Text>{score.title} · {score.composer} · {score.bars.length} bars. Follow the target and watch your tuning indicator.</Text>
      <AccordionRoot collapsible lazyMount={false} unmountOnExit={false}>
        <AccordionItem value="midi">
          <AccordionItemTrigger>MIDI configuration</AccordionItemTrigger>
          <AccordionItemContent>
            <MidiConfig/>
            <Text fontSize="xs" color="fg.muted" mt={2}>Select Lumatone In to highlight held notes on the hex layout. MIDI input displays notes independently of monophone feedback.</Text>
          </AccordionItemContent>
        </AccordionItem>
      </AccordionRoot>
      <Flex gap={3} align="center" wrap="wrap">
        <Button disabled={microphone.status === 'starting' || calibrating} onClick={() => void togglePlayback()}>{playback.running ? 'Pause practice' : playback.paused ? 'Resume practice' : 'Start practice'}</Button>
        <Button variant="outline" disabled={microphone.status === 'starting' || calibrating} onClick={toggleListening}>{microphone.status === 'starting' ? 'Opening microphone…' : microphone.status === 'listening' ? 'Stop microphone' : inputMode === 'polyphonic' ? 'Listen to guitar' : 'Listen to monophone'}</Button>
      </Flex>
      {settingsError && <Text role="status" color="orange.500" fontSize="xs">{settingsError}</Text>}
      <Flex gap={3} wrap="wrap" align="stretch">
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Playback</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={2} align="center">Tempo
          <PracticeTempoInput bpm={bpm} onChange={setBpm} disabled={playback.running || calibrating}/> BPMM
        </Flex>
        <Flex as="label" gap={2} align="center" wrap="wrap" width="100%">Concert key
          {range && !range.fits && <Text as="span" color={outsideColor} aria-label="Melody outside instrument range">⚠</Text>}
          <select aria-label="Key" aria-invalid={range ? !range.fits : undefined} aria-describedby="practice-instrument-range" style={{maxWidth: '100%', color: rangeColor(range)}} value={key} disabled={playback.running} onChange={event => setConcertKey(Number(event.target.value))}>
            {Array.from({length: 12}, (_, tonic) => <option key={tonic} value={tonic} style={{color: rangeColor(keyRanges[tonic])}}>{pitchLabel(tonic, mode)} {score.quality} · {rangeLabel(keyRanges[tonic])}</option>)}
          </select>
        </Flex>
        <Flex as="label" gap={2} align="center" wrap="wrap" width="100%">Register
          <select aria-label="Register" aria-invalid={range ? !range.fits : undefined} aria-describedby="practice-instrument-range" style={{maxWidth: '100%', color: rangeColor(range)}} value={register} disabled={playback.running} onChange={event => setRegister(Number(event.target.value))}>
            {registerOptions.map((option, index) => <option key={option.value} value={option.value} style={{color: rangeColor(registerRanges[index])}}>{option.label} · {rangeLabel(registerRanges[index])}</option>)}
          </select>
        </Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={loop} disabled={playback.running} onChange={event => setLoop(event.target.checked)}/>Loop playback</Flex>
        </Flex>
        <Text id="practice-instrument-range" role="status" fontSize="xs" mt={2} color={rangeColor(range)} data-testid="instrument-range-warning">
          {range ? `${rangeLabel(range)}: written melody ${noteName(range.low, mode)}–${noteName(range.high, mode)}; ${instrument.label} range ${noteName(instrument.writtenLow, mode)}–${noteName(instrument.writtenHigh, mode)}.` : 'No melody to check.'}
        </Text>
        <Text fontSize="xs" color="fg.muted" mt={1}>Keys use the current register; registers use the current key. Checks the full melody. Typical ranges; model and player limits vary. Saxophone altissimo excluded.</Text>
      </Box>
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Instrument input</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={1} direction="column" width="100%" minWidth={0}>Audio detection
          <select aria-label="Audio detection" value={inputMode} disabled={playback.running || calibrating || microphone.status === 'starting'} onChange={event => {
            monophone.stop(); polyphone.stop(); playback.stop(); history.finish();
            setInputMode(event.target.value as 'monophonic' | 'polyphonic');
          }}>
            <option value="monophonic">Single note / precise tuner</option>
            <option value="polyphonic">Guitar / polyphonic (experimental)</option>
          </select>
        </Flex>
        <Flex as="label" gap={1} direction="column" width="100%" minWidth={0}><Box as="span">Instrument <InstrumentIcon instrumentId={instrumentId}/></Box>
          <select aria-label="Transposing instrument" style={{width: '100%', minWidth: 0}} value={instrumentId} disabled={playback.running || calibrating}
            onChange={event => setInstrumentId(practiceInstrument(event.target.value).id)}>
            {transposingInstruments.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </Flex>
        <Text fontSize="sm" data-testid="instrument-pitch-label">{instrumentPitchLabel(instrument, mode)}</Text>
        <Flex as="label" gap={2}><input type="checkbox" checked={followMonophone} disabled={playback.running || calibrating} onChange={event => setFollowMonophone(event.target.checked)}/>Follow monophone (free time)</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={allowLowOctaveUp} disabled={playback.running} onChange={event => setAllowLowOctaveUp(event.target.checked)}/>Accept octave up below C4</Flex>
        <Flex as="label" gap={2} align="center">Input timing correction
          <input aria-label="Input timing correction" type="number" min={-300} max={500} step={10} value={latency} disabled={followMonophone || calibrating} style={{width: 75}} onChange={event => setLatency(Math.max(-300, Math.min(500, Number(event.target.value) || 0)))}/> ms
        </Flex>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mt={2}>Notes and chords use written instrument pitch. Playback, the concert key, and saved judgements stay in concert pitch. Positive timing correction compensates for delayed input.</Text>
        {inputMode === 'monophonic' && <TimingCalibration disabled={playback.running || followMonophone || microphone.status==='starting'} setup={microphone.status==='listening'?microphone.setup:null}
          onPrepare={()=>{stop();playback.stopPreview();finishHistory();microphone.stop();}} onBusy={setCalibrating} onCorrection={setLatency}/>}
        {followMonophone && <Text fontSize="xs" color="fg.muted" mt={2}>Play at your own pace. A held matching pitch within ±35 cents advances the playhead; repeated notes need a new articulation. Tempo sets motion between notes and sound lengths. No early/late grading.</Text>}
      </Box>
      <Box as="fieldset" flex="1 1 260px" minWidth={0} borderWidth="1px" borderRadius="md" p={3}>
        <Box as="legend" px={1} fontSize="sm" fontWeight="semibold">Sound</Box>
        <Flex gap={3} wrap="wrap" align="center" fontSize="sm">
        <Flex as="label" gap={2}><input type="checkbox" checked={guide} onChange={event => setGuide(event.target.checked)}/>Guide sound</Flex>
        <Flex as="label" gap={2}><input type="checkbox" checked={metronome} disabled={followMonophone} onChange={event => setMetronome(event.target.checked)}/>Metronome</Flex>
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
      <PracticeScoreContext.Provider value={writtenScore}>
      <Flex gap={3} wrap="wrap">
        {inputMode === 'polyphonic' ? <Box borderWidth="1px" borderRadius="md" p={3} flex="1" minWidth={0} role="status" aria-live="polite">
          <Text fontWeight="semibold">Polyphonic input · experimental</Text>
          <Text data-testid="polyphonic-note-readout" fontSize="lg" height="2.75rem" lineHeight="1.5" whiteSpace="nowrap" overflowX="auto" overflowY="hidden" tabIndex={0} aria-label="Detected notes in written pitch">{polyphone.notes.length ? polyphone.notes.map(note => {const cents = polyphone.tunings.find(reading => reading.note === note)?.cents; return `${pitchLabel(note + writtenOffset, mode)}${Math.floor((note + writtenOffset) / 12) - 1}${cents === null || cents === undefined ? ' (—)' : ` (${cents >= 0 ? '+' : ''}${Math.round(cents)}¢)`}`;}).join(' · ') : microphone.status === 'listening' ? 'Listening for notes…' : 'Start listening to detect guitar notes'}</Text>
          <Text fontSize="xs" color="fg.muted">{polyphone.delayMs === null ? '' : `Detector delay: ${polyphone.delayMs} ms · `}Experimental per-note tuning: dot above center = sharp, below = flat. A dash means insufficient isolated harmonics. Tuning estimates are visual feedback; melody judgements check the detected note set; full chord voicings are not graded. Use headphones to keep guide/chord audio out of the microphone.</Text>
        </Box> : <PracticeTuner target={playback.running && writtenTarget ? writtenTarget.note + transpose : undefined} pitch={pitch} mode={mode} notationOffset={writtenOffset} allowLowOctaveUp={allowLowOctaveUp}
          listening={microphone.status === 'listening'} countIn={countIn ? Math.min(COUNT_IN_BEATS, Math.ceil(playback.entryBeat - beat)) : null}
          location={!playback.running ? 'Free tuning' : followMonophone && !countIn ? playback.waiting ? 'Waiting for your instrument' : 'Following your pace' : target?.location ?? 'Three-beat count-in from the playhead'}/>}
        {playback.running && <PracticeJudgement attempt={lastAttempt ? {...lastAttempt, note: lastAttempt.note + writtenOffset} : null} freeTime={followMonophone} running={playback.running} listening={microphone.status === 'listening'}
          betweenTargets={betweenTargets} mode={mode} transpose={transpose}/>}
      </Flex>
      <PracticeHexMap extendedLowRange={instrumentId === 'guitar'} midiNotes={midiNotes.map(note => note + writtenOffset)} detectedTunings={inputMode === 'polyphonic' ? polyphone.tunings.map(reading => ({...reading, note: reading.note + writtenOffset})) : []} detectedNotes={inputMode === 'polyphonic' ? polyphone.notes.map(note => note + writtenOffset) : []} target={showMelody ? writtenTarget : undefined} targetHit={targetHit} futureAttacks={showMelody ? futureAttacks.map(cue => ({...cue, note: writtenScore.melody[exercise.indexOf(cue.note)]})) : []} progress={progress} heard={pitch ? pitch.note + writtenOffset : null} heardCents={pitch?.cents ?? null} transpose={transpose} mode={mode} harmony={showHarmony ? writtenHarmony : undefined} previewNote={playback.previewNote === null ? null : playback.previewNote + writtenOffset} practicing={playback.running} onPlayNote={note => {if(!calibrating) void playback.playNote(note - writtenOffset);}} showGuideTones={analysis.guideTones}/>
      {showLyrics && Boolean(score.lyrics?.length) && <PracticeLyrics lyrics={score.lyrics!} beat={beat} countIn={countIn}
        entryBeat={playback.entryBeat} endBeat={playback.endBeat} pass={playback.pass} cueCount={lookahead}
        cueing={playback.running || playback.paused} loop={loop ? {start: loopStart ?? START, end: loopEnd ?? END} : null}/>}
      <PracticeTimeline beat={beat} entryBeat={playback.entryBeat} endBeat={playback.endBeat} pass={playback.pass} running={playback.running}
        onTogglePlayback={() => void togglePlayback()} onToggleListening={toggleListening} microphoneStarting={microphone.status==='starting'} onBpmChange={setBpm} onBack={goBack} transportDisabled={microphone.status === 'starting' || calibrating}
        pendingBeat={playback.pendingBeat} target={writtenTarget} harmony={writtenHarmony} mode={mode} transpose={transpose} keyTranspose={keyTranspose} notationOffset={writtenOffset} pieceHarmonies={writtenHarmonies} showHarmony={showHarmony} showMelody={showMelody} showMelodyRoles={showMelody && showMelodyRoles} showChordTransitions={showChordTransitions} bpm={bpm}
        loop={loop} loopStart={loopStart} loopEnd={loopEnd} onLoopChange={setLoop} onLoopStart={changeLoopStart} onLoopEnd={changeLoopEnd} onSeek={playback.seek}
        onMelody={note => {if(calibrating)return;playback.seek(note.start); void playback.playNote(note.note + transpose - writtenOffset);}}
        onHarmony={chord => {if(calibrating)return;playback.seek(chord.start); void playback.playChord(chord.notes.map(note => note.note - writtenOffset));}}
        attempts={writtenAttempts} listening={microphone.status === 'listening'} freeTime={followMonophone} analysis={analysis} phraseStarts={phraseStarts}/>
      </PracticeScoreContext.Provider>
      <PracticeSuggestions data={history.data} running={playback.running} bpm={bpm} transpose={transpose}
        keyTranspose={keyTranspose} freeTime={followMonophone} allowLowOctaveUp={allowLowOctaveUp} onApply={applySuggestedLoop}/>
      <PracticeHistoryPanel data={history.data} error={history.error} recovery={history.recovery} activeId={history.activeId} running={playback.running} mode={mode} onExport={history.exportJSON} onImport={history.importJSON}/>
      {score.source && <Box fontSize="xs" color="fg.muted"><Link href={score.source} target="_blank" rel="noreferrer" textDecoration="underline">{score.collection ?? 'OpenBook'} source</Link> · {score.credit}. {score.chords.length ? 'Chord voicings are generated from the source harmony. ' : 'No chord symbols are supplied in this arrangement. '}Melody uses the upper voice of written chords.{score.copyright && <Text>{score.copyright} {score.copyrightExtra}</Text>}{score.warnings?.map(warning => <Text key={warning} color="orange.500">{warning}</Text>)}</Box>}
      <Text fontSize="sm" color="fg.muted">Click a hex to hear its guide tone. When stopped, click a harmony or melody strip cell to hear it. {followMonophone ? 'In free time, strip clicks move the playhead immediately.' : 'While playing, a strip click queues a jump on the next beat.'} Set optional loop points while stopped. Dark outline in light mode, white in dark mode: play now. Green outline: correct pitch; timing is judged separately. Dashed hexagon: coming next. The small bar at the bottom of the active hex shortens over the note’s duration. Small monochrome indicator at the top: your detected note. Dot above center = sharp; below = flat; centered = in tune.{showHarmony ? ' Gold borders: chord tones; a double border marks the root. Harmony and melody share the same beat scale below the map.' : ''} Moving right adds 2 semitones; up-right adds 7.</Text>
      <Text fontSize="sm" color="fg.muted">Listening keeps your sound settings; headphones help keep playback out of the microphone. Audio is analyzed on this device and is not recorded or uploaded.</Text>
      <Text fontSize="sm" color="fg.muted">This first version detects entrances after a pitch change or a brief break in sound. Repeated tongued notes need that break to register; a held note never earns a second entrance automatically.</Text>
    </Stack>
  );
}
export default function LumatonePractice() {
  if (!practiceScores.length) return <Text p={6}>No local arrangements are installed.</Text>;
  return <PracticeLibrary/>;
}

function PracticeLibrary() {
  const settings = usePracticeSettings();
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
  const failures = [...(importReport.failures as {file: string; reason: string}[]).map(item => ({...item, collection: 'OpenBook'})), ...(effendiReport.failures as {file: string; reason: string}[]).map(item => ({...item, collection: 'Effendi'})), ...(wikifoniaReport.failures as {file: string; reason: string}[]).map(item => ({...item, collection: 'Wikifonia'}))];
  const matches = practiceScores.filter(piece => piece.id === selected || ((collection === 'all' || piece.collection === collection || (collection === 'custom' && !piece.collection)) && `${piece.title} ${piece.composer} ${piece.edition ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  return <>
    <Flex gap={3} wrap="wrap" align="center" p={3} maxWidth="1200px" mx="auto">
      <Flex gap={2} align="center" wrap="wrap" fontSize="sm" width="100%" minWidth={0}>
        <Text color="fg.muted">Collections:</Text>
        <Link href="https://github.com/veltzer/book-openbook" target="_blank" rel="noopener noreferrer" textDecoration="underline">OpenBook</Link>
        <Text color="fg.muted">·</Text>
        <Link href="https://effendi.me/jazz/repo/" target="_blank" rel="noopener noreferrer" textDecoration="underline">Effendi / Modern Jazz Fake Book</Link>
        <Text color="fg.muted">·</Text>
        <Link href="https://github.com/smashub/choco/tree/main/partitions/wikifonia/raw" target="_blank" rel="noopener noreferrer" textDecoration="underline">Wikifonia / ChoCo</Link>
      </Flex>
      <Flex as="label" gap={2} align="center" minWidth={0} maxWidth="100%">Collection <select style={{minWidth: 0, maxWidth: '100%'}} aria-label="Collection" value={collection} onChange={event => setCollection(event.target.value)}>
        <option value="all">All collections</option><option value="custom">Your arrangements</option><option value="OpenBook">OpenBook</option><option value="Effendi">Effendi / Modern Jazz Fake Book</option><option value="Wikifonia">Wikifonia / ChoCo</option>
      </select></Flex>
      <Flex as="label" gap={2} align="center" minWidth={0} maxWidth="100%">Find a tune <input aria-label="Find a tune" value={search} onChange={event => setSearch(event.target.value)} placeholder="Title or composer" style={{minWidth: 0, maxWidth: '100%'}}/></Flex>
      <Flex as="label" gap={2} align="center" width="100%" minWidth={0}>Tune <select aria-label="Tune" value={selected} onChange={event => setSelected(event.target.value)} style={{width: 480, maxWidth: '100%', minWidth: 0}}>
        {[practiceScores.find(piece => piece.id === selected)!, ...matches.filter(piece => piece.id !== selected).slice(0, 199)].map(piece => <option key={piece.id} value={piece.id}>{piece.title}{piece.collection ? ` · ${piece.collection}` : ''}{piece.edition ? ` · ${piece.edition}` : ''}{piece.melodyOnly ? ' · melody only' : ''}{piece.hasLyrics ? ' · lyrics' : ''}</option>)}
        {failures.filter(item => (collection === 'all' || item.collection === collection) && item.file.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map(item => <option key={`${item.collection}-${item.file}`} disabled>{item.file.replace('.ly.tera', '').replace(/_/g, ' ')} · {item.collection} · needs review</option>)}
      </select></Flex>
      <Text fontSize="xs" color="fg.muted">{matches.length > 200 ? `Showing first 200 of ${matches.length} matches; narrow your search. · ` : ""}{importReport.imported} OpenBook tunes · {effendiReport.imported} Effendi arrangements ({effendiReport.melodyOnly} melody-only) · {wikifoniaReport.imported} Wikifonia tunes · {failures.length} need review</Text>
      <Box as="details" fontSize="xs" color="fg.muted" maxWidth="100%" overflowWrap="anywhere"><summary>Import notes</summary>
        <Text>Voicings are generated. Melody chords use their upper note. Marked D.S./D.C. jumps follow written order. Roman-numeral analysis is available for your Stella arrangement. Up to 50 source issues are shown here; complete reports are available in the collection files.</Text>
        {failures.slice(0, 50).map(item => <Text key={`${item.collection}-${item.file}`}>{item.collection} · {item.file.replace('.ly.tera', '').replace(/_/g, ' ')}: {item.reason}</Text>)}
      </Box>
    </Flex>
    {score.id === selected ? <PracticeScoreContext.Provider value={score}><PracticePiece key={score.id} settings={settings}/></PracticeScoreContext.Provider>
      : <Stack p={4} role="status"><Text>{loadError || 'Loading tune…'}</Text>{loadError && <Button onClick={() => setRetry(value => value + 1)}>Try again</Button>}</Stack>}
  </>;
}
