"""Convert cached Effendi MusicXML files to the practice-score format.

Quarter-note units come from MusicXML divisions/duration, not graphical note
types. The standard library parser never downloads the document's DTD.
"""
import argparse
from collections import Counter
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import runpy
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

HELPERS = runpy.run_path(str(Path(__file__).with_name('import-openbook.py')))
position, chord_name = HELPERS['position'], HELPERS['chord_name']
NATURALS = dict(zip('CDEFGAB', [0, 2, 4, 5, 7, 9, 11]))
KINDS = {
    'major': {1:0, 3:4, 5:7}, 'minor': {1:0, 3:3, 5:7},
    'augmented': {1:0, 3:4, 5:8}, 'diminished': {1:0, 3:3, 5:6},
    'dominant': {1:0, 3:4, 5:7, 7:10}, 'major-seventh': {1:0, 3:4, 5:7, 7:11},
    'minor-seventh': {1:0, 3:3, 5:7, 7:10}, 'diminished-seventh': {1:0, 3:3, 5:6, 7:9},
    'half-diminished': {1:0, 3:3, 5:6, 7:10}, 'major-minor': {1:0, 3:3, 5:7, 7:11},
    'augmented-seventh': {1:0, 3:4, 5:8, 7:10}, 'augmented-major-seventh': {1:0, 3:4, 5:8, 7:11},
    'major-sixth': {1:0, 3:4, 5:7, 6:9}, 'minor-sixth': {1:0, 3:3, 5:7, 6:9},
    'dominant-ninth': {1:0, 3:4, 5:7, 7:10, 9:14}, 'major-ninth': {1:0, 3:4, 5:7, 7:11, 9:14},
    'minor-ninth': {1:0, 3:3, 5:7, 7:10, 9:14},
    'dominant-11th': {1:0, 3:4, 5:7, 7:10, 9:14, 11:17},
    'major-11th': {1:0, 3:4, 5:7, 7:11, 9:14, 11:17},
    'minor-11th': {1:0, 3:3, 5:7, 7:10, 9:14, 11:17},
    'dominant-13th': {1:0, 3:4, 5:7, 7:10, 9:14, 11:17, 13:21},
    'major-13th': {1:0, 3:4, 5:7, 7:11, 9:14, 11:17, 13:21},
    'minor-13th': {1:0, 3:3, 5:7, 7:10, 9:14, 11:17, 13:21},
    'suspended-second': {1:0, 2:2, 5:7}, 'suspended-fourth': {1:0, 4:5, 5:7},
    'power': {1:0, 5:7}, 'pedal': {1:0}, 'other': {1:0},
}


def value(node, path, default=''):
    found = node.find(path)
    return found.text.strip() if found is not None and found.text else default


def integer(node, path, default=0):
    number = Fraction(value(node, path, str(default)))
    if number.denominator != 1: raise ValueError('Microtonal pitches/alterations are not supported')
    return int(number)


def harmony(node, transposition):
    kind = value(node, 'kind', 'major')
    # Legacy Wikifonia exporter names; preserve degree alterations below.
    aliases = {'': 'major', '7': 'dominant', 'dominant-seventh': 'dominant',
        'minor-major': 'major-minor', 'minMaj7': 'major-minor', 'min': 'minor',
        'min7': 'minor-seventh', 'maj7': 'major-seventh', '6': 'major-sixth',
        'min6': 'minor-sixth', 'dim': 'diminished', 'dim7': 'diminished-seventh',
        'aug': 'augmented', '9': 'dominant-ninth', 'min9': 'minor-ninth',
        'maj9': 'major-ninth', 'm7b5': 'half-diminished', 'sus47': 'suspended-fourth',
        'maj69': 'major-sixth'}
    original_kind = kind
    kind = aliases.get(kind, kind)
    if kind == 'none': return None
    if kind not in KINDS: raise ValueError(f'Unsupported chord kind: {kind}')
    step = value(node, 'root/root-step')
    if step not in NATURALS: raise ValueError('Chord symbol lacks a spelled root')
    root = (NATURALS[step] + integer(node, 'root/root-alter') + transposition) % 12
    degrees = dict(KINDS[kind])
    if original_kind == 'sus47': degrees[7] = 10
    if original_kind == 'maj69': degrees[9] = 14
    if kind == 'other' and not node.findall('degree'): raise ValueError('Unspecified custom chord')
    for degree in node.findall('degree'):
        number, alteration = integer(degree, 'degree-value'), integer(degree, 'degree-alter')
        # MusicXML additions use dominant-scale degrees, including a minor 7th.
        natural = [0, 2, 4, 5, 7, 9, 10][(number-1) % 7] + 12*((number-1)//7)
        action = value(degree, 'degree-type')
        if action == 'subtract': degrees.pop(number, None)
        elif action == 'alter': degrees[number] = degrees.get(number, natural) + alteration
        elif action == 'add': degrees[number] = natural + alteration
        else: raise ValueError(f'Unknown chord degree action: {action}')
    notes = sorted({48 + root + interval for interval in degrees.values()})
    root_note = 48 + root
    if root_note not in notes: notes.insert(0, root_note)
    bass_step = value(node, 'bass/bass-step')
    bass = -1
    if bass_step:
        bass = 36 + (NATURALS[bass_step] + integer(node, 'bass/bass-alter') + transposition) % 12
    name = chord_name(notes, root_note, bass)
    intervals = {(note-root_note) % 12 for note in notes}
    additions = []
    if {3,4} <= intervals: additions.append('♯9')
    if 9 in intervals and (10 in intervals or 11 in intervals): additions.append('13')
    if 6 in intervals and 4 in intervals and 7 not in intervals: name = name.replace('♯11','♭5')
    if additions:
        base, separator, slash = name.partition('/')
        base = base[:-1]+','+','.join(additions)+')' if base.endswith(')') else base+'('+','.join(additions)+')'
        name = base + (separator+slash if separator else '')
    root_at = position(root_note)
    if bass >= 0 and bass % 12 != root: notes = [bass] + notes
    return {'name': name, 'notes': [{'note': note, 'root': note == root_note, 'at': position(note, root_at)} for note in notes]}


def note_lyrics(node):
    result=[]
    for lyric in node.findall('lyric'):
        text=''.join((child.text or (' ' if child.tag == 'elision' else '')) for child in lyric if child.tag in ('text','elision')).strip()
        extend=lyric.find('extend')
        result.append({'verse':lyric.get('number') or lyric.get('name') or '1', 'text':text,
            'syllabic':value(lyric,'syllabic','single'),
            'extend':None if extend is None else extend.get('type','start'),
            'lineBreak':lyric.find('end-line') is not None or lyric.find('end-paragraph') is not None})
    return result


def ending_numbers(text):
    result = set()
    for token in re.findall(r'\d+(?:-\d+)?', text):
        numbers = [int(n) for n in token.split('-')]
        result.update(range(numbers[0], numbers[-1]+1))
    return result


def measure_order(frames):
    """Expand nested bar repeats and numbered endings; jump marks stay written."""
    stack, groups = [], []
    for index, frame in enumerate(frames):
        if frame['forward']: stack.append(index)
        if frame['backward']:
            start = stack.pop() if stack else 0
            groups.append((start, index, frame['backward']))
    if stack: raise ValueError('Unclosed forward repeat')
    for start, end, count in groups:
        if not 1 <= count <= 16 or start > end: raise ValueError('Invalid repeat range/count')
    result = []
    def walk(start, end, current_pass=1, ignored=()):
        index = start
        while index <= end:
            options = [g for g in groups if g[0] == index and g not in ignored]
            if options:
                group = max(options, key=lambda g:g[1])
                if group[1] > end: raise ValueError('Crossing repeat ranges')
                for repeat in range(1, group[2]+1): walk(index, group[1], repeat, (*ignored, group))
                current_pass = group[2]
                index = group[1]+1
                continue
            allowed = frames[index]['ending']
            if not allowed or current_pass in allowed: result.append(index)
            if len(result) > 2000: raise ValueError('Expanded form exceeds 2000 measures')
            index += 1
    walk(0, len(frames)-1)
    return result


def parse_part(part):
    divisions, meter, fifths, mode = Fraction(1), Fraction(4), 0, 'major'
    transpositions = {'all': 0}
    frames, current_ending, warnings = [], set(), set()
    repeated_measures = None
    initial_key = None
    for index, measure in enumerate(part.findall('measure')):
        time, maximum, last_onset = Fraction(0), Fraction(0), Fraction(0)
        events, chords = [], []
        ending, ending_stop, forward, backward = set(current_ending), False, False, 0
        for element in measure:
            if element.tag == 'attributes':
                if element.find('divisions') is not None: divisions = Fraction(value(element, 'divisions'))
                if divisions <= 0: raise ValueError('Invalid divisions')
                time_node = element.find('time')
                if time_node is not None:
                    beats = time_node.findall('beats'); types = time_node.findall('beat-type')
                    if beats and len(beats) == len(types):
                        meter = sum(sum(Fraction(n) for n in b.text.split('+')) * 4/Fraction(t.text) for b,t in zip(beats, types))
                    elif time_node.find('senza-misura') is not None: raise ValueError('Unmeasured music needs review')
                for transposition in element.findall('transpose'):
                    transpositions[transposition.get('number', 'all')] = integer(transposition, 'chromatic') + 12*integer(transposition, 'octave-change')
                if element.find('key') is not None:
                    fifths = integer(element, 'key/fifths')
                    mode = value(element, 'key/mode', 'major')
                if initial_key is None:
                    offset = {'major':0,'minor':9,'ionian':0,'dorian':2,'phrygian':4,'lydian':5,'mixolydian':7,'aeolian':9,'locrian':11}.get(mode)
                    if offset is None: raise ValueError(f'Unsupported key mode: {mode}')
                    initial_key = ((fifths*7+offset+transpositions.get('1',transpositions['all'])) % 12, mode)
                for repeated in element.findall('measure-style/measure-repeat'):
                    if repeated.get('type') == 'start':
                        repeated_measures = int(repeated.text or '1')
                        if not 1 <= repeated_measures <= index: raise ValueError('Invalid measure-repeat reference')
                    elif repeated.get('type') == 'stop': repeated_measures = None
            elif element.tag in ('backup', 'forward'):
                time += Fraction(value(element, 'duration', '0'))/divisions * (-1 if element.tag == 'backup' else 1)
                if time < 0: raise ValueError('Negative backup position')
                maximum = max(maximum, time)
            elif element.tag == 'note':
                if element.find('grace') is not None:
                    warnings.add('Grace notes are omitted from the timed guide.')
                    continue
                duration = Fraction(value(element, 'duration', '0'))/divisions
                if duration <= 0: continue
                onset = last_onset if element.find('chord') is not None else time
                if element.find('chord') is None:
                    last_onset = onset; time += duration
                maximum = max(maximum, onset+duration)
                pitch = element.find('pitch')
                if pitch is not None:
                    staff = value(element, 'staff', '1'); voice = value(element, 'voice', '1')
                    transposition = transpositions.get(staff, transpositions['all'])
                    note = (integer(pitch, 'octave')+1)*12 + NATURALS[value(pitch, 'step')] + integer(pitch, 'alter') + transposition
                    if not 0 <= note <= 127: raise ValueError('Pitch outside MIDI range')
                    ties = {tie.get('type') for tie in [*element.findall('tie'), *element.findall('notations/tied')]}
                    events.append({'at': onset, 'duration':duration, 'note':note, 'voice':(staff,voice), 'tieStart':'start' in ties, 'tieStop':'stop' in ties, 'lyrics':note_lyrics(element)})
            elif element.tag == 'harmony':
                # Wikifonia uses a completely blank C-major symbol as a spacer.
                root_step, kind_node = element.find('root/root-step'), element.find('kind')
                if (root_step is not None and root_step.text == 'C' and root_step.get('text') == ''
                    and kind_node is not None and kind_node.text == 'major' and kind_node.get('text') == ''
                    and element.find('bass') is None and element.find('degree') is None):
                    warnings.add('Invisible blank harmony spacers are omitted.')
                    continue
                staff = value(element, 'staff', '1')
                onset = time + Fraction(value(element, 'offset', '0'))/divisions
                chord = harmony(element, transpositions.get(staff, transpositions['all']))
                chords.append({'at': onset, 'chord': chord})
            elif element.tag == 'barline':
                repeat = element.find('repeat')
                if repeat is not None:
                    if repeat.get('direction') == 'forward': forward = True
                    else: backward = int(repeat.get('times', '2'))
                label = element.find('ending')
                if label is not None:
                    if label.get('type') == 'start': ending = ending_numbers(label.get('number','')); current_ending = set(ending)
                    elif label.get('type') in ('stop','discontinue'): ending_stop = True
            if element.tag == 'direction':
                sound = element.find('sound')
                if (sound is not None and any(k in sound.attrib for k in ['dacapo','dalsegno','tocoda','fine'])) or element.find('.//segno') is not None or element.find('.//coda') is not None or re.search(r'\bD\.\s*[SC]\.|al (?:Coda|Fine)', ' '.join(element.itertext())):
                    warnings.add('D.S./D.C./coda jumps are kept in written order; bar repeats are expanded.')
        if ending_stop: current_ending = set()
        if repeated_measures:
            reference = frames[index-repeated_measures]
            if not events: events = reference['events']
            if not chords: chords = reference['chords']
            warnings.add('Measure-repeat shorthand is expanded from the preceding written measures.')
        duration = maximum if measure.get('implicit') == 'yes' or (index == 0 and maximum < meter) else max(meter, maximum)
        if duration <= 0: duration = meter
        if any(e['at'] < 0 or e['at'] > duration for e in chords): raise ValueError('Harmony offset outside measure')
        if maximum > meter and measure.get('implicit') != 'yes': warnings.add('A source measure exceeds its time signature; its encoded duration is preserved.')
        frames.append({'duration':duration, 'meter':meter, 'events':events, 'chords':chords,
            'ending':ending, 'forward':forward, 'backward':backward, 'label':measure.get('number',str(index+1))})
    return {'frames': frames, 'key': initial_key or (0, 'major'), 'warnings':warnings}


def read_xml(path):
    data = path.read_bytes()
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            container = ET.fromstring(archive.read('META-INF/container.xml'))
            rootfile = next(element.get('full-path') for element in container.iter() if element.tag.endswith('rootfile'))
            if archive.getinfo(rootfile).file_size > 10*1024*1024: raise ValueError('MusicXML document exceeds 10 MB')
            data = archive.read(rootfile)
    if len(data) > 10*1024*1024 or b'<!ENTITY' in data: raise ValueError('Unsupported XML size/entity declaration')
    root = ET.fromstring(data)
    for node in root.iter(): node.tag = node.tag.rsplit('}',1)[-1]
    if root.tag != 'score-partwise': raise ValueError('Only partwise MusicXML is supported')
    return root, data


def import_score(path, entry):
    root, data = read_xml(path)
    names = {part.get('id'): value(part,'part-name') for part in root.findall('part-list/score-part')}
    parts = []
    failures = []
    for part in root.findall('part'):
        try:
            parsed = parse_part(part)
            parts.append((names.get(part.get('id'),''), parsed))
        except ValueError as error: failures.append(str(error))
    pitched = [(name,part) for name,part in parts if any(frame['events'] for frame in part['frames'])]
    if not pitched: raise ValueError(failures[0] if failures else 'No pitched melody')
    # Prefer a lead instrument over bass/low brass; retain separate source-file variants.
    name, lead = next((part for part in pitched if not re.search(r'bass|drum|percussion|tuba|baritone',part[0],re.I)), pitched[0])
    frames = lead['frames']
    harmony_part = lead if any(frame['chords'] for frame in frames) else next((p for _,p in parts if any(f['chords'] for f in p['frames'])), None)
    melody_only = harmony_part is None
    if harmony_part is None: harmony_part = lead
    if len(harmony_part['frames']) != len(frames): raise ValueError('Melody/harmony parts have different measure counts')
    voices = Counter(event['voice'] for frame in frames for event in frame['events'])
    voice = min(voices, key=lambda item:(item[0] != '1', int(item[1]) if item[1].isdigit() else 100, -voices[item]))
    order = measure_order(frames)
    pickup = frames[0]['duration'] if frames[0]['duration'] < frames[0]['meter'] else Fraction(0)
    time = -pickup
    bars, melody, chord_events, warnings = [], [], [], set(lead['warnings'])
    if melody_only: warnings.add('This source arrangement has no chord symbols; melody-only practice is available.')
    previous, previous_tied = None, False
    lyrics, last_lyrics, extending_lyrics = [], {}, {}
    for source_index in order:
        frame = frames[source_index]
        if time >= 0: bars.append(float(time))
        # Collapse simultaneous written melody chords to their upper note.
        events = {}
        for event in frame['events']:
            if event['voice'] != voice: continue
            at = event['at']
            if at in events:
                warnings.add('Melody uses the upper note of written melody chords.')
                combined = [*events[at].get('lyrics',[]), *event.get('lyrics',[])]
                if event['note'] > events[at]['note']: events[at] = {**event}
                events[at]['lyrics'] = list({item['verse']:item for item in combined}.values())
            else: events[at] = event
        for onset, event in sorted(events.items()):
            at, duration = time+onset, event['duration']
            tied = bool(previous_tied and event['tieStop'] and melody and melody[-1]['note'] == event['note'] and abs(melody[-1]['start']+melody[-1]['duration']-float(at)) < 1e-6)
            for verse, lyric in list(extending_lyrics.items()):
                if lyric['start']+lyric['duration'] < float(at)-1e-6:
                    del extending_lyrics[verse]
                else: lyric['duration'] = round(float(at+duration)-lyric['start'],9)
            if tied:
                for lyric in last_lyrics.values():
                    if abs(lyric['start']+lyric['duration']-float(at)) < 1e-6:
                        lyric['duration'] = round(float(at+duration)-lyric['start'],9)
            for item in event.get('lyrics',[]):
                verse = item['verse']
                if item['text']:
                    # A syllable belongs to its own written note, including tied segments.
                    prior = extending_lyrics.pop(verse,None)
                    prior = prior or last_lyrics.get(verse)
                    if prior and prior['start'] < float(at) and prior['start']+prior['duration'] > float(at):
                        prior['duration'] = round(float(at)-prior['start'],9)
                    lyric = {key:item[key] for key in ('verse','text','syllabic','lineBreak')}
                    lyric.update(start=round(float(at),9),duration=round(float(duration),9))
                    lyrics.append(lyric); last_lyrics[verse] = lyric
                    if item['extend'] in ('start','continue'): extending_lyrics[verse] = lyric
                else:
                    if item['extend'] == 'stop': extending_lyrics.pop(verse,None)
                    if item['lineBreak'] and verse in last_lyrics: last_lyrics[verse]['lineBreak'] = True
            if previous_tied and event['tieStop'] and melody and melody[-1]['note'] == event['note'] and abs(melody[-1]['start']+melody[-1]['duration']-float(at)) < 1e-6:
                melody[-1]['duration'] = round(melody[-1]['duration']+float(duration),9)
            else:
                previous = position(event['note'], previous)
                melody.append({'note':event['note'],'at':previous,'start':round(float(at),9),'duration':round(float(duration),9),
                    'location':'Pickup' if at < 0 else f'Bar {len(bars)} · beat {float(onset)+1:g}'})
            previous_tied = event['tieStart']
        changes = {}
        for event in harmony_part['frames'][source_index]['chords']:
            at = time+event['at']
            if at in changes and changes[at] != event['chord']: raise ValueError('Conflicting simultaneous chord symbols')
            changes[at] = event['chord']
        for at, chord in sorted(changes.items()): chord_events.append((float(at),chord,len(bars) or 1))
        time += frame['duration']
    end = round(float(time),9)
    chords = []
    for index,(start,chord,bar) in enumerate(chord_events):
        until = chord_events[index+1][0] if index+1 < len(chord_events) else end
        if chord is not None and until-start > 1e-7:
            chords.append({**chord,'function':'','bar':bar,'start':round(start,9),'duration':round(until-start,9)})
    if not melody: raise ValueError('Empty melody after selecting the lead voice')
    for sequence in [melody,chords]:
        for index,event in enumerate(sequence):
            if event['duration'] <= 0 or event['start']+event['duration'] > end+1e-6: raise ValueError('Invalid event duration/bounds')
            if index and sequence[index-1]['start']+sequence[index-1]['duration'] > event['start']+1e-6: raise ValueError('Overlapping melody/chord events need review')
    if end > 10000: raise ValueError('Score exceeds supported practice length')
    if len(parts) > 1: warnings.add(f'Practice melody uses the {name or "first lead"} part, voice {voice[1]}; other parts are not played.')
    if any(value(node,'transpose/chromatic') for node in root.findall('.//attributes')): warnings.add('Written instrument pitches are converted to concert pitch.')
    slug = re.sub(r'[^a-z0-9]+','_',unicodedata.normalize('NFKD',entry['path']).encode('ascii','ignore').decode().lower()).strip('_')[:90]
    basename = Path(entry['path']).stem
    title = value(root,'work/work-title') or value(root,'movement-title') or basename
    composers = [node.text.strip() for node in root.findall('identification/creator') if node.get('type') == 'composer' and node.text]
    arrangers = [node.text.strip() for node in root.findall('identification/creator') if node.get('type') in ('arranger','transcriber') and node.text]
    return {'id':'effendi-'+slug+'-'+hashlib.sha256(entry['path'].encode()).hexdigest()[:8],
        'title':title,'composer':', '.join(composers),'tonic':lead['key'][0],'quality':lead['key'][1],
        'lyrics':lyrics, 'start':-float(pickup),'end':end,'bars':[round(bar,9) for bar in bars], 'melody':melody,'chords':chords,
        'edition':entry['path'].rsplit('.',1)[0], 'source':entry['url'], 'sourceHash':hashlib.sha256(data).hexdigest(),
        'credit':'; '.join(['Modern Jazz Fake Book · effendi.me', *arrangers]),
        'copyright':' '.join(node.text.strip() for node in root.findall('identification/rights') if node.text),
        'warnings':sorted(warnings)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.source/'manifest.json').read_text(encoding='utf-8'))
    scores, failures = [], []
    for entry in manifest:
        try:
            if 'error' in entry: raise ValueError(entry['error'])
            scores.append(import_score(args.source/entry['path'],entry))
        except Exception as error: failures.append({'file':entry['path'],'source':entry['url'],'reason':str(error)})
    scores.sort(key=lambda score:(score['title'].casefold(),score['edition']))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(scores,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    report = {'sourceFiles':len(manifest),'imported':len(scores),'melodyOnly':sum(not score['chords'] for score in scores),'failures':failures}
    args.out.with_suffix('.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'sourceFiles':len(manifest),'imported':len(scores),'failureReasons':dict(Counter(item['reason'] for item in failures))},ensure_ascii=False,indent=2))


if __name__ == '__main__': main()
