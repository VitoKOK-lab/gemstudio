import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {THEMES, SLOTS, allProps, allPets} from '../../src/scenery.js';
import {lessons} from '../../src/game.js';

const file = (p) => new URL('../../src/models/kenney/' + p, import.meta.url);

test('every level has its own theme and the royal levels all look different', () => {
  assert.equal(THEMES.length, lessons.length);
  const royal = THEMES.slice(7).map((t) => t.mood.wall);
  assert.equal(new Set(royal).size, royal.length, 'royal levels have distinct wall colours');
  for (const th of THEMES) assert.ok(th.name && th.pets.length >= 2, th.name);
});
test('themes only use slots that exist, and every model file is shipped', () => {
  for (const th of THEMES) for (const slot of Object.keys(th.set)) assert.ok(SLOTS[slot], `${th.name}: slot ${slot}`);
  for (const n of allProps()) assert.ok(existsSync(file(`props/${n}.glb`)), `props/${n}.glb`);
  for (const n of allPets()) assert.ok(existsSync(file(`pets/animal-${n}.glb`)), `pets/animal-${n}.glb`);
  assert.ok(existsSync(file('props/Textures/colormap.png')) && existsSync(file('pets/Textures/colormap.png')));
});
test('every colour in a mood is a real hex colour', () => {
  for (const th of THEMES) for (const [k, v] of Object.entries(th.mood)) assert.match(v, /^#[0-9a-f]{6}$/i, `${th.name} ${k}`);
});
