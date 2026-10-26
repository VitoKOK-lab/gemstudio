// Full level-1 playthrough (about 4 minutes in software WebGL), so it only runs with FULL=1.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openGame, startLevel} from './helpers.mjs';

test('level 1 can be played to the end and offers level 2', {skip: !process.env.FULL, timeout: 600000}, async () => {
  const {page, errors, close} = await openGame({zoom: 1});
  try {
    await startLevel(page, 0);
    const trace = await page.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms)), g = document.querySelector('canvas'), c = document.getElementById('coachAction');
      const fire = (t, y) => g.dispatchEvent(new PointerEvent(t, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: 230, clientY: y}));
      let holding = false, holdStart = 0, last = '';
      window.__trace = [];
      for (let i = 0; i < 2500; i++) {
        await W(200);
        const d = facetDebug(), s = d.state, stage = c.dataset.stage, text = c.textContent;
        const key = [s.step, stage, text, c.hidden, c.disabled, s.flip, s.lap, d.operator.phase, s.batchDone, s.inspecting, holding, s.damageCount || 0].join('|');
        if (key !== last) window.__trace.push(Math.round(i / 5) + 's ' + (last = key));
        if (document.getElementById('modal').open) {
          await W(1500);
          return document.getElementById('modalContent').textContent;
        }
        if (holding) {
          if (s.batchDone || i - holdStart > 150) fire('pointerup', 500), (holding = false);
          continue;
        }
        if (d.operator.busy) continue;
        if (!s.power) {
          document.getElementById('mobilePower').click();
          continue;
        }
        if (!c.hidden && !c.disabled && text && stage !== '輕鬆研磨') {
          c.click();
          continue;
        }
        if (!c.hidden && stage !== '輕鬆研磨') continue;
        fire('pointerdown', 400);
        for (let y = 404; y <= 500; y += 8) fire('pointermove', y), await W(20);
        holding = true;
        holdStart = i;
      }
      return 'timed out\n' + window.__trace.slice(-25).join('\n');
    });
    await page.screenshot({path: 'test-results/level1-end.png'});
    assert.match(trace, /開始第 2 關/);
    await page.evaluate(() => document.getElementById('modal').close());
    await page.waitForTimeout(500);
    assert.match(await page.innerText('#nextCourseCue'), /開始第 2 關/);
    assert.deepEqual(errors.filter(e => !/AudioContext/.test(e)), []);
  } finally {
    await close();
  }
});
