"""Small MusicXML fixtures for timing and form semantics; no network required."""
from pathlib import Path
import runpy
import tempfile
import unittest
import xml.etree.ElementTree as ET

API = runpy.run_path(str(Path(__file__).with_name('import-effendi.py')))


def note(step='C', octave=4, duration=48, extra='', voice=1):
    return f'<note><pitch><step>{step}</step><octave>{octave}</octave></pitch><duration>{duration}</duration><voice>{voice}</voice>{extra}</note>'


def chord(step='C', kind='major', extra=''):
    return f'<harmony><root><root-step>{step}</root-step></root><kind>{kind}</kind>{extra}</harmony>'


ATTRIBUTES = '<attributes><divisions>12</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'


class MusicXMLTests(unittest.TestCase):
    def test_added_seventh_and_extended_chord_labels(self):
        symbol = ET.fromstring(chord('C','diminished','<degree><degree-value>7</degree-value><degree-alter>0</degree-alter><degree-type>add</degree-type></degree>'))
        parsed = API['harmony'](symbol,0)
        self.assertEqual(parsed['name'],'Cm7♭5')
        self.assertEqual({note['note'] % 12 for note in parsed['notes']},{0,3,6,10})
        thirteen = API['harmony'](ET.fromstring(chord('C','dominant-13th')),0)
        self.assertIn('13',thirteen['name'])
        sharp_nine = API['harmony'](ET.fromstring(chord('C','dominant','<degree><degree-value>9</degree-value><degree-alter>1</degree-alter><degree-type>add</degree-type></degree>')),0)
        self.assertIn('♯9',sharp_nine['name'])

    def test_legacy_wikifonia_chords_and_spacers(self):
        for legacy, standard in [('7','dominant'),('dominant-seventh','dominant'),
                ('minor-major','major-minor'),('min','minor'),('min7','minor-seventh'),
                ('maj7','major-seventh'),('m7b5','half-diminished')]:
            self.assertEqual(API['harmony'](ET.fromstring(chord(kind=legacy)),0),
                             API['harmony'](ET.fromstring(chord(kind=standard)),0))
        for legacy, pitches in [('maj69',{0,4,7,9,2}),('sus47',{0,5,7,10})]:
            parsed=API['harmony'](ET.fromstring(chord(kind=legacy)),0)
            self.assertEqual({n['note']%12 for n in parsed['notes']},pitches)
        spacer='<harmony><root><root-step text="">C</root-step></root><kind text="">major</kind></harmony>'
        score=self.score('<measure>'+ATTRIBUTES+chord('G','dominant')+spacer+note()+'</measure>')
        self.assertEqual(len(score['chords']),1)
        self.assertEqual(score['chords'][0]['name'],'G7')

    def test_timed_lyrics_pickup_ties_melisma_and_verses(self):
        lyric='<lyric number="1"><syllabic>begin</syllabic><text>Hel</text></lyric><lyric number="2"><text>Hey</text></lyric>'
        pickup='<measure number="0" implicit="yes">'+ATTRIBUTES+note('C',duration=12,extra=lyric+'<tie type="start"/>')+'</measure>'
        tied=note('C',duration=12,extra='<tie type="stop"/>')
        finish=note('D',duration=12,extra='<lyric number="1"><syllabic>end</syllabic><text>lo</text><extend type="start"/></lyric>')
        melisma=note('E',duration=12,extra='<lyric number="1"><extend type="stop"/><end-line/></lyric>')
        rest='<note><rest/><duration>12</duration></note>'
        score=self.score(pickup+'<measure>'+tied+finish+melisma+rest+'</measure>')
        first=next(item for item in score['lyrics'] if item['verse']=='1')
        self.assertEqual((first['text'],first['start'],first['duration']),('Hel',-1,2))
        second=score['lyrics'][-1]
        self.assertEqual((second['text'],second['start'],second['duration']),('lo',1,2))
        self.assertTrue(second['lineBreak'])
        self.assertEqual({item['verse'] for item in score['lyrics']},{'1','2'})

    def test_lyrics_follow_repeats_and_survive_upper_note_selection(self):
        lyric='<lyric><text>Word</text><end-line/></lyric>'
        source='<measure>'+ATTRIBUTES+'<barline location="left"><repeat direction="forward"/></barline>'
        source+=note('C',duration=48,extra=lyric)+note('E',duration=48,extra='<chord/>')
        source+='<barline location="right"><repeat direction="backward"/></barline></measure>'
        score=self.score(source)
        self.assertEqual([n['note'] for n in score['melody']],[64,64])
        self.assertEqual([item['start'] for item in score['lyrics']],[0,4])
        self.assertTrue(all(item['lineBreak'] for item in score['lyrics']))

    def score(self, measures):
        xml = '<score-partwise><movement-title>Fixture</movement-title><identification><creator type="composer">Test</creator><rights>Fixture credit</rights></identification><part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list><part id="P1">'+measures+'</part></score-partwise>'
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'fixture.xml'; path.write_text(xml, encoding='utf-8')
            return API['import_score'](path, {'path':'I/fixture.xml','url':'https://effendi.me/jazz/repo/I/fixture.xml'})

    def test_ties_tuplets_offsets_slash_bass_and_concert_pitch(self):
        attributes = ATTRIBUTES.replace('</attributes>', '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>')
        symbol = chord('C', 'dominant', '<bass><bass-step>E</bass-step></bass><degree><degree-value>9</degree-value><degree-alter>-1</degree-alter><degree-type>add</degree-type></degree>')
        one = '<measure number="1">'+attributes+symbol+note('D',extra='<tie type="start"/>')+chord('G','dominant','<offset>-24</offset>')+'</measure>'
        two = '<measure number="2">'+note('D',duration=12,extra='<tie type="stop"/>')+'<harmony><kind>none</kind></harmony>'+''.join(note(step,duration=4) for step in ['E','F','G'])+'<note><rest/><duration>24</duration></note></measure>'
        result = self.score(one+two)
        self.assertEqual(result['tonic'],10)
        self.assertEqual(result['bars'],[0,4])
        self.assertEqual(result['melody'][0]['note'],60)
        self.assertEqual(result['melody'][0]['duration'],5)
        self.assertAlmostEqual(result['melody'][1]['duration'],1/3)
        self.assertEqual(result['chords'][0]['name'],'B♭7(♭9)/D')
        self.assertEqual([c['duration'] for c in result['chords']],[2,3])
        self.assertEqual(result['chords'][0]['notes'][0]['note'],38)
        self.assertEqual(result['copyright'],'Fixture credit')

    def test_numbered_and_nested_repeats(self):
        def frame(forward=False,backward=0,ending=()): return {'forward':forward,'backward':backward,'ending':set(ending)}
        self.assertEqual(API['measure_order']([frame(True),frame(backward=2,ending=[1]),frame(ending=[2])]),[0,1,0,2])
        self.assertEqual(API['measure_order']([frame(True),frame(True),frame(backward=2),frame(backward=2)]),[0,1,2,1,2,3]*2)
        with self.assertRaisesRegex(ValueError,'Unclosed'): API['measure_order']([frame(True)])

    def test_backup_selects_primary_voice(self):
        source = '<measure number="1">'+ATTRIBUTES+chord()+note('C',5,24)+note('D',5,24)+'<backup><duration>48</duration></backup>'+note('C',3,48,voice=2)+'</measure>'
        self.assertEqual([n['note'] for n in self.score(source)['melody']],[72,74])

    def test_measure_repeat(self):
        source = '<measure number="1">'+ATTRIBUTES+chord()+note()+'</measure>'
        source += '<measure number="2"><attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes><note><rest/><duration>48</duration></note></measure>'
        source += '<measure number="3"><attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>'+chord('D')+note('D')+'</measure>'
        result = self.score(source)
        self.assertEqual([n['note'] for n in result['melody']],[60,60,62])
        self.assertEqual([c['start'] for c in result['chords']],[0,4,8])

    def test_melody_only_and_pickup(self):
        source = '<measure number="0" implicit="yes">'+ATTRIBUTES+note('G',duration=12)+'</measure><measure number="1">'+note('C')+'</measure>'
        result = self.score(source)
        self.assertEqual(result['start'],-1)
        self.assertEqual(result['end'],4)
        self.assertEqual(result['chords'],[])
        self.assertTrue(any('no chord symbols' in warning for warning in result['warnings']))


if __name__ == '__main__': unittest.main()
