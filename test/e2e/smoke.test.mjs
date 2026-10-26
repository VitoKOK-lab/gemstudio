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
    await page.waitForFunction(() => document.body.classList.contains('impact-shake'), null, {timeout: 30000});
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});

test('the pusher swings the stick down, throws a spark and flips the stone; nobody walks through anything', {timeout: 600000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    await startLevel(page, 3);
    await page.evaluate(() => {
      if (__dbg.st().power) document.getElementById('power').click();
      document.getElementById('transfer').click();
    });
    const flip = await page.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms)), seen = {thrownBeforeLift: null, stoneLowAtLift: null};
      const flipBefore = __dbg.st().flip, up = new __dbg.THREE.Vector3();
      for (let i = 0; i < 4000 && __dbg.st().flip === flipBefore; i++) {
        await W(100);
        if (seen.thrownBeforeLift === null && facetDebug().operator.phase === 'lift-stone')
          (seen.thrownBeforeLift = __dbg.pusher.stats.thrown), (seen.stoneLowAtLift = __dbg.gem.getWorldPosition(up).y);
      }
      seen.flipped = __dbg.st().flip !== flipBefore;
      seen.trespass = __dbg.apprentice.stats.trespass + __dbg.pusher.stats.trespass;
      seen.last = [__dbg.apprentice.stats.lastTrespass, __dbg.pusher.stats.lastTrespass];
      return seen;
    });
    assert.ok(flip.thrownBeforeLift >= 1, 'a spark was thrown before the stone moved');
    assert.ok(flip.stoneLowAtLift < 1.3, `the stick came down to her (stone y ${flip.stoneLowAtLift})`);
    assert.ok(flip.flipped, 'stone was flipped');
    assert.equal(flip.trespass, 0, `they stayed on free floor ${JSON.stringify(flip.last)}`);
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});

test('clearing a level makes both apprentices dance and throw confetti', {timeout: 120000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    await page.waitForFunction(() => __dbg.apprentice.ready && __dbg.pusher.ready, null, {timeout: 60000});
    await page.evaluate(() => __dbg.celebrate());
    await page.waitForSelector('canvas[style*="99999"]', {timeout: 20000});
    const during = await page.evaluate(() => ({dial: __dbg.apprentice.job, push: __dbg.pusher.job, bits: __dbg.apprentice.stats.bits + __dbg.pusher.stats.bits}));
    assert.deepEqual([during.dial, during.push], ['dance', 'dance']);
    assert.ok(during.bits > 0, 'confetti pieces in the air');
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});
