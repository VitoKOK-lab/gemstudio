import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openGame, startLevel} from './helpers.mjs';

test('the game loads, renders and opens its reward screens without errors', {timeout: 120000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    // The one game loop runs its frame tasks (here: the apprentice's animation clock). Allow a slow first load.
    await page.evaluate(() => {
      window.__ticks = 0;
      const update = __dbg.apprentice.update;
      __dbg.apprentice.update = dt => (window.__ticks++, update(dt));
    });
    await page.waitForFunction(() => window.__ticks >= 2, null, {timeout: 60000});

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
    await page.waitForTimeout(3000);
    assert.equal(await page.evaluate(() => document.getElementById('tutorial').hidden), true, 'no tutorial after level 2');
    const before = await page.evaluate(() => facetDebug().volume);
    await page.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms)), g = document.querySelector('canvas');
      const fire = (t, y) => g.dispatchEvent(new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: 230, clientY: y}));
      if (!__dbg.st().power) document.getElementById('mobilePower').click();
      await W(400);
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

test('level 1 teaches step by step and never switches on for the player', {timeout: 240000}, async () => {
  const {page, errors, close} = await openGame({viewport: {width: 430, height: 860}});
  try {
    await startLevel(page, 0);
    await page.waitForFunction(() => document.getElementById('tutorial') && !document.getElementById('tutorial').hidden, null, {timeout: 60000});
    assert.match(await page.innerText('#tutorial .tut-bubble'), /點這裡開機/);
    // Pressing the lever while off must not start the motor: it only nudges toward the switch.
    await page.evaluate(() => {
      const g = document.querySelector('canvas'), fire = (t, y) => g.dispatchEvent(new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: 215, clientY: y}));
      fire('pointerdown', 400);
      for (let y = 410; y <= 500; y += 10) fire('pointermove', y);
      fire('pointerup', 500);
    });
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => __dbg.st().power), false, 'still off');
    await page.click('#mobilePower');
    await page.waitForFunction(() => /按住畫面往下拖/.test(document.querySelector('#tutorial .tut-bubble').innerText), null, {timeout: 30000});
    assert.equal(await page.evaluate(() => __dbg.st().power), true);
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});

// Presses the lever on level 1 (each press gets a fresh game) and returns how many chips the stone took.
async function pressOnLevelOne(step, gap, holdMs, endY = 400) {
  const {page, errors, close} = await openGame();
  try {
    await startLevel(page, 0);
    // The bench is playable once the first hint shows (the opening shot and the target card are done).
    await page.waitForFunction(() => document.getElementById('tutorial') && !document.getElementById('tutorial').hidden, null, {timeout: 90000});
    await page.click('#mobilePower');
    await page.waitForFunction(() => /按住畫面往下拖/.test(document.getElementById('tutorial').innerText), null, {timeout: 60000});
    const chips = await page.evaluate(async ([step, gap, holdMs, endY]) => {
      const W = ms => new Promise(r => setTimeout(r, ms)), g = document.querySelector('canvas');
      const fire = (t, y) => g.dispatchEvent(new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: 230, clientY: y}));
      fire('pointerdown', 300);
      for (let y = 300 + step; y <= endY; y += step) fire('pointermove', y), await W(gap);
      await W(holdMs);
      fire('pointerup', endY);
      await W(600);
      return __dbg.st().damageCount || 0;
    }, [step, gap, holdMs, endY]);
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
    return chips;
  } finally {
    await close();
  }
}
test('a gentle press does not chip the stone on an easy level', {timeout: 300000}, async () => {
  assert.equal(await pressOnLevelOne(3, 40, 800), 0);
});
test('a fast move that stops in the air does not chip: nothing has touched the lap', {timeout: 300000}, async () => {
  assert.equal(await pressOnLevelOne(20, 12, 1500, 340), 0);
});
// Headless frame pacing varies a lot, so a hard press gets up to three fresh games to land its chip.
test('a hard press chips the stone on an easy level', {timeout: 600000}, async () => {
  let chips = 0;
  for (let i = 0; i < 3 && !chips; i++) chips = await pressOnLevelOne(30, 12, 1500);
  assert.ok(chips >= 1);
});

test('the power and pull-down hints still show on a level the player has already cleared', {timeout: 240000}, async () => {
  const {page, errors, close} = await openGame({viewport: {width: 430, height: 860}, beforeLoad: () => localStorage.setItem('facet-profile', JSON.stringify({completed: ['first', 'ring'], exams: {}, certificates: [], history: []}))});
  try {
    await startLevel(page, 0);
    await page.waitForFunction(() => /點這裡開機/.test(document.getElementById('tutorial').innerText), null, {timeout: 60000});
    await page.click('#mobilePower');
    await page.waitForFunction(() => /按住畫面往下拖/.test(document.getElementById('tutorial').innerText), null, {timeout: 30000});
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});

test('each level gets its own scene: new colours, furniture and wandering animals', {timeout: 300000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    await startLevel(page, 4);
    await page.waitForFunction(() => __dbg.scenery.index === 4 && __dbg.scenery.pets >= 2, null, {timeout: 90000});
    assert.equal(await page.evaluate(() => __dbg.scenery.name), '海岸廚房');
    const before = await page.evaluate(() => __dbg.scenery.positions);
    await page.waitForTimeout(12000);
    const after = await page.evaluate(() => __dbg.scenery.positions);
    assert.ok(before.some((p, i) => Math.hypot(p[0] - after[i][0], p[1] - after[i][1]) > 0.05), 'the animals walk around');
    assert.ok(await page.evaluate(() => __dbg.scene.getObjectByName('scenery').children.length >= 6), 'furniture and food are placed');
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});

test('royal levels need their blueprint: locked in the list, refused to start, open once the blueprint is earned', {timeout: 300000}, async () => {
  const {page, errors, close} = await openGame();
  try {
    await page.evaluate(() => document.getElementById('entryCourses').click());
    await page.waitForSelector('[data-course]');
    const locked = await page.evaluate(() => [...document.querySelectorAll('[data-course]')].map((b, i) => [i, b.classList.contains('locked')]).filter(([, l]) => l).map(([i]) => i));
    assert.deepEqual(locked, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 'levels 8-17 are locked, 1-7 are open');
    assert.match(await page.innerText('[data-course="7"]'), /通過第 7 關/);
    await page.evaluate(() => { document.getElementById('modal').close(); __dbg.startCourse(7); });
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => document.getElementById('modal').open), false, 'a locked level does not start');
    assert.match(await page.innerText('#toast'), /圖紙/);
    await page.evaluate(() => { __dbg.grantBlueprints([8]); __dbg.startCourse(7); });
    await page.waitForFunction(() => document.getElementById('modal').open, null, {timeout: 30000});
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});
