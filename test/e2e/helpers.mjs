// Shared browser setup: serves src/ (or E2E_DIR, e.g. dist after a build) and opens the game with #debug hooks.
import {chromium} from 'playwright';
import {serve} from '../../scripts/serve.mjs';
import {resolve} from 'node:path';

export async function openGame({zoom = 0, viewport = {width: 456, height: 798}} = {}) {
  const server = await serve(resolve(process.env.E2E_DIR || 'src'), 0);
  const url = `http://127.0.0.1:${server.address().port}/#debug`;
  const browser = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('response', r => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.addInitScript(z => localStorage.setItem('facet-camera-v2', JSON.stringify({zoom: z, yaw: 0, pitch: 0.36})), zoom);
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.__dbg && window.facetDebug, null, {timeout: 90000});
  const close = async () => {
    await browser.close();
    server.close();
  };
  return {page, errors, close};
}

// Picks a level from the entry screen and clicks through planning until the bench is live.
export async function startLevel(page, level) {
  await page.evaluate(() => document.getElementById('entryCourses').click());
  await page.waitForTimeout(600);
  await page.evaluate(l => document.querySelectorAll('#modalContent [data-course]')[l].click(), level);
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(700);
    const started = await page.evaluate(() => {
      const shown = b => b.offsetParent !== null, buttons = [...document.querySelectorAll('button')].filter(shown);
      const go = buttons.find(b => b.textContent.trim() === '開始製作');
      if (go) return go.click(), (window.__started = true), false;
      const royal = buttons.find(b => b.textContent.includes('帶到皇室工作台'));
      if (royal) {
        if (royal.disabled) [...document.querySelectorAll('#modal button')].filter(shown).find(b => /裸石/.test(b.textContent))?.click();
        else royal.click();
        return false;
      }
      return Boolean(window.__started) && !document.getElementById('modal').open;
    });
    if (started) return;
  }
  throw new Error('level did not start');
}
