// Royal blueprint screens: the treasure reveal when new blueprints are earned, the collection grid and the zoomable viewer.
import {blueprintSVG} from './blueprints.js';
import {blueprintLevels, blueprintSource} from './rewards.js';

export function createBlueprintUI({modal, $, $$, lessons, materials, plans, buildPlan, owned, chime}) {
  const cache = new Map();
  const family = level => plans[lessons[level - 1].design].family;
  function url(level) {
    if (!cache.has(level)) {
      const c = lessons[level - 1], m = materials[c.material];
      const svg = blueprintSVG({plan: buildPlan(c.design), level, name: family(level), materialName: m.name, ior: m.ior, seed: level});
      cache.set(level, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    }
    return cache.get(level);
  }
  function reveal(levels, done) {
    modal(`<div class="bp-reward"><div class="bp-rays" aria-hidden="true"></div><div class="bp-sparks" aria-hidden="true">${Array.from({length: 18}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
  <span class="modal-eyebrow">TREASURE · 獲得寶物</span><h2>獲得 ${levels.length} 張皇室圖紙</h2>
  <div class="bp-scrolls">${levels.map((l, n) => `<button class="bp-scroll" data-bp="${l}" style="--n:${n}"><span class="bp-roll"><img src="${url(l)}" alt=""></span><i class="bp-wax" aria-hidden="true">TZG</i><b>第 ${l} 關</b><small>${family(l)}</small></button>`).join('')}</div>
  <p class="bp-reward-note">圖紙已收進「圖紙收藏」，點圖紙可以打開細看。</p><button id="bpTake" class="primary full">收下寶物</button></div>`);
    const dlg = $('#modal');
    dlg.classList.add('bp-treasure');
    dlg.addEventListener('close', () => dlg.classList.remove('bp-treasure'), {once: true});
    chime();
    try { navigator.vibrate?.([40, 60, 40, 60, 120]); } catch {}
    $$('.bp-scroll').forEach((b, n) => {
      setTimeout(() => b.classList.add('open'), 900 + n * 450);
      b.onclick = () => {
        if (!b.classList.contains('open')) return b.classList.add('open');
        dlg.classList.remove('bp-treasure');
        viewer(+b.dataset.bp, () => reveal(levels, done));
      };
    });
    $('#bpTake').onclick = () => {
      dlg.classList.remove('bp-treasure');
      done();
    };
  }
  function collection() {
    const have = owned(), all = blueprintLevels(lessons);
    modal(`<span class="modal-eyebrow">ROYAL BLUEPRINTS</span><h2>圖紙收藏 <small class="bp-count">${have.length} / ${all.length}</small></h2><div class="bp-grid">${all
      .map(l => have.includes(l)
        ? `<button class="bp-card" data-bp="${l}"><img src="${url(l)}" alt="" loading="lazy"><b>第 ${l} 關</b><small>${family(l)}</small></button>`
        : `<div class="bp-card locked"><span class="bp-lock" aria-hidden="true">🔒</span><b>第 ${l} 關</b><small>通過第 ${blueprintSource(l)} 關獲得</small></div>`)
      .join('')}</div>`);
    $$('.bp-card[data-bp]').forEach(b => (b.onclick = () => viewer(+b.dataset.bp, collection)));
  }
  function viewer(level, back) {
    const have = owned(), at = have.indexOf(level);
    modal(`<div class="bp-viewer"><div class="bp-viewer-bar"><button id="bpBack">← 返回</button><span>第 ${level} 關 · ${family(level)}</span><span class="bp-pager"><button id="bpPrev" ${at <= 0 ? 'disabled' : ''} aria-label="上一張">‹</button><button id="bpNext" ${at >= have.length - 1 ? 'disabled' : ''} aria-label="下一張">›</button></span></div>
  <div class="bp-sheet" tabindex="0"><img src="${url(level)}" alt="第 ${level} 關 ${family(level)} 圖紙"></div><p class="bp-hint">點圖紙放大，再點一次縮回</p></div>`);
    const dlg = $('#modal'), sheet = $('.bp-sheet');
    dlg.classList.add('bp-open');
    sheet.onclick = e => {
      const r = sheet.getBoundingClientRect(),
        fx = (e.clientX - r.left + sheet.scrollLeft) / sheet.scrollWidth,
        fy = (e.clientY - r.top + sheet.scrollTop) / sheet.scrollHeight;
      sheet.classList.toggle('zoomed');
      requestAnimationFrame(() => {
        sheet.scrollLeft = fx * sheet.scrollWidth - r.width / 2;
        sheet.scrollTop = fy * sheet.scrollHeight - r.height / 2;
      });
    };
    const leave = fn => () => {
      dlg.classList.remove('bp-open');
      fn();
    };
    $('#bpBack').onclick = leave(back || collection);
    $('#bpPrev').onclick = leave(() => viewer(have[at - 1], back));
    $('#bpNext').onclick = leave(() => viewer(have[at + 1], back));
    dlg.addEventListener('close', () => dlg.classList.remove('bp-open'), {once: true});
  }
  return {reveal, collection, viewer};
}
