"""Compile OpenBook's default tune versions into verified timed practice data.

Requires Python 3.11+ and a local LilyPond 2.24.x binary. No upstream build
scripts are executed. See web/README.md for the reproducible import command.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile
import tomllib

PITCHES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
NATURALS = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}
ROOT = Path(__file__).resolve().parent


def clean(text):
    text = re.sub(r'%[^\n]*', '', text)
    text = re.sub(r'\\(?:myMark|myWordMark)\s+"[^"]*"', '', text)
    return re.sub(r'\\(?:startChords|endChords|startSong|endSong|startPart|endPart|endBar|startBar|endTune|myEndLine\w*|myCoda|mySegno|verticalSpace|LPC|RPC|OPC)\b', '', text)


def position(note, previous=None):
    candidates = [{'q': (note - 64 - 7*r)//2, 'r': r} for r in range(-3, 7) if (note-64-7*r) % 2 == 0]
    def cost(p):
        if previous is None:
            return abs(p['q']+2)
        q, r = p['q']-previous['q'], p['r']-previous['r']
        return q*q + q*r + r*r + .03*(p['q']+2)**2
    return min(candidates, key=cost)


def chord_name(notes, root, bass=-1):
    root %= 12
    intervals = {(note-root) % 12 for note in notes}
    half_dim = {3, 6, 10} <= intervals and 4 not in intervals
    diminished = {3, 6} <= intervals and 4 not in intervals
    augmented = {4, 8} <= intervals and 7 not in intervals
    quality = 'dim' if diminished else 'm' if 3 in intervals and 4 not in intervals else 'aug' if augmented else 'sus4' if 5 in intervals and 4 not in intervals else 'sus2' if 2 in intervals and 4 not in intervals else ''
    if half_dim: quality = 'm7♭5'
    elif 11 in intervals: quality += 'maj7'
    elif 10 in intervals: quality += '7'
    elif 9 in intervals: quality += '7' if diminished else '6'
    extras = [label for interval, label in [(1, '♭9'), (2, '9'), (5, '11'), (6, '♯11'), (8, '♭13')] if interval in intervals and not (interval == 6 and diminished) and not (interval == 8 and augmented) and not (interval == 2 and quality.startswith('sus2')) and not (interval == 5 and quality.startswith('sus4'))]
    return PITCHES[root] + quality + ('(' + ','.join(extras) + ')' if extras else '') + ('/'+PITCHES[bass % 12] if bass >= 0 and bass % 12 != root else '')


def import_tune(path, compiler, work):
    source = path.read_text(encoding='utf-8')
    meta = tomllib.loads(re.search(r'{#(.*?)#}', source, re.S)[1])
    sections = dict(re.findall(r'{% if part == "([^"]+)" %}(.*?){% endif %}', source, re.S))
    version = meta['default_version']
    if 'Voice'+version not in sections or 'Chords'+version not in sections:
        raise ValueError('Default version does not contain both melody and chords')
    voice = sections['Voice'+version]
    repairs = []
    if path.name == 'billies_bounce.ly.tera':
        # The melody explicitly repeats its first 12-bar chorus, but upstream
        # lists that harmony only once. Repeat the same written A-section chords.
        sections['Chords'+version] = re.sub(r'(\\myMark "A"\s*\\startPart)(.*?)(\\endPart)', lambda m: m[1]+'\\repeat volta 2 {'+m[2]+'}'+m[3], sections['Chords'+version], count=1, flags=re.S)
        repairs.append('The first harmony chorus repeats to match the source melody repeat.')
    key = re.search(r'\\key\s+([a-g])((?:is|es)*)\s+\\(major|minor)', voice)
    if not key: raise ValueError('Missing key signature')
    tonic = (NATURALS[key[1]] + key[2].count('is') - key[2].count('es')) % 12
    partial = re.search(r'\\partial\s+(\d+)(\.*)(?:\s*\*\s*(\d+)(?:/(\d+))?)?', voice)
    pickup = 4/int(partial[1]) * sum(.5**i for i in range(len(partial[2])+1)) * (int(partial[3] or 1)/int(partial[4] or 1)) if partial else 0
    directory = work / path.stem
    directory.mkdir(exist_ok=True)
    lily = '\\version "2.24.4"\n\\include "'+(ROOT/'openbook-events.ily').as_posix()+'"\n'
    for stream, content in [('voice', "\\relative c' "+clean(voice)), ('chords', clean(sections['Chords'+version]))]:
        lily += '\\exportEvents "'+(directory/(stream+'.jsonl')).as_posix()+'" \\unfoldRepeats '+content+'\n'
    (directory/'input.ly').write_text(lily, encoding='utf-8')
    for attempt in range(3):
        process = subprocess.run([str(compiler), '-dno-print-pages', '-o', str(directory/'unused'), str(directory/'input.ly')], capture_output=True, timeout=120)
        (directory/'compile.log').write_bytes(process.stdout + process.stderr)
        if not process.returncode: break
    if process.returncode: raise ValueError('LilyPond rejected the notation; see compile.log')
    streams = {name: [json.loads(line) for line in (directory/(name+'.jsonl')).read_text().splitlines()] for name in ['voice', 'chords']}
    end = streams['voice'][-1]['at'] - pickup
    chord_end = streams['chords'][-1]['at'] - pickup
    if not math.isclose(end, chord_end, abs_tol=1e-6): raise ValueError(f'Melody/chord lengths differ: {end:g} vs {chord_end:g} beats')
    if not 0 < end <= 10000: raise ValueError('Invalid score length')
    meters = {max(0, event['at']-pickup): event['numerator']*4/event['denominator'] for event in streams['voice'] if event['kind'] == 'meter'}
    meters.setdefault(0, 4)
    bar_starts, time, meter = [], 0, meters[0]
    while time < end-1e-6:
        if time in meters: meter = meters[time]
        upcoming = [at for at in meters if at > time+1e-6]
        bar_starts.append(round(time, 9))
        time = min(time+meter, min(upcoming) if upcoming else end, end)
    def location(at):
        if at < 0: return 'Pickup'
        bar = max(i for i, start in enumerate(bar_starts) if start <= at+1e-7)
        return f'Bar {bar+1} · beat {at-bar_starts[bar]+1:g}'
    melody, previous, tied = [], None, False
    polyphony = False
    for event in streams['voice']:
        if event['kind'] != 'notes' or event['duration'] <= 0: continue
        note = max(event['notes'])
        polyphony |= len(event['notes']) > 1
        at, duration = event['at']-pickup, event['duration']
        if tied and melody and melody[-1]['note'] == note and math.isclose(melody[-1]['start']+melody[-1]['duration'], at, abs_tol=1e-6):
            melody[-1]['duration'] = round(melody[-1]['duration']+duration, 9)
        else:
            previous = position(note, previous)
            melody.append({'note': note, 'at': previous, 'start': round(at, 9), 'duration': round(duration, 9), 'location': location(at)})
        tied = event['ties'][event['notes'].index(note)]
    chords = []
    for event in streams['chords']:
        if event['kind'] != 'notes' or event['duration'] <= 0: continue
        at = event['at'] - pickup
        pitches = list(dict.fromkeys(event['notes']))
        root = event['root'] - 12
        root_index = next(index for index, note in enumerate(pitches) if note % 12 == root % 12)
        root_at = position(root)
        tones = [{'note': note-12, 'at': position(note-12, root_at), 'root': index == root_index} for index, note in enumerate(pitches)]
        bar = max(0, sum(start <= at+1e-7 for start in bar_starts)-1)+1
        chords.append({'name': chord_name(event['chordNotes'], event['root'], event['bass']), 'function': '', 'bar': bar, 'start': round(at, 9), 'duration': round(event['duration'], 9), 'notes': tones})
    if not melody or not chords: raise ValueError('Empty melody or harmony')
    for sequence in [melody, chords]:
        sequence.sort(key=lambda event: event['start'])
        for index, event in enumerate(sequence):
            if event['start']+event['duration'] > end+1e-6: raise ValueError('Event extends past score end')
            if index and sequence[index-1]['start']+sequence[index-1]['duration'] > event['start']+1e-6: raise ValueError('Overlapping music voices')
    attributes = meta['attributes']
    warnings = repairs
    if polyphony: warnings.append('Melody uses the upper note of written melody chords.')
    if re.search(r'\bD\.?\s*[SC]\.?\b|\bal\s+(?:Coda|Fine)\b|\\my(?:Segno|Coda)', re.sub(r'%[^\n]*', '', voice+sections['Chords'+version])):
        warnings.append('Navigation marks are shown in written order; D.S./D.C. jumps are not expanded.')
    return {'id': 'openbook-'+path.name.removesuffix('.ly.tera'), 'title': attributes['title'], 'composer': attributes.get('composer',''), 'tonic': tonic, 'quality': key[3],
        'start': -pickup, 'end': round(end, 9), 'bars': bar_starts, 'melody': melody, 'chords': chords, 'version': version, 'warnings': warnings,
        'source': 'https://github.com/veltzer/book-openbook/blob/master/src/openbook/'+path.name,
        'sourceHash': hashlib.sha256(source.encode()).hexdigest(),
        'credit': attributes.get('typesetter','Mark Veltzer'), 'copyright': attributes.get('copyright',''), 'copyrightExtra': attributes.get('copyrightextra','')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--lilypond', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--work', type=Path)
    args = parser.parse_args()
    files = sorted((args.source/'src/openbook').glob('*.ly.tera'))
    work = args.work or Path(tempfile.mkdtemp(prefix='openbook-'))
    work.mkdir(parents=True, exist_ok=True)
    tunes, failures = [], []
    def run(path):
        try: return import_tune(path, args.lilypond.resolve(), work.resolve()), None
        except Exception as error: return None, {'file': path.name, 'reason': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for tune, failure in pool.map(run, files):
            if tune: tunes.append(tune)
            else: failures.append(failure)
    tunes.sort(key=lambda tune: tune['title'].casefold())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(tunes, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    report = {'sourceFiles': len(files), 'imported': len(tunes), 'failures': failures, 'warnings': [{'id': tune['id'], 'warnings': tune['warnings']} for tune in tunes if tune['warnings']]}
    args.out.with_suffix('.report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({**report, 'warnings': len(report['warnings'])}, ensure_ascii=False, indent=2))


if __name__ == '__main__': main()
