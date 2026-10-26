// Full-screen confetti and streamers for a cleared level. A canvas above everything, removed when the last piece has fallen.
const COLORS = ['#ff5d8f', '#ffd447', '#4ad6c3', '#7a6bff', '#ff9a3c', '#8be15f', '#ffffff'];
export function screenConfetti(duration = 4200) {
  const cv = document.createElement('canvas'), dpr = Math.min(devicePixelRatio || 1, 2);
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999';
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  document.body.append(cv);
  const g = cv.getContext('2d'), W = innerWidth, H = innerHeight, rnd = (a, b) => a + Math.random() * (b - a);
  const pieces = [];
  // Two cannons at the bottom corners fire up and inward, then everything flutters down.
  for (let i = 0; i < 150; i++) {
    const left = i % 2 === 0, streamer = i % 5 === 0;
    pieces.push({
      x: left ? W * 0.05 : W * 0.95, y: H * 0.95, vx: (left ? 1 : -1) * rnd(120, 520), vy: -rnd(520, 1150), a: rnd(0, 6.3), va: rnd(-9, 9),
      w: streamer ? rnd(5, 8) : rnd(7, 13), h: streamer ? rnd(60, 130) : rnd(10, 18), c: COLORS[i % COLORS.length], streamer, ph: rnd(0, 6.3), delay: rnd(0, 0.5), t: 0,
    });
  }
  let last = performance.now(), age = 0;
  (function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    age += dt * 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.t += dt;
      if (p.t < p.delay) continue;
      p.vy += 900 * dt;
      p.vx *= 1 - 1.4 * dt;
      p.vy *= 1 - 0.9 * dt;
      p.x += p.vx * dt + Math.sin(p.t * 5 + p.ph) * 40 * dt;
      p.y += p.vy * dt;
      p.a += p.va * dt;
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, (duration - age) / 700));
      g.fillStyle = g.strokeStyle = p.c;
      g.translate(p.x, p.y);
      if (p.streamer) {
        g.lineWidth = p.w * 0.6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(0, 0);
        for (let s = 1; s <= 8; s++) g.lineTo(Math.sin(p.t * 8 + s * 0.9 + p.ph) * 14, (s * p.h) / 8);
        g.stroke();
      } else {
        g.rotate(p.a);
        g.scale(1, Math.abs(Math.cos(p.t * 6 + p.ph)) * 0.8 + 0.2);
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      g.restore();
    }
    if (age < duration) requestAnimationFrame(frame);
    else cv.remove();
  })(last);
}
