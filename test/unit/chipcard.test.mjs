import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons, fittedPlan} from '../../src/game.js';
import {volume} from '../../src/geometry.js';
import {fractureFaces} from '../../src/chip-card.js';

test('every level breaks into ragged chips: bigger damage takes more, never more than half', () => {
  for (const l of lessons.filter((l) => l.design && !l.design.startsWith('learn'))) {
    const faces = fittedPlan(l.design, 1).faces, v = volume(faces);
    const small = fractureFaces(faces, 4, 3), big = fractureFaces(faces, 9, 3);
    assert.ok(small.chips.length >= 6, `${l.id} has ragged chips (${small.chips.length})`);
    assert.ok(volume(small.faces) < v * 0.97, `${l.id} lost visible material`);
    assert.ok(volume(big.faces) >= v * 0.5, `${l.id} keeps at least half`);
    assert.ok(volume(big.faces) <= volume(small.faces) + 1e-9, `${l.id} heavier damage removes at least as much`);
  }
});
test('the same hit always breaks the same way', () => {
  const faces = fittedPlan('heart', 1).faces;
  assert.deepEqual(fractureFaces(faces, 5, 9).faces, fractureFaces(faces, 5, 9).faces);
});
