import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plans, buildPlan, catalogPlanIds, specialistPlans} from '../../src/plans.js';
import {lessons, fittedPlan, grade} from '../../src/game.js';
import {faceNormal, normalKey} from '../../src/contact.js';

test('every plan builds a closed stone with a cut sequence', () => {
  for (const id of Object.keys(plans)) {
    const p = buildPlan(id);
    assert.ok(p.faces.length >= 4, id);
    assert.ok(p.volume > 0, id);
    assert.ok(p.sequence.some(s => s.lap === 'cut'), id);
    for (const s of p.sequence) assert.ok(Math.abs(Math.hypot(...s.normal) - 1) < 1e-9, `${id} ${s.stepId}`);
  }
});
test('catalog and lessons only reference real plans', () => {
  for (const id of catalogPlanIds) assert.ok(plans[id] || specialistPlans[id], id);
  for (const l of lessons) if (l.design) assert.ok(plans[l.design], l.id);
});
test('a stone cut exactly to plan and polished grades as good', () => {
  for (const l of lessons.filter(l => l.design && !l.design.startsWith('learn'))) {
    const p = fittedPlan(l.design, 1), surfaces = {};
    for (const f of p.faces) surfaces[normalKey(faceNormal(f))] = 3;
    const score = grade({design: l.design, planScale: 1, faces: p.faces, originalFaces: p.faces, surfaces, materialId: l.material});
    assert.equal(score.completed, score.total, l.id);
    assert.ok(score.good, `${l.id} quality ${score.quality}`);
  }
});
