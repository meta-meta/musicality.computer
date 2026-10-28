const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const {createServer, resolveConfig} = await import('vite');
  const build = await resolveConfig({}, 'build');
  assert.ok(!build.plugins.some(plugin => plugin.name === 'private-arrangements'));
  const server = await createServer({server: {host: '127.0.0.1', port: 5189, strictPort: true}, logLevel: 'error'});
  try {
    await server.listen();
    const index = JSON.parse(fs.readFileSync('../arrangements.local/web/src/lumatone/practice/catalog.index.json', 'utf8'));
    assert.ok(index.length > 6000);
    const json = await server.transformRequest('/src/lumatone/practice/catalog.index.json');
    assert.ok(json.code.includes(index[0].id));
    const melody = await server.transformRequest('/src/lumatone/leadSheet/stella.ts');
    assert.ok(melody.code.includes('chordNames'));
    assert.ok(!melody.code.includes('private-arrangement:'), 'Public melody must not use the private overlay');
    const uke = await server.transformRequest('/src/UkeChords.tsx');
    assert.ok(uke.code.includes('UkeChord'));
    assert.ok(!uke.code.includes('private-arrangement:'), 'Public ukulele charts must not use the private overlay');
    const response = await fetch('http://127.0.0.1:5189/practice/scores/' + index[0].file);
    assert.ok(response.ok);
    assert.equal((await response.json()).id, index[0].id);
    const pdf = await fetch('http://127.0.0.1:5189/lumatone-exercises/2-5-1-6-in-C.pdf');
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    assert.deepEqual(JSON.parse(fs.readFileSync('src/lumatone/practice/catalog.index.json', 'utf8')), []);
    const exercises = await server.transformRequest('/src/lumatone/exercises/scores.json');
    assert.ok(!exercises.code.includes('private-arrangement:'), 'Exercises must use the public source');
    assert.equal(JSON.parse(fs.readFileSync('src/lumatone/exercises/scores.json', 'utf8')).length, 9);
    assert.ok(!fs.existsSync('public/practice/scores') || fs.readdirSync('public/practice/scores').length === 0);
    console.log('Private development data loading and production exclusion pass.');
  } finally { await server.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
