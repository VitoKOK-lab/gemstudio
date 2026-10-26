import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openGame, startLevel} from './helpers.mjs';

test('the game loads, renders and opens its reward screens without errors', {timeout: 120000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    // The one game loop runs its frame tasks (here: the apprentice's animation clock).
    const ticks = await page.evaluate(async () => {
      let n = 0;
      const update = __dbg.apprentice.update;
      __dbg.apprentice.update = dt => (n++, update(dt));
      await new Promise(r => setTimeout(r, 4000));
      return n;
    });
    assert.ok(ticks >= 2, `only ${ticks} frames ran`);

    await page.evaluate(() => __dbg.blueprintCollection());
    assert.equal(await page.locator('.bp-card').count(), 10);
    await page.evaluate(() => __dbg.treasureReveal([8, 9], () => document.getElementById('modal').close()));
    assert.equal(await page.locator('.bp-scroll img').count(), 2);
    await page.click('#bpTake');

    await page.evaluate(() => __dbg.chipCard());
    await page.waitForSelector('#resultViewer canvas');
    assert.ok(+(await page.getAttribute('#resultViewer', 'data-chips')) > 0, 'damaged card shows chips');
    await page.evaluate(() => document.getElementById('modal').close());
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('holding the lever on a compact level grinds facets and an impact shakes the screen', {timeout: 180000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    await startLevel(page, 3);
    const before = await page.evaluate(() => facetDebug().volume);
    await page.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms)), g = document.querySelector('canvas');
      const fire = (t, y) => g.dispatchEvent(new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: 230, clientY: y}));
      if (!__dbg.st().power) document.getElementById('power').click();
      fire('pointerdown', 400);
      for (let y = 404; y <= 500; y += 8) fire('pointermove', y), await W(20);
      await W(6000);
      fire('pointerup', 500);
    });
    const after = await page.evaluate(() => facetDebug().volume);
    assert.ok(after < before, `volume ${before} -> ${after}`);

    await page.evaluate(() => (__dbg.st().damageCount = (__dbg.st().damageCount || 0) + 1));
    await page.waitForFunction(() => document.body.classList.contains('impact-shake'), null, {timeout: 2000});
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});

test('the apprentice fetches the ladder and climbs it before the stone is flipped', {timeout: 600000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    await startLevel(page, 3);
    await page.evaluate(() => {
      if (__dbg.st().power) document.getElementById('power').click();
      document.getElementById('transfer').click();
    });
    const flip = await page.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms)), a = __dbg.apprentice, seen = {movedLadder: false, phaseWhenStarted: null};
      const park = a.ladder.position.clone(), flipBefore = __dbg.st().flip;
      for (let i = 0; i < 4000 && __dbg.st().flip === flipBefore; i++) {
        await W(100);
        if (a.ladder.position.distanceTo(park) > 0.5) seen.movedLadder = true;
        const phase = facetDebug().operator.phase;
        if (seen.phaseWhenStarted === null && phase === 'lift-stone') seen.heightWhenStarted = a.root.position.y, (seen.phaseWhenStarted = phase);
      }
      seen.flipped = __dbg.st().flip !== flipBefore;
      return seen;
    });
    assert.ok(flip.movedLadder, 'ladder was carried over');
    assert.ok(flip.heightWhenStarted > 0.5, `she was on the ladder when the stone lifted (y ${flip.heightWhenStarted})`);
    assert.ok(flip.flipped, 'stone was flipped');
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});
