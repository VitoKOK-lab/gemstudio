// Impact feedback: a hard crack and thud, a strong phone buzz, a full-screen shake,
// and a short spring of the arm off the lap (applied around the render by armBounce).
export function impactSound(ac) {
  const t = ac.currentTime, out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(ac.destination);
  const thud = ac.createOscillator(), tg = ac.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(150, t);
  thud.frequency.exponentialRampToValueAtTime(38, t + 0.28);
  tg.gain.setValueAtTime(1, t);
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  thud.connect(tg).connect(out);
  thud.start(t);
  thud.stop(t + 0.42);
  const n = Math.ceil(ac.sampleRate * 0.22), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.035)) * (Math.random() < 0.92 ? 1 : 2.5);
  const crack = ac.createBufferSource(), hp = ac.createBiquadFilter(), cg = ac.createGain();
  crack.buffer = buf;
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  cg.gain.value = 0.8;
  crack.connect(hp).connect(cg).connect(out);
  crack.start(t);
  const ring = ac.createOscillator(), rg = ac.createGain();
  ring.type = 'triangle';
  ring.frequency.value = 2650;
  rg.gain.setValueAtTime(0.12, t + 0.01);
  rg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  ring.connect(rg).connect(out);
  ring.start(t);
  ring.stop(t + 0.52);
}
export function screenShake() {
  setTimeout(() => {
    try { navigator.vibrate?.([260, 70, 380]); } catch {}
  }, 60);
  document.body.classList.remove('impact-shake');
  void document.body.offsetWidth;
  document.body.classList.add('impact-shake');
  setTimeout(() => document.body.classList.remove('impact-shake'), 560);
}
// Lift and wobble for `t` seconds after an impact; zero once it has settled (0.7 s).
export function armBounce(t) {
  if (t < 0 || t > 0.7) return {lift: 0, wobble: 0};
  const k = Math.exp(-t * 6);
  return {lift: 0.16 * k * Math.abs(Math.cos(t * 16)), wobble: 0.05 * k * Math.sin(t * 28)};
}
// Rising five-note arpeggio for a treasure reward.
export function treasureChime(ac) {
  const t = ac.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * 0.11);
    g.gain.linearRampToValueAtTime(0.16, t + i * 0.11 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 1.2);
    o.connect(g).connect(ac.destination);
    o.start(t + i * 0.11);
    o.stop(t + i * 0.11 + 1.25);
  });
}
