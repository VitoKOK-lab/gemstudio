import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';

const src = readFileSync(new URL('../../src/wall-cd.js', import.meta.url), 'utf8');
const files = [...src.matchAll(/file:'([^']+)'/g)].map((m) => m[1]);

test('the player lists three tracks and every file exists', () => {
  assert.equal(files.length, 3);
  for (const f of files) assert.ok(existsSync(new URL('../../src/music/' + f, import.meta.url)), f);
});
test('no unused audio files are shipped', () => {
  const onDisk = readdirSync(new URL('../../src/music/', import.meta.url)).filter((f) => f.endsWith('.mp3'));
  assert.deepEqual(onDisk.sort(), [...files].sort());
});
test('every track credits its author and license', () => {
  const credits = readFileSync(new URL('../../src/music/CREDITS.txt', import.meta.url), 'utf8');
  assert.match(credits, /Kevin MacLeod/);
  assert.match(credits, /Attribution 4\.0/);
  assert.equal([...src.matchAll(/license:'CC BY 4\.0'/g)].length, 3);
});
