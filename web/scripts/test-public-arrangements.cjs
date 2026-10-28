const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const fs = require('node:fs');
(async () => {
  // Deliberately omit the development overlay: this is what a clean public
  // checkout and production build can import without any private data.
  const result = await esbuild.build({stdin: {contents: `
    export * from './src/lumatone/practice/scores.ts';
    export * from './src/lumatone/leadSheet/stella.ts';
    export * from './src/lumatone/exercises/exerciseScores.ts';
    export {default as sWonderful} from './src/lumatone/chordCharts/sWonderful.ts';
    export {default as thisWillBeOurYear} from './src/lumatone/chordCharts/thisWillBeOurYear.ts';
    export {default as stellaByStarlight} from './src/lumatone/chordCharts/stellaByStarlight.ts';
  `, resolveDir: process.cwd(), loader: 'ts'}, bundle: true, write: false, platform: 'node', format: 'cjs',
    define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
  const mod = {exports: {}};
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const api = mod.exports;
  assert.deepEqual(api.practiceScores.map(score => score.id), ['stella-by-starlight']);
  assert.ok(api.stellaMelody.length > 60);
  assert.ok(api.stellaChords.length >= 32);
  assert.equal(api.stellaScore.melody, api.stellaMelody);
  for (const chart of [api.sWonderful, api.thisWillBeOurYear, api.stellaByStarlight]) assert.ok(chart(57).length);
  assert.equal(api.exerciseScores.length, 9);
  assert.equal(api.exerciseScores.flatMap(score => score.sections.flatMap(section => section.events)).length, 539);
  for (const score of api.exerciseScores) {
    assert.equal(fs.readFileSync('public/lumatone-exercises/' + score.source).subarray(0, 5).toString(), '%PDF-');
  }
  assert.ok(fs.readFileSync('src/lumatone/exercises/ExerciseTranscriptions.tsx', 'utf8').includes('Exercises by Dustin Getz'));
  assert.ok(fs.readFileSync('src/UkeChords.tsx', 'utf8').includes('<UkeChord'));
  assert.deepEqual(JSON.parse(fs.readFileSync('src/lumatone/practice/catalog.index.json', 'utf8')), []);
  assert.ok(!fs.existsSync('public/practice/scores') || !fs.readdirSync('public/practice/scores').length);
  assert.equal(fs.readdirSync('public/lumatone-exercises').filter(file => file.endsWith('.pdf')).length, 9);
  console.log('Public arrangements and Stella practice available; credited Dustin Getz exercises available; imported catalogs excluded.');
})().catch(error => {console.error(error); process.exitCode = 1;});
