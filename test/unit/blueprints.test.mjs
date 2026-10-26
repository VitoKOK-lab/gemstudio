import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons, materials} from '../../src/game.js';
import {plans, buildPlan} from '../../src/plans.js';
import {blueprintSVG} from '../../src/blueprints.js';
import {blueprintGrants, blueprintLevels, blueprintSource, addBlueprints} from '../../src/rewards.js';

test('level 7 grants 8 and 9, then every odd level grants the next two', () => {
  assert.deepEqual(blueprintGrants(7, lessons), [8, 9]);
  assert.deepEqual(blueprintGrants(9, lessons), [10, 11]);
  assert.deepEqual(blueprintGrants(15, lessons), [16, 17]);
  assert.deepEqual(blueprintGrants(17, lessons), []);
  for (const l of [1, 6, 8, 10]) assert.deepEqual(blueprintGrants(l, lessons), []);
});
test('every royal level can be earned, and its hint names the level that grants it', () => {
  const earned = new Set();
  for (let l = 1; l <= lessons.length; l++) for (const g of blueprintGrants(l, lessons)) {
    earned.add(g);
    assert.equal(blueprintSource(g), l);
  }
  assert.deepEqual([...earned].sort((a, b) => a - b), blueprintLevels(lessons));
});
test('adding blueprints keeps the list sorted and reports only new ones', () => {
  const owned = [9];
  assert.deepEqual(addBlueprints(owned, [8, 9]), [8]);
  assert.deepEqual(owned, [8, 9]);
});
test('each royal blueprint draws the real plan: facet count, every tier angle, no broken numbers', () => {
  for (const level of blueprintLevels(lessons)) {
    const c = lessons[level - 1], plan = buildPlan(c.design), m = materials[c.material];
    const svg = blueprintSVG({plan, level, name: plans[c.design].family, materialName: m.name, ior: m.ior, seed: level});
    assert.ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>'), `level ${level}`);
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `level ${level} has a broken number`);
    assert.ok(svg.includes(`<tspan class="bp-num">${plan.facets}</tspan>`), `level ${level} facet total`);
    for (const a of new Set(plan.sequence.filter(s => s.lap === 'cut').map(s => s.angle.toFixed(1))))
      assert.ok(svg.includes(a), `level ${level} missing angle ${a}°`);
  }
});
