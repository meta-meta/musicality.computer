import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {transposingInstruments} from './instruments.ts';
import type {PracticeSession} from './practiceHistory.ts';

const shortNames: Record<string, string> = {flute: 'Flute', piccolo: 'Picc.', 'alto-flute': 'Alto fl.',
  'bass-flute': 'Bass fl.', bb: 'Cl. B♭', 'bb-trumpet': 'Tpt. B♭', 'soprano-sax': 'Sop.sax',
  'a-clarinet': 'Cl. A', 'alto-sax': 'Alto sax', 'tenor-sax': 'Tenor', 'baritone-sax': 'Bari sax', horn: 'Horn F', guitar: 'Guitar'};

export function historySessionContext(session: PracticeSession, mode: LabelMode) {
  const id = session.settings.instrumentId;
  const instrument = transposingInstruments.find(item => item.id === id);
  const instrumentLabel = instrument?.label ?? (id ? `Unknown instrument (${id})` : 'Instrument not recorded');
  const concertTonic = ((session.tonic ?? 10) + (session.settings.keyTranspose ?? 0) + 12) % 12;
  // Older imported tune sessions did not record major/minor quality.
  const quality = session.quality ?? (session.piece === 'stella-by-starlight' ? 'major' : '');
  const key = (tonic: number) => `${pitchLabel(tonic, mode)}${quality ? ` ${quality}` : ''}`;
  const concertKey = key(concertTonic);
  const writtenKey = instrument ? key(concertTonic - instrument.soundingOffset) : null;
  const compactQuality = quality === 'major' ? 'maj' : quality === 'minor' ? 'min' : quality;
  return {instrumentLabel, shortInstrument: instrument ? shortNames[instrument.id] : '?', concertTonic,
    concertKey, writtenKey, shortKey: `${pitchLabel(concertTonic, mode)}${compactQuality ? ` ${compactQuality}` : ''}`,
    label: `${instrumentLabel} · concert ${concertKey}${writtenKey ? ` · written ${writtenKey}` : ''}`};
}

// Group only adjacent visible columns with the same instrument and concert key.
// A repeated setting after a different setting starts a separate span.
export function consecutiveHistoryContexts(columns: {session: PracticeSession}[]) {
  const groups: {start: number; end: number; session: PracticeSession; identity: string}[] = [];
  columns.forEach(({session}, index) => {
    const context = historySessionContext(session, 'jazz');
    const identity = JSON.stringify([session.settings.instrumentId ?? null, context.concertKey]);
    const last = groups[groups.length - 1];
    if (last?.identity === identity) last.end = index + 1;
    else groups.push({start: index, end: index + 1, session, identity});
  });
  return groups;
}
