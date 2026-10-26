import {test} from 'node:test';
import assert from 'node:assert/strict';
import {box, clip, volume, dot, rough} from '../../src/geometry.js';
import {leverResponse, impactChip} from '../../src/lever.js';

test('a plane through the box halves it, one outside leaves it whole', () => {
  const v = volume(box());
  assert.ok(Math.abs(volume(clip(box(), [0, 1, 0], 0)) - v / 2) < 1e-9);
  assert.ok(Math.abs(volume(clip(box(), [0, 1, 0], 5)) - v) < 1e-9);
});
test('clipped faces all lie on or behind the plane', () => {
  const n = [Math.SQRT1_2, Math.SQRT1_2, 0], faces = clip(box(), n, 0.3);
  for (const p of faces.flat()) assert.ok(dot(p, n) <= 0.3 + 1e-9);
});
test('rough stones are deterministic per seed', () => {
  assert.deepEqual(rough(42), rough(42));
  assert.ok(volume(rough(42)) > 0);
});
test('lever contact rises with travel and saturates', () => {
  let last = -1;
  for (let t = 0; t <= 1.5; t += 0.1) {
    const r = leverResponse(t);
    assert.ok(r.contact >= last);
    last = r.contact;
  }
  assert.equal(leverResponse(1.5).contact, 1);
});
test('slow presses never chip, fast ones remove material', () => {
  assert.equal(impactChip(box(), [0, -1, 0], 1), null);
  const chip = impactChip(box(), [0, -1, 0], 7);
  assert.ok(chip && volume(chip.faces) < volume(box()));
});
