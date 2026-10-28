import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scores = JSON.parse(readFileSync(new URL('../src/lumatone/exercises/scores.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(scores.map(score => [score.id, score]));
const events = id => byId[id].sections.flatMap(section => section.events);

assert.equal(scores.length, 9);
assert.equal(scores.reduce((sum, score) => sum + score.sections.length, 0), 61);
assert.equal(scores.flatMap(score => events(score.id)).length, 539);
for (const score of scores) {
  const bars = new Map();
  for (const event of events(score.id)) {
    assert.ok(event.name && Number.isInteger(event.page) && event.page > 0);
    assert.ok(event.notes.length >= 3 && event.notes.every(note => Number.isInteger(note) && note >= 0 && note <= 127));
    assert.deepEqual([...event.notes].sort((a, b) => a - b), event.notes);
    assert.equal(new Set(event.notes).size, event.notes.length);
    const previous = bars.get(event.bar) ?? 0;
    assert.equal(event.beat, previous + 1, `${score.id}, bar ${event.bar}: gap or overlap`);
    bars.set(event.bar, previous + event.duration);
  }
  for (const [bar, duration] of bars) assert.equal(duration, 4, `${score.id}, bar ${bar}`);
}

// The scores explicitly define "open" as raising the second-lowest written
// note by an octave. This checks every paired example, including rootless ones.
const pairs = {
  '2-5-1-6-voicings-in-C': [[1, 9, 8], [17, 25, 8]],
  'A-2-5-1-6-colours': [1, 9, 17, 25, 33, 41].map(start => [start, start + 4, 4]),
  'B-line-cliches': [[1, 9, 8], [17, 25, 8], [33, 41, 8]],
  'C-moving-shapes': [[1, 9, 8], [17, 21, 4], [25, 33, 8]],
  'D-pedals-and-slides': [[1, 9, 8], [17, 25, 8]],
  'E-finishing-touches': [[1, 9, 8], [41, 49, 8]],
  'F-modes': [[85, 93, 8]],
};
for (const [id, groups] of Object.entries(pairs)) {
  for (const [closed, open, length] of groups) {
    const all = events(id);
    const a = all.filter(event => event.bar >= closed && event.bar < closed + length);
    const b = all.filter(event => event.bar >= open && event.bar < open + length);
    assert.equal(a.length, b.length);
    a.forEach((event, index) => {
      const notes = [...event.notes]; notes[1] += 12; notes.sort((x, y) => x - y);
      assert.deepEqual(b[index].notes, notes, `${id}: open voicing at bar ${b[index].bar}`);
      assert.equal(b[index].duration, event.duration);
    });
  }
}

const twelveKeys = events('2-5-1-6-vibes-12-keys');
[0, 10, 8, 6, 4, 2, 1, 11, 9, 7, 5, 3].forEach((transpose, key) => {
  for (let bar = 0; bar < 8; bar++) {
    const expected = twelveKeys[bar].notes.map(note => (note + transpose) % 12).sort((a, b) => a - b);
    const actual = twelveKeys[key * 8 + bar].notes.map(note => note % 12).sort((a, b) => a - b);
    assert.deepEqual(actual, expected, `Twelve-key set: bar ${key * 8 + bar + 1}`);
  }
});
console.log('539 attacks checked: complete measures, open/closed octave relationships, and twelve-key transpositions.');
