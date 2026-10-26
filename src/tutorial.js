// First-time coaching for the easy levels: one short instruction at a time, pointing at the thing to touch.
// It only shows and points; the player does every action (power on, press, drag, release) themselves.
export function createTutorial({ root = document.body } = {}) {
  const el = document.createElement('div');
  el.id = 'tutorial';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML =
    '<i class="tut-ring"></i><i class="tut-drag"><b></b></i><div class="tut-bubble"><small></small><strong></strong><span></span></div>';
  root.append(el);
  const ring = el.querySelector('.tut-ring'), drag = el.querySelector('.tut-drag'), bubble = el.querySelector('.tut-bubble');
  const [small, strong, span] = ['small', 'strong', 'span'].map((t) => bubble.querySelector(t));
  let shownId = null;

  // Hides the pointer when the target is not on screen; returns its centre and size otherwise.
  function rectOf(target) {
    const node = typeof target === 'string' ? document.querySelector(target) : target;
    if (!node || node.hidden || !node.offsetParent) return null;
    const r = node.getBoundingClientRect();
    return r.width && r.height ? r : null;
  }
  function show(step) {
    if (!step) {
      el.hidden = true;
      shownId = null;
      return;
    }
    const r = step.target ? rectOf(step.target) : null;
    if (step.target && !r) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.dataset.step = step.id;
    if (shownId !== step.id) {
      shownId = step.id;
      bubble.classList.remove('pop');
      void bubble.offsetWidth;
      bubble.classList.add('pop');
    }
    small.textContent = step.title || '';
    strong.textContent = step.text;
    span.textContent = step.sub || '';
    span.hidden = !step.sub;
    const vw = innerWidth, vh = innerHeight;
    ring.hidden = !r;
    drag.hidden = !step.drag;
    if (r) {
      const d = Math.max(r.width, r.height) + 18, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      Object.assign(ring.style, { width: d + 'px', height: d + 'px', left: cx - d / 2 + 'px', top: cy - d / 2 + 'px' });
    }
    // The bubble sits above a target in the lower half of the screen and below one in the upper half.
    const bw = Math.min(330, vw - 32);
    bubble.style.width = bw + 'px';
    if (r) {
      const cx = r.left + r.width / 2, above = r.top + r.height / 2 > vh * 0.45;
      bubble.style.left = Math.max(16, Math.min(vw - bw - 16, cx - bw / 2)) + 'px';
      bubble.style.top = above ? 'auto' : r.bottom + 22 + 'px';
      bubble.style.bottom = above ? vh - r.top + 22 + 'px' : 'auto';
      bubble.dataset.arrow = above ? 'down' : 'up';
      bubble.style.setProperty('--arrow-x', Math.max(22, Math.min(bw - 22, cx - parseFloat(bubble.style.left))) + 'px');
    } else {
      bubble.style.left = (vw - bw) / 2 + 'px';
      bubble.style.top = '96px';
      bubble.style.bottom = 'auto';
      bubble.dataset.arrow = 'none';
    }
    if (step.drag) {
      drag.style.left = vw * 0.5 + 'px';
      drag.style.top = vh * 0.42 + 'px';
    }
  }
  // A short shake of the pointer, used when the player tries to grind before switching on.
  function nudge() {
    ring.classList.remove('shake');
    void ring.offsetWidth;
    ring.classList.add('shake');
  }
  return { show, nudge, el };
}
