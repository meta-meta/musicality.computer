const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const result = esbuild.buildSync({stdin: {contents: `
  export * from './src/lumatone/practice/instruments.ts';
  export * from './src/lumatone/practice/exercise.ts';
  export {stellaScore} from './src/lumatone/practice/scores.ts';
  export {pitchLabel} from './src/lumatone/leadSheet/labels.ts';
`, resolveDir: process.cwd(), loader: 'ts'}, bundle: true, write: false, format: 'cjs', platform: 'node',
  define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
const mod = {exports: {}};
new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
const {transposingInstruments, practiceInstrument, instrumentPitchLabel, writtenPracticeScore, stellaScore, judgeEntrance, pitchLabel} = mod.exports;
const original = JSON.stringify(stellaScore);
assert.equal(instrumentPitchLabel(practiceInstrument('bb'), 'jazz'), 'D = concert C');
assert.equal(instrumentPitchLabel(practiceInstrument('bb'), 'dozenal'), `${pitchLabel(2, 'dozenal')} = concert ${pitchLabel(0, 'dozenal')}`);
assert.equal(practiceInstrument('invalid').id, 'flute');
for (const instrument of transposingInstruments) {
  const written = writtenPracticeScore(stellaScore, instrument.soundingOffset);
  assert.equal(written.id, stellaScore.id);
  assert.deepEqual(written.bars, stellaScore.bars);
  const keyShift = 3, register = 12;
  written.melody.forEach((note, index) => {
    const concert = stellaScore.melody[index];
    assert.equal(note.note + instrument.soundingOffset, concert.note);
    assert.equal(64 + 2 * note.at.q + 7 * note.at.r, note.note);
    assert.equal(note.start, concert.start);
    assert.equal(note.duration, concert.duration);
    const sounding = note.note + register + keyShift + instrument.soundingOffset;
    const attempt = judgeEntrance(concert.start, sounding, 0, 80, register + keyShift,
      {melody: stellaScore.melody, pass: 1, entryBeat: stellaScore.start, loop: false, loopStart: stellaScore.start, loopEnd: stellaScore.end});
    assert.ok(attempt.correctPitch, `${instrument.id} must judge the concert pitch of its written target`);
  });
  written.chords.forEach((chord, index) => chord.notes.forEach((note, n) => {
    assert.equal(note.note + instrument.soundingOffset, stellaScore.chords[index].notes[n].note);
    assert.equal(64 + 2 * note.at.q + 7 * note.at.r, note.note);
  }));
}
assert.equal(JSON.stringify(stellaScore), original, 'Instrument views must not modify the concert score');
assert.equal(writtenPracticeScore(stellaScore, -14).melody[0].note, stellaScore.melody[0].note + 14);
assert.equal(writtenPracticeScore(stellaScore, 12).melody[0].note, stellaScore.melody[0].note - 12);
console.log('Instrument notation, octave transposition, lattice coordinates, concert judging, key/register composition, and Jazz/Dozenal labels pass.');

const {instrumentRangeFit, melodyPitchBounds, practiceKeyTranspose} = mod.exports;
const tenor=practiceInstrument('tenor-sax'), flute=practiceInstrument('flute');
const bounds=melodyPitchBounds(stellaScore.melody);
assert.deepEqual(bounds,{low:58,high:77});
assert.deepEqual(instrumentRangeFit(bounds,tenor,0),{low:72,high:91,tooLow:false,tooHigh:true,fits:false});
assert.equal(instrumentRangeFit(bounds,tenor,practiceKeyTranspose(9,10)).fits,true,'A concert major lowers Stella enough for tenor');
assert.equal(instrumentRangeFit(bounds,tenor,-12).fits,true,'The octave below fits tenor at the original key');
assert.equal(instrumentRangeFit(bounds,tenor,-24).tooLow,true);
assert.equal(instrumentRangeFit(bounds,flute,0).tooLow,true,'Low B-flat remains outside standard flute range');
assert.equal(instrumentRangeFit(bounds,flute,2).fits,true,'C concert major lifts the bottom note to flute low C');
assert.equal(instrumentRangeFit({low:44,high:76},tenor,0).fits,true,'Both boundaries are inclusive in concert pitch');
assert.equal(instrumentRangeFit({low:43,high:77},tenor,0).tooLow,true);
assert.equal(instrumentRangeFit({low:43,high:77},tenor,0).tooHigh,true);
assert.equal(instrumentRangeFit(null,tenor,0),null);
assert.equal(melodyPitchBounds([]),null);
assert.equal(practiceKeyTranspose(4,10),-6,'Same tritone wrap as playback');
assert.equal(instrumentRangeFit({low:52,high:52},practiceInstrument('bb'),0).fits,true);
assert.equal(instrumentRangeFit({low:52,high:52},practiceInstrument('bb-trumpet'),0).fits,true);
assert.equal(instrumentRangeFit({low:50,high:50},practiceInstrument('bb'),0).fits,true);
assert.equal(instrumentRangeFit({low:50,high:50},practiceInstrument('bb-trumpet'),0).tooLow,true,'B-flat instruments need separate playable ranges');
for(const instrument of transposingInstruments) {
  for(let tonic=0;tonic<12;tonic++) for(const register of [-12,0,12,24]) {
    const shift=register+practiceKeyTranspose(tonic,stellaScore.tonic);
    const fit=instrumentRangeFit(bounds,instrument,shift);
    const notes=writtenPracticeScore(stellaScore,instrument.soundingOffset).melody.map(note=>note.note+shift);
    assert.equal(fit.fits,notes.every(note=>note>=instrument.writtenLow&&note<=instrument.writtenHigh));
  }
}
console.log('Instrument ranges pass: full-melody bounds, key/register combinations, transposing octaves, exact limits, missing data, and distinct B-flat instrument ranges.');

const guitar=practiceInstrument('guitar');
assert.equal(guitar.soundingOffset,-12);
assert.equal(instrumentRangeFit({low:35,high:88},guitar,0).fits,true,'Seven-string open B through high E at fret 24');
assert.equal(instrumentRangeFit({low:34,high:88},guitar,0).tooLow,true);
assert.equal(instrumentRangeFit({low:35,high:89},guitar,0).tooHigh,true);
console.log('Seven-string guitar range and octave notation pass.');
