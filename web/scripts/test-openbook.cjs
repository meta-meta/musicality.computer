const assert = require('node:assert/strict');
const esbuild = require('esbuild');

(async () => {
  const result = await esbuild.build({stdin: {contents: `
    export * from './src/lumatone/practice/scores.ts';
    export * from './src/lumatone/practice/exercise.ts';
    export * from './src/lumatone/practice/fluteFollower.ts';
    export * from './src/lumatone/practice/lookahead.ts';
    export * from './src/lumatone/practice/navigation.ts';
    export * from './src/lumatone/practice/transposition.ts';
    export * from './src/lumatone/practice/practiceHistory.ts';
  `, resolveDir: process.cwd(), loader: 'ts'}, bundle: true, write: false, format: 'cjs', platform: 'node'});
  const mod = {exports: {}};
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const api = mod.exports;
  assert.equal(api.practiceScores.length, 154);
  const pitchAt = at => 64 + 2 * at.q + 7 * at.r;
  for (const score of api.practiceScores) {
    assert.equal(score.bars[0], 0, score.id);
    assert.ok(score.end > 0 && score.melody.length && score.chords.length, score.id);
    for (const sequence of [score.melody, score.chords]) {
      sequence.forEach((event, index) => {
        assert.ok(event.duration > 0 && event.start >= score.start - 1e-6, score.id);
        assert.ok(event.start + event.duration <= score.end + 1e-6, score.id);
        if (index) assert.ok(sequence[index-1].start + sequence[index-1].duration <= event.start + 1e-6, score.id);
      });
    }
    for (const note of score.melody) assert.equal(pitchAt(note.at), note.note, score.id);
    for (const chord of score.chords) {
      assert.equal(chord.notes.filter(note => note.root).length, 1, score.id);
      for (const note of chord.notes) assert.equal(pitchAt(note.at), note.note, score.id);
    }
    for (let shift = -6; shift <= 5; shift++) {
      for (const chord of score.chords) {
        const moved = api.transposeChord(chord, shift);
        moved.notes.forEach((note, i) => {
          assert.equal(note.note, chord.notes[i].note + shift);
          assert.equal(pitchAt(note.at), note.note);
        });
      }
    }
    const first = score.melody[0];
    const follower = api.createFollower(first.start, score.end, 1, 0, 0, score.melody);
    const accepted = api.followEntrance(follower, first.note, 0, 0, .1, false, 1);
    assert.ok(accepted.attempt.correctPitch, score.id);
    assert.equal(accepted.attempt.index, 0, score.id);
    const attempt = api.judgeEntrance(first.start, first.note, 0, 80, 0,
      {pass: 1, entryBeat: score.start, loop: false, loopStart: score.start, loopEnd: score.end, melody: score.melody});
    assert.ok(attempt.correctPitch, score.id);
    const next = api.upcomingAttacks(first.start, score.start, score.end, 3, null, 1, score.melody);
    assert.ok(next.every(attack => score.melody.includes(attack.note)), score.id);
    assert.equal(api.adjacentLoopPoint(score.start, 1, null, null, score), score.end);
    assert.equal(api.adjacentBar(score.bars[0], 1, score), score.bars[1] ?? score.end);
    assert.equal(api.scoreBeatLabel(score, score.end), 'End');
  }
  const bossa = api.practiceScores.find(score => score.id === 'openbook-blue_bossa');
  assert.equal(bossa.start, -1);
  assert.equal(bossa.end, 192); // three passes with their alternate endings
  assert.equal(bossa.melody[0].note, 67);
  assert.ok(bossa.chords.some(chord => chord.name.includes('m7♭5')));
  const five = api.practiceScores.find(score => score.id === 'openbook-take_five');
  assert.equal(five.bars[1], 5);
  assert.equal(api.adjacentBar(0, 1, five), 5);
  const slash = api.practiceScores.flatMap(score => score.chords).find(chord => chord.name.includes('/'));
  assert.ok(slash, 'Slash basses must survive the import');
  assert.notEqual(api.transposeChord(slash, 2).name.split('/')[1], slash.name.split('/')[1]);
  const old = {id: 'old', piece: 'stella-by-starlight', startedAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z', endedAt: null, settings: {bpm:80, transpose:0, freeTime:false,
      allowLowOctaveUp:true, loop:true, loopStart:null, loopEnd:null, latencyMs:0}, judgements: []};
  const legacy = {...api.emptyHistory(), sessions: [old]};
  const restored = api.parsePracticeHistory(JSON.stringify(legacy));
  assert.equal(api.mergePracticeHistories(legacy, restored).sessions.length, 1);
  assert.equal(restored.sessions[0].tonic, 10);
  const imported = {...old, id:'new', piece:bossa.id, title:bossa.title, tonic:bossa.tonic,
    settings:{...old.settings, loopStart:160, loopEnd:192}};
  assert.equal(api.parsePracticeHistory(JSON.stringify({...legacy, sessions:[imported]})).sessions[0].piece, bossa.id);
  console.log('Passed: 153 OpenBook tunes + original Stella; event bounds, lattice pitches, all keys, source repeats, slash roots, meter navigation, flute judging/following, lookahead, and history compatibility.');
})().catch(error => {console.error(error); process.exitCode = 1;});
