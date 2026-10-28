const assert = require('node:assert/strict');
const esbuild = require('esbuild');

(async () => {
  const result = await esbuild.build({stdin: {contents: `
    export * from './src/lumatone/practice/scores.ts';
    export * from './src/lumatone/practice/lyrics.ts';
    export * from './src/lumatone/practice/exercise.ts';
    export * from './src/lumatone/practice/fluteFollower.ts';
    export * from './src/lumatone/practice/lookahead.ts';
    export * from './src/lumatone/practice/navigation.ts';
    export * from './src/lumatone/practice/transposition.ts';
    export * from './src/lumatone/practice/practiceHistory.ts';
  `, resolveDir: process.cwd(), loader: 'ts'}, bundle: true, write: false, format: 'cjs', platform: 'node', define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
  const mod = {exports: {}};
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const api = mod.exports;
  const fs = require('node:fs');
  const index = api.practiceScores;
  const scores = index.map(entry => entry.id === 'stella-by-starlight' ? api.stellaScore
    : JSON.parse(fs.readFileSync('public/practice/scores/' + entry.file, 'utf8')));
  assert.equal(new Set(index.map(entry => entry.id)).size, index.length);
  for (const entry of index.filter(entry => entry.file)) {
    assert.ok(!('melody' in entry) && !('chords' in entry));
    const score = scores.find(score => score.id === entry.id);
    assert.equal(entry.melodyOnly, !score.chords.length);
  }

  assert.equal(scores.filter(score => score.collection === 'OpenBook').length, 153);
  assert.equal(scores.filter(score => score.collection === 'Effendi').length, 471);
  assert.equal(scores.filter(score => score.collection === 'Effendi' && !score.chords.length).length, 39);
  const pitchAt = at => 64 + 2 * at.q + 7 * at.r;
  for (const score of scores) {
    assert.equal(score.bars[0], 0, score.id);
    assert.ok(score.end > 0 && score.melody.length, score.id);
    if (!score.chords.length) assert.ok(['Effendi', 'Wikifonia'].includes(score.collection), score.id);
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
    for (const lyric of score.lyrics ?? []) {
      assert.ok(lyric.text.trim() && lyric.verse, score.id);
      assert.ok(lyric.duration > 0 && lyric.start >= score.start - 1e-6, score.id);
      assert.ok(lyric.start + lyric.duration <= score.end + 1e-6, score.id);
    }
    for (const verse of new Set((score.lyrics ?? []).map(item => item.verse))) {
      const lyrics = score.lyrics.filter(item => item.verse === verse);
      lyrics.forEach((lyric, i) => {
        if (i) assert.ok(lyrics[i-1].start + lyrics[i-1].duration <= lyric.start + 1e-6, score.id);
      });
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
  const bossa = scores.find(score => score.id === 'openbook-blue_bossa');
  assert.equal(bossa.start, -1);
  assert.equal(bossa.end, 192); // three passes with their alternate endings
  assert.equal(bossa.melody[0].note, 67);
  assert.ok(bossa.chords.some(chord => chord.name.includes('m7♭5')));
  const five = scores.find(score => score.id === 'openbook-take_five');
  assert.equal(five.bars[1], 5);
  assert.equal(api.adjacentBar(0, 1, five), 5);
  const slash = scores.flatMap(score => score.chords).find(chord => chord.name.includes('/'));
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
  const effendi = scores.find(score => score.collection === 'Effendi');
  const effendiSession = {...old, id:'effendi', piece:effendi.id, title:effendi.title, tonic:effendi.tonic};
  assert.equal(api.parsePracticeHistory(JSON.stringify({...legacy,sessions:[effendiSession]})).sessions[0].piece,effendi.id);
  const lyricFixture = [
    {verse:'1',text:'Hel',start:-1,duration:1,syllabic:'begin'},
    {verse:'1',text:'lo',start:0,duration:2,syllabic:'end',lineBreak:true},
    {verse:'1',text:'again',start:4,duration:1,syllabic:'single'},
    {verse:'2',text:'Other',start:0,duration:1,syllabic:'single'}];
  const lines = api.lyricLines(lyricFixture,'1');
  assert.deepEqual(lines.map(line => line.map(item => item.text)),[['Hel','lo'],['again']]);
  assert.equal(api.lyricLineAt(lines,-4),0);
  assert.equal(api.lyricLineAt(lines,4),1);
  assert.equal(api.lyricLineAt(lines,-1),0);
  assert.ok(api.lyricActive(lyricFixture[1],1.9));
  assert.ok(!api.lyricActive(lyricFixture[1],2));
  assert.equal(api.lyricLines(lyricFixture,'2').length,1);
  assert.deepEqual(api.lyricRows(0,4),[0,1]);
  assert.deepEqual(api.lyricRows(1,4),[2,1]);
  assert.deepEqual(api.lyricRows(2,4),[2,3]);
  assert.deepEqual(api.lyricRows(3,4),[null,3]);
  assert.deepEqual(api.lyricRows(3,4,0),[0,3]);
  assert.deepEqual(api.lyricRows(0,1,0),[0,0]);
  const lyricCues = api.upcomingEvents(-2,-1,6,3,null,1,lyricFixture.filter(item => item.verse==='1'));
  assert.deepEqual(lyricCues.map(cue => [cue.event.text,cue.ordinal,cue.beatsAway]),[['Hel',1,1],['lo',2,2],['again',3,6]]);
  const wrappedLyrics = api.upcomingEvents(4.5,-1,5,2,{start:-1,end:5},1,lyricFixture.filter(item => item.verse==='1'));
  assert.equal(wrappedLyrics[0].id,'2:-1');
  assert.equal(wrappedLyrics[0].beatsAway,.5);
  assert.equal(api.upcomingEvents(0,-1,6,0,null,1,lyricFixture).length,0);
  assert.deepEqual(api.upcomingCueStyle(0,true),{color:'#111',opacity:1});
  assert.deepEqual(api.upcomingCueStyle(1,false),{color:'#93c5fd',opacity:.3});
  assert.deepEqual(api.upcomingCueStyle(2,true),{color:'#dc2626',opacity:.15});
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async (url, options) => {
    requests++;
    assert.ok(url.startsWith('/practice/scores/'));
    assert.ok(options.signal instanceof AbortSignal);
    return {ok: true, json: async () => JSON.parse(fs.readFileSync('public' + url, 'utf8'))};
  };
  try {
    assert.equal((await api.loadPracticeScore(index[0])).id, 'stella-by-starlight');
    assert.equal(requests, 0);
    const controller = new AbortController();
    const entries = index.filter(entry => entry.file).slice(0, 10);
    await api.loadPracticeScore(entries[0], controller.signal);
    await api.loadPracticeScore(entries[0], controller.signal);
    assert.equal(requests, 1, 'Repeated selection should use the cache');
    for (const entry of entries.slice(1)) await api.loadPracticeScore(entry, controller.signal);
    await api.loadPracticeScore(entries[0], controller.signal);
    assert.equal(requests, 11, 'The cache should evict older tunes');
    global.fetch = async () => ({ok:false, status:503});
    const uncached = index.filter(entry => entry.file)[11];
    await assert.rejects(api.loadPracticeScore(uncached), /503/);
    global.fetch = async () => ({ok:true,json:async () => ({id:'wrong'})});
    await assert.rejects(api.loadPracticeScore(uncached), /Invalid tune/);
    const wiki = scores.find(score => score.collection === 'Wikifonia');
    assert.ok(wiki);
    assert.equal(api.parsePracticeHistory(JSON.stringify({...legacy,sessions:[{...old,id:'wiki',piece:wiki.id,title:wiki.title,tonic:wiki.tonic}]})).sessions[0].piece,wiki.id);
  } finally {global.fetch = originalFetch;}
  console.log(`Passed: ${scores.length} scores; timing, lattice pitches, all keys, repeats, navigation, judging, history, on-demand loading and cache eviction.`);
})().catch(error => {console.error(error); process.exitCode = 1;});
